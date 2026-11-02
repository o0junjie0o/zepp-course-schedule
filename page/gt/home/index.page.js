import * as hmUI from '@zos/ui'
import { getDeviceInfo } from '@zos/device'
import { px } from '@zos/utils'
import { BasePage } from '@zeppos/zml/base-page'
import LocalStorage from '../../../utils/storage'
import { isCourseData } from '../../../utils/course-data'

const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo()
const storage = new LocalStorage('course_data.txt')

// 星期映射
const WEEKDAY_MAP = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// 获取今天是星期几 (0=周日, 1=周一 ...)
function getTodayWeekday() {
  return new Date().getDay()
}

// 获取今天日期字符串
function getTodayDateStr() {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

// 解析课程数据，获取今天课程
function getTodayCourses(courseData) {
  const weekday = getTodayWeekday()
  const dayKey = String(weekday)
  if (courseData && Array.isArray(courseData[dayKey])) {
    return courseData[dayKey].slice().sort((a, b) => {
      // 按时间排序
      const timeA = a.startTime || '00:00'
      const timeB = b.startTime || '00:00'
      return timeA.localeCompare(timeB)
    })
  }
  return []
}

Page(
  BasePage({
    state: {
      courseData: {},
      todayCourses: [],
      scrollList: null,
      headerText: null,
      emptyText: null,
      refreshBtn: null,
      uiReady: false,
      destroyed: false
    },

    onInit() {
      console.log('[Page] onInit')
      this.state.destroyed = false
      this.state.uiReady = false
      // 从本地存储加载
      const data = storage.get()
      this.state.courseData = isCourseData(data.courseData) ? data.courseData : {}
      this.state.todayCourses = getTodayCourses(this.state.courseData)

      // 尝试从手机获取最新数据
      this.request({ method: 'GET_COURSES' })
        .then(({ result }) => {
          console.log('[Page] received courses from phone')
          this.applyCourseData(result)
        })
        .catch((err) => {
          console.log('[Page] request courses error:', err)
        })
    },

    build() {
      console.log('[Page] build')
      this.createUI()
      this.state.uiReady = true
    },

    onDestroy() {
      console.log('[Page] onDestroy')
      this.state.destroyed = true
      this.state.uiReady = false
    },

    // 接收手机端主动推送的数据
    onCall(req) {
      console.log('[Page] onCall received')
      if (req) this.applyCourseData(req.result)
    },

    applyCourseData(data) {
      if (this.state.destroyed || !isCourseData(data)) return false
      this.state.courseData = data
      this.state.todayCourses = getTodayCourses(data)
      storage.set({ courseData: data })
      if (this.state.uiReady) this.updateUI()
      return true
    },

    createUI() {
      // 背景
      hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: 0,
        y: 0,
        w: DEVICE_WIDTH,
        h: DEVICE_HEIGHT,
        color: 0x000000
      })

      // 顶部标题
      this.state.headerText = hmUI.createWidget(hmUI.widget.TEXT, {
        x: px(20),
        y: px(30),
        w: DEVICE_WIDTH - px(40),
        h: px(50),
        text: `${WEEKDAY_MAP[getTodayWeekday()]} ${getTodayDateStr()}`,
        color: 0x00ccff,
        text_size: px(30),
        align_h: hmUI.align.CENTER_H
      })

      // 分割线
      hmUI.createWidget(hmUI.widget.FILL_RECT, {
        x: px(40),
        y: px(85),
        w: DEVICE_WIDTH - px(80),
        h: px(2),
        color: 0x333333
      })

      if (this.state.todayCourses.length === 0) {
        this.showEmpty()
      } else {
        this.showCourseList()
      }

      // 底部刷新按钮
      this.state.refreshBtn = hmUI.createWidget(hmUI.widget.BUTTON, {
        x: DEVICE_WIDTH / 2 - px(60),
        y: DEVICE_HEIGHT - px(70),
        w: px(120),
        h: px(45),
        text: '刷新',
        text_size: px(22),
        radius: px(22),
        normal_color: 0x1a1a1a,
        press_color: 0x333333,
        color: 0x00ccff,
        click_func: () => {
          this.refreshData()
        }
      })
    },

    showEmpty() {
      this.state.emptyText = hmUI.createWidget(hmUI.widget.TEXT, {
        x: px(20),
        y: DEVICE_HEIGHT / 2 - px(60),
        w: DEVICE_WIDTH - px(40),
        h: px(120),
        text: '今天没有课程\n\n请在手机端导入课程表',
        color: 0x888888,
        text_size: px(26),
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V,
        text_style: hmUI.text_style.WRAP
      })
    },

    showCourseList() {
      const courses = this.state.todayCourses

      const data_array = courses.map((course) => {
        return {
          time: `${course.startTime || '--:--'}-${course.endTime || '--:--'}`,
          name: course.name || '未知课程',
          location: course.location || '',
          teacher: course.teacher || ''
        }
      })

      this.state.scrollList = hmUI.createWidget(hmUI.widget.SCROLL_LIST, {
        x: px(20),
        y: px(95),
        w: DEVICE_WIDTH - px(40),
        h: DEVICE_HEIGHT - px(175),
        item_height: px(110),
        item_space: px(10),
        item_config: [
          {
            type_id: 1,
            item_bg_color: 0x1a2332,
            item_bg_radius: px(16),
            text_view: [
              {
                x: px(20),
                y: px(8),
                w: px(280),
                h: px(36),
                key: 'name',
                color: 0xffffff,
                text_size: px(28),
                align_h: hmUI.align.LEFT
              },
              {
                x: px(20),
                y: px(48),
                w: px(280),
                h: px(28),
                key: 'time',
                color: 0x00ccff,
                text_size: px(22),
                align_h: hmUI.align.LEFT
              },
              {
                x: px(20),
                y: px(78),
                w: px(200),
                h: px(24),
                key: 'location',
                color: 0x888888,
                text_size: px(20),
                align_h: hmUI.align.LEFT
              },
              {
                x: px(240),
                y: px(78),
                w: px(160),
                h: px(24),
                key: 'teacher',
                color: 0x888888,
                text_size: px(20),
                align_h: hmUI.align.RIGHT
              }
            ],
            text_view_count: 4,
            image_view: [],
            image_view_count: 0,
            item_height: px(110)
          }
        ],
        item_config_count: 1,
        data_array: data_array,
        data_count: data_array.length,
        data_type_config: [
          { start: 0, end: data_array.length - 1, type_id: 1 }
        ],
        data_type_config_count: 1
      })
    },

    updateUI() {
      // 更新标题
      if (this.state.headerText) {
        this.state.headerText.setProperty(hmUI.prop.TEXT,
          `${WEEKDAY_MAP[getTodayWeekday()]} ${getTodayDateStr()}`
        )
      }

      // 隐藏空状态
      if (this.state.emptyText) {
        this.state.emptyText.setProperty(hmUI.prop.VISIBLE, false)
      }

      if (this.state.todayCourses.length === 0) {
        // 没有课程，显示空状态
        if (this.state.scrollList) {
          this.state.scrollList.setProperty(hmUI.prop.VISIBLE, false)
        }
        if (this.state.emptyText) {
          this.state.emptyText.setProperty(hmUI.prop.VISIBLE, true)
        } else {
          this.showEmpty()
        }
      } else {
        // 有课程，更新列表
        const data_array = this.state.todayCourses.map((course) => ({
          time: `${course.startTime || '--:--'}-${course.endTime || '--:--'}`,
          name: course.name || '未知课程',
          location: course.location || '',
          teacher: course.teacher || ''
        }))

        if (this.state.scrollList) {
          this.state.scrollList.setProperty(hmUI.prop.UPDATE_DATA, {
            data_array: data_array,
            data_count: data_array.length,
            data_type_config: [
              { start: 0, end: data_array.length - 1, type_id: 1 }
            ],
            data_type_config_count: 1
          })
          this.state.scrollList.setProperty(hmUI.prop.VISIBLE, true)
        } else {
          this.showCourseList()
        }
      }

      hmUI.showToast({ text: '课程表已更新' })
    },

    refreshData() {
      hmUI.showToast({ text: '正在同步...' })
      this.request({ method: 'GET_COURSES' })
        .then(({ result }) => {
          if (!this.applyCourseData(result) && !this.state.destroyed) {
            hmUI.showToast({ text: '课程数据格式错误' })
          }
        })
        .catch(() => {
          if (!this.state.destroyed) {
            hmUI.showToast({ text: '同步失败，请打开手机App' })
          }
        })
    }
  })
)
