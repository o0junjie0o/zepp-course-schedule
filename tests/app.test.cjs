const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')
const plain = value => JSON.parse(JSON.stringify(value))
const course = { name: '示例课程', startTime: '08:00', endTime: '09:00', location: '', teacher: '' }
const today = String(new Date().getDay())

// 仅模拟平台边界，应用逻辑直接加载项目中的实际模块。
async function load(entry, options = {}) {
  const files = new Map(Object.entries(options.files || {}))
  const settings = new Map(Object.entries(options.settings || {}))
  const widgets = []
  const toasts = []
  let registered
  const context = vm.createContext({
    console: { log() {} },
    App: value => { registered = value },
    Page: value => { registered = value },
    AppSideService: value => { registered = value },
    AppSettingsPage: value => { registered = value },
    ...Object.fromEntries(['View', 'Text', 'Button', 'TextInput'].map(type => [type,
      (props, children) => ({ type, props, children })]))
  })
  const settingsStorage = {
    getItem: key => settings.get(key),
    setItem: (key, value) => {
      settings.set(key, value)
      options.onSettingWrite?.(key, value)
    }
  }
  const constants = new Proxy({}, { get: (_, key) => key })
  const mocks = {
    '@zos/fs': {
      statSync: ({ path }) => {
        if (options.statError) throw new Error('File unavailable')
        return files.has(path) ? { size: files.get(path).length } : null
      },
      readFileSync: ({ path }) => files.get(path),
      writeFileSync: ({ path, data }) => files.set(path, data)
    },
    '@zos/device': { getDeviceInfo: () => ({ width: 480, height: 480 }) },
    '@zos/utils': { px: value => value },
    '@zos/ui': {
      widget: constants, prop: constants, align: constants, text_style: constants,
      createWidget: (type, props) => {
        const widget = { type, props: { ...props }, visible: true,
          setProperty(key, value) {
            if (key === 'VISIBLE') this.visible = value
            else if (key === 'UPDATE_DATA') Object.assign(this.props, value)
            else this.props[key] = value
          }
        }
        widgets.push(widget)
        return widget
      },
      showToast: value => toasts.push(value.text)
    },
    '@zeppos/zml/base-app': { BaseApp: value => value },
    '@zeppos/zml/base-page': { BasePage: value => value },
    '@zeppos/zml/base-side': { BaseSideService: value => value,
      settingsLib: { getItem: settingsStorage.getItem } }
  }
  const cache = new Map()
  async function moduleFor(filename) {
    if (cache.has(filename)) return cache.get(filename)
    if (mocks[filename]) {
      const mock = mocks[filename]
      const module = new vm.SyntheticModule(Object.keys(mock), function () {
        for (const [name, value] of Object.entries(mock)) this.setExport(name, value)
      }, { context, identifier: filename })
      cache.set(filename, module)
      return module
    }
    const module = new vm.SourceTextModule(fs.readFileSync(filename, 'utf8'), { context, identifier: filename })
    cache.set(filename, module)
    return module
  }
  const module = await moduleFor(path.join(root, entry))
  await module.link((specifier, parent) => moduleFor(specifier.startsWith('.')
    ? path.resolve(path.dirname(parent.identifier), specifier.endsWith('.js') ? specifier : `${specifier}.js`)
    : specifier))
  await module.evaluate()
  return { app: registered, exports: module.namespace, settingsStorage, files, settings, widgets, toasts }
}

test('课程结构校验支持完整周、空课表及省略字段，拒绝无效 JSON 结构和时间', async () => {
  const { exports: { isCourseData } } = await load('utils/course-data.js')
  for (const valid of [{}, { 0: [], 1: [course] }, { 6: [{}] }]) assert.equal(isCourseData(valid), true)
  for (const invalid of [null, [], 'text', { 7: [] }, { 1: {} }, { 1: [null] },
    { 1: [{ name: 42 }] }, { 1: [{ startTime: '24:00' }] }, { 1: [{ endTime: '09:60' }] },
    JSON.parse('{"__proto__":[]}')]) assert.equal(isCourseData(invalid), false)
})

test('首次启动、损坏文件及不可读缓存均不会使应用崩溃', async () => {
  for (const options of [{}, { statError: true }, { files: { 'data.txt': '{' } },
    { files: { 'data.txt': 'null' } }, { files: { 'data.txt': '[]' } }]) {
    const { exports: { default: Storage } } = await load('utils/storage.js', options)
    assert.deepEqual(plain(new Storage('data.txt').get()), {})
  }
})

test('缓存保存可读回，文件删除后不会复用旧的内存内容', async () => {
  const { exports: { default: Storage }, files } = await load('utils/storage.js')
  const storage = new Storage('data.txt')
  storage.set({ courseData: { 1: [course] } })
  assert.deepEqual(plain(storage.get()), { courseData: { 1: [course] } })
  files.delete('data.txt')
  assert.deepEqual(plain(storage.get()), {})
})

test('手机请求读取真实 settingsStorage，格式错误返回错误而非清空手表', async () => {
  const { app, settings } = await load('app-side/index.js', { settings: { courseData: JSON.stringify({ 1: [course] }) } })
  let response
  app.onRequest({ method: 'GET_COURSES' }, (...args) => { response = args })
  assert.equal(response[0], null)
  assert.deepEqual(plain(response[1].result), { 1: [course] })
  settings.set('courseData', 'null')
  app.onRequest({ method: 'GET_COURSES' }, (...args) => { response = args })
  assert.ok(response[0].message)
  assert.equal(response[1], undefined)
})

