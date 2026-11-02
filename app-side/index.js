import { BaseSideService, settingsLib } from '@zeppos/zml/base-side'
import { isCourseData } from '../utils/course-data'

AppSideService(
  BaseSideService({
    onInit() {
      console.log('[AppSide] onInit')
    },

    onRequest(req, res) {
      console.log('[AppSide] onRequest:', req.method)

      if (req.method === 'GET_COURSES') {
        // 从 settingsStorage 读取课程数据
        try {
          const courseData = settingsLib.getItem('courseData')
          if (courseData) {
            const parsed = JSON.parse(courseData)
            if (!isCourseData(parsed)) throw new Error('Invalid course data')
            res(null, { result: parsed })
          } else {
            res(null, { result: {} })
          }
        } catch (e) {
          console.log('[AppSide] read courses error:', e)
          res({ message: 'Invalid course data' })
        }
      } else {
        res(null, { result: 'unknown method' })
      }
    },

    onRun() {
      console.log('[AppSide] onRun')
    },

    onDestroy() {
      console.log('[AppSide] onDestroy')
    },

    // 当 Settings 页面修改数据时，主动推送到手表
    async onSettingsChange({ key, newValue }) {
      console.log('[AppSide] onSettingsChange:', key)
      if (key === 'courseData') {
        try {
          const data = newValue == null ? {} : JSON.parse(newValue)
          if (!isCourseData(data)) throw new Error('Invalid course data')
          // 主动推送到手表端；捕获断开连接时的异步错误。
          await this.call({ result: data })
          console.log('[AppSide] pushed courseData to watch')
        } catch (e) {
          console.log('[AppSide] parse error:', e)
        }
      }
    }
  })
)
