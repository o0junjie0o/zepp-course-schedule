import { isCourseData } from '../utils/course-data'

const WEEKDAY_OPTIONS = [
  { key: '1', label: '周一' },
  { key: '2', label: '周二' },
  { key: '3', label: '周三' },
  { key: '4', label: '周四' },
  { key: '5', label: '周五' },
  { key: '6', label: '周六' },
  { key: '0', label: '周日' }
]

AppSettingsPage({
  state: {
    courseData: {},
    selectedDay: '1',
    props: {},
    importText: ''
  },

  setState(props) {
    this.state.props = props
    try {
      const stored = props.settingsStorage.getItem('courseData')
      const parsed = stored ? JSON.parse(stored) : {}
      this.state.courseData = isCourseData(parsed) ? parsed : {}
      const selectedDay = props.settingsStorage.getItem('ui:selectedDay')
      if (WEEKDAY_OPTIONS.some(day => day.key === selectedDay)) {
        this.state.selectedDay = selectedDay
      }
    } catch (e) {
      this.state.courseData = {}
    }
  },

  saveData() {
    this.state.props.settingsStorage.setItem(
      'courseData',
      JSON.stringify(this.state.courseData)
    )
  },

  importCourses(value) {
    try {
      const imported = JSON.parse(value)
      if (!isCourseData(imported)) throw new Error('Invalid course data')
      this.state.courseData = imported
      this.state.importText = ''
      this.saveData()
      this.state.props.settingsStorage.setItem('ui:importStatus', '导入成功')
      return true
    } catch (error) {
      this.state.props.settingsStorage.setItem('ui:importStatus', '导入失败：请检查 JSON、星期和时间格式')
      return false
    }
  },

  getCoursesForDay(dayKey) {
    return this.state.courseData[dayKey] || []
  },

  addCourse(dayKey) {
    if (!this.state.courseData[dayKey]) {
      this.state.courseData[dayKey] = []
    }
    this.state.courseData[dayKey].push({
      name: '新课程',
      startTime: '08:00',
      endTime: '09:00',
      location: '',
      teacher: ''
    })
    this.saveData()
  },

  updateCourse(dayKey, index, field, value) {
    if (this.state.courseData[dayKey] && this.state.courseData[dayKey][index]) {
      this.state.courseData[dayKey][index][field] = value
      this.saveData()
    }
  },

  deleteCourse(dayKey, index) {
    if (this.state.courseData[dayKey]) {
      this.state.courseData[dayKey].splice(index, 1)
      if (this.state.courseData[dayKey].length === 0) {
        delete this.state.courseData[dayKey]
      }
      this.saveData()
    }
  },

  build(props) {
    this.setState(props)
    const { selectedDay, courseData } = this.state
    const courses = this.getCoursesForDay(selectedDay)

    return View(
      { style: { padding: '12px 16px', background: '#f5f5f5' } },
      [
        // 标题
        View(
          { style: { marginBottom: '16px', textAlign: 'center' } },
          [
            Text({
              value: '📚 课程表管理',
              style: { fontSize: '20px', fontWeight: 'bold', color: '#333' }
            }),
            Text({
              value: '编辑课程后会自动同步到手表',
              style: { fontSize: '12px', color: '#888', marginTop: '4px' }
            })
          ]
        ),

        // 星期选择
        View(
          {
            style: {
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '16px'
            }
          },
          WEEKDAY_OPTIONS.map(day =>
            Button({
              label: day.label,
              style: {
                background: selectedDay === day.key ? '#00ccff' : '#e0e0e0',
                color: selectedDay === day.key ? '#fff' : '#333',
                borderRadius: '16px',
                padding: '6px 14px',
                fontSize: '14px',
                border: 'none',
                minWidth: '50px'
              },
              onClick: () => {
                this.state.selectedDay = day.key
                this.state.props.settingsStorage.setItem('ui:selectedDay', day.key)
              }
            })
          )
        ),

        // 当天课程列表
        View(
          { style: { marginBottom: '12px' } },
          [
            Text({
              value: `${WEEKDAY_OPTIONS.find(d => d.key === selectedDay)?.label || ''} 课程 (${courses.length}节)`,
              style: { fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }
            }),
            ...courses.map((course, index) =>
              View(
                {
                  style: {
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '12px',
                    marginBottom: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }
                },
                [
                  // 课程名称
                  TextInput({
                    label: '课程名称',
                    value: course.name || '',
                    onChange: (val) => this.updateCourse(selectedDay, index, 'name', val),
                    style: { marginBottom: '6px' }
                  }),
                  // 时间
                  View(
                    {
                      style: {
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '8px',
                        marginBottom: '6px'
                      }
                    },
                    [
                      TextInput({
                        label: '开始时间',
                        value: course.startTime || '',
                        placeholder: '08:00',
                        onChange: (val) => this.updateCourse(selectedDay, index, 'startTime', val),
                        style: { flex: '1' }
                      }),
                      TextInput({
                        label: '结束时间',
                        value: course.endTime || '',
                        placeholder: '09:00',
                        onChange: (val) => this.updateCourse(selectedDay, index, 'endTime', val),
                        style: { flex: '1' }
                      })
                    ]
                  ),
                  // 地点和老师
                  View(
                    {
                      style: {
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '8px',
                        marginBottom: '8px'
                      }
                    },
                    [
                      TextInput({
                        label: '教室',
                        value: course.location || '',
                        placeholder: '教室地点',
                        onChange: (val) => this.updateCourse(selectedDay, index, 'location', val),
                        style: { flex: '1' }
                      }),
                      TextInput({
                        label: '老师',
                        value: course.teacher || '',
                        placeholder: '授课老师',
                        onChange: (val) => this.updateCourse(selectedDay, index, 'teacher', val),
                        style: { flex: '1' }
                      })
                    ]
                  ),
                  // 删除按钮
                  Button({
                    label: '🗑️ 删除此课程',
                    style: {
                      background: '#ff4d4f',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '8px',
                      border: 'none',
                      width: '100%'
                    },
                    onClick: () => {
                      this.deleteCourse(selectedDay, index)
                      this.setState(this.state.props)
                    }
                  })
                ]
              )
            )
          ]
        ),

        // 添加课程按钮
        Button({
          label: `➕ 添加${WEEKDAY_OPTIONS.find(d => d.key === selectedDay)?.label || ''}课程`,
          style: {
            background: '#00ccff',
            color: '#fff',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '16px',
            border: 'none',
            width: '100%',
            marginBottom: '12px'
          },
          onClick: () => {
            this.addCourse(selectedDay)
            this.setState(this.state.props)
          }
        }),

        // 批量导入
        View(
          {
            style: {
              background: '#fff',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }
          },
          [
            Text({
              value: '📋 批量导入 (JSON格式)',
              style: { fontSize: '14px', fontWeight: 'bold', color: '#333', marginBottom: '6px' }
            }),
            Text({
              value: '格式: {"1":[{name,startTime,endTime,location,teacher}], "2":[...], ...}',
              style: { fontSize: '11px', color: '#888', marginBottom: '8px' }
            }),
            TextInput({
              label: '粘贴JSON数据',
              value: this.state.importText,
              multiline: true,
              placeholder: '粘贴课程表JSON...',
              onChange: (val) => {
                this.state.importText = val
              }
            }),
            Button({
              label: '导入课程',
              onClick: () => this.importCourses(this.state.importText)
            }),
            Text({
              value: props.settingsStorage.getItem('ui:importStatus') || '',
              style: { fontSize: '12px', color: '#666', marginTop: '6px' }
            })
          ]
        ),

        // 清空所有数据
        Button({
          label: '🗑️ 清空所有课程数据',
          style: {
            background: '#ff7875',
            color: '#fff',
            borderRadius: '8px',
            padding: '10px',
            border: 'none',
            width: '100%'
          },
          onClick: () => {
            this.state.courseData = {}
            this.saveData()
            this.setState(this.state.props)
          }
        })
      ]
    )
  }
})
