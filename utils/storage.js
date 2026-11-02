import { statSync, writeFileSync, readFileSync } from '@zos/fs'

export default class LocalStorage {
  constructor(fileName) {
    this.fileName = fileName
    this.contentObj = {}
  }

  set(obj) {
    writeFileSync({
      path: this.fileName,
      data: JSON.stringify(obj),
      options: { encoding: 'utf8' }
    })
    this.contentObj = obj
  }

  get() {
    this.contentObj = {}
    try {
      if (statSync({ path: this.fileName })) {
        const parsed = JSON.parse(readFileSync({
          path: this.fileName,
          options: { encoding: 'utf8' }
        }))
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          this.contentObj = parsed
        }
      }
    } catch (error) {
      // 首次启动、文件不存在或缓存损坏时使用空数据。
      this.contentObj = {}
    }
    return this.contentObj
  }
}