test('设置变更推送、清空和断连错误均被正确处理', async () => {
  const { app } = await load('app-side/index.js')
  const pushed = []
  app.call = async value => pushed.push(plain(value.result))
  await app.onSettingsChange({ key: 'ui:selectedDay', newValue: '2' })
  await app.onSettingsChange({ key: 'courseData', newValue: JSON.stringify({ 1: [course] }) })
  await app.onSettingsChange({ key: 'courseData', newValue: null })
  await app.onSettingsChange({ key: 'courseData', newValue: 'null' })
  assert.deepEqual(pushed, [{ 1: [course] }, {}])
  app.call = () => Promise.reject(new Error('Disconnected'))
  await assert.doesNotReject(app.onSettingsChange({ key: 'courseData', newValue: '{}' }))
})

test('空课表同步后创建列表，清空再同步后恢复可见，课程按时间排序', async () => {
  const { app, files } = await load('page/gt/home/index.page.js')
  app.build()
  assert.ok(app.state.emptyText.visible)
  const data = { [today]: [{ ...course, startTime: '10:00' }, course] }
  assert.equal(app.applyCourseData(data), true)
  const list = app.state.scrollList
  assert.ok(list)
  assert.equal(list.props.data_array[0].time, '08:00-09:00')
  assert.equal(list.props.data_type_config[0].end, 1)
  assert.equal(data[today][0].startTime, '10:00')
  app.applyCourseData({})
  assert.equal(list.visible, false)
  app.applyCourseData({ [today]: [course] })
  assert.equal(list.visible, true)
  assert.equal(list.props.data_type_config[0].end, 0)
  assert.equal(app.state.emptyText.visible, false)
  assert.deepEqual(JSON.parse(files.get('course_data.txt')).courseData, { [today]: [course] })
})

test('UI 构建前收到数据不会提前创建组件，页面销毁后不再更新或写入缓存', async () => {
  const { app, widgets, files } = await load('page/gt/home/index.page.js')
  app.applyCourseData({ [today]: [course] })
  assert.equal(widgets.length, 0)
  app.build()
  assert.ok(app.state.scrollList)
  app.onDestroy()
  const saved = files.get('course_data.txt')
  assert.equal(app.applyCourseData({}), false)
  assert.equal(files.get('course_data.txt'), saved)
})

test('无效同步数据不会覆盖有效本地缓存，离线启动仍显示缓存课表', async () => {
  const data = { [today]: [course] }
  const { app, files } = await load('page/gt/home/index.page.js', {
    files: { 'course_data.txt': JSON.stringify({ courseData: data }) }
  })
  app.request = () => Promise.reject(new Error('Offline'))
  app.onInit()
  app.build()
  assert.equal(app.state.scrollList.props.data_count, 1)
  assert.equal(app.applyCourseData({ [today]: null }), false)
  assert.deepEqual(JSON.parse(files.get('course_data.txt')).courseData, data)
  await new Promise(resolve => setImmediate(resolve))
})

test('应用退出不会用启动时的旧数据覆盖页面刚保存的课表', async () => {
  const { app, files } = await load('app.js', { files: { 'course_data.txt': '{"courseData":{}}' } })
  app.onCreate()
  files.set('course_data.txt', JSON.stringify({ courseData: { 1: [course] } }))
  app.onDestroy()
  assert.deepEqual(JSON.parse(files.get('course_data.txt')).courseData, { 1: [course] })
})

function flatten(node) {
  if (!node) return []
  return [node, ...(Array.isArray(node.children) ? node.children : [node.children]).flatMap(flatten)]
}

test('设置页切换星期写入响应式存储，增删改课程均持久化', async () => {
  const { app, settings, settingsStorage } = await load('setting/index.js')
  const tree = app.build({ settingsStorage })
  flatten(tree).find(node => node.type === 'Button' && node.props.label === '周二').props.onClick()
  assert.equal(settings.get('ui:selectedDay'), '2')
  app.build({ settingsStorage })
  assert.equal(app.state.selectedDay, '2')
  app.addCourse('2')
  app.updateCourse('2', 0, 'name', '示例课程')
  assert.equal(JSON.parse(settings.get('courseData'))['2'][0].name, '示例课程')
  app.deleteCourse('2', 0)
  assert.deepEqual(JSON.parse(settings.get('courseData')), {})
})

test('批量导入拒绝无效结构且保留原课表；成功导入与清空沿用原数据格式', async () => {
  const original = JSON.stringify({ 1: [course] })
  const { app, settings, settingsStorage } = await load('setting/index.js', { settings: { courseData: original } })
  app.build({ settingsStorage })
  for (const invalid of ['{', 'null', '[]', '{"1":{}}', '{"1":[{"startTime":"25:00"}]}']) {
    assert.equal(app.importCourses(invalid), false)
    assert.equal(settings.get('courseData'), original)
  }
  assert.equal(app.importCourses(JSON.stringify({ 0: [course] })), true)
  assert.deepEqual(JSON.parse(settings.get('courseData')), { 0: [course] })
  const tree = app.build({ settingsStorage })
  flatten(tree).find(node => node.type === 'Button' && node.props.label.includes('清空所有')).props.onClick()
  assert.deepEqual(JSON.parse(settings.get('courseData')), {})
})
