import { BaseApp } from '@zeppos/zml/base-app'
import LocalStorage from './utils/storage'

App(
  BaseApp({
    globalData: {
      storage: new LocalStorage('course_data.txt'),
      courseData: {}
    },
    onCreate() {
      console.log('[App] onCreate')
      const data = this.globalData.storage.get()
      this.globalData.courseData = data.courseData || {}
    },
    onDestroy() {
      console.log('[App] onDestroy')
      // 页面在每次同步成功后保存，避免应用退出时用旧的 globalData 覆盖缓存。
    }
  })
)
