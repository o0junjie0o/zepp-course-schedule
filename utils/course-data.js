// 各端共用同一份课程数据校验，避免错误导入覆盖有效课表。
export function isCourseData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  return Object.keys(data).every((day) => {
    if (!/^[0-6]$/.test(day) || !Array.isArray(data[day])) return false
    return data[day].every((course) => {
      if (!course || typeof course !== 'object' || Array.isArray(course)) return false
      return ['name', 'startTime', 'endTime', 'location', 'teacher'].every((field) => {
        const value = course[field]
        if (value === undefined) return true
        if (typeof value !== 'string') return false
        if ((field === 'startTime' || field === 'endTime') && value !== '') {
          return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)
        }
        return true
      })
    })
  })
}
