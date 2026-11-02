# 课程表 · Zepp OS

面向 **Amazfit GTR 4** 的每日课程表小程序。手机端在 Zepp App 中编辑或批量导入一周课程，手表端显示当天课程，并在同步后保存到本地供离线查看。

作者：**马俊杰（[o0junjie0o](https://github.com/o0junjie0o)）**。

## 功能

- 根据当前日期显示星期和当天课程，按开始时间排序。
- 显示课程名称、起止时间、教室和授课老师。
- 手机端切换星期，添加、编辑、删除课程或清空全部课程。
- 使用 JSON 批量导入课表，导入前校验星期、课程结构和时间格式。
- 手机设置变更时通过伴生服务推送数据；手表提供“刷新”按钮主动同步。
- 已同步课表保存在手表本地，断开手机连接后仍可读取。

## 设备与配置

| 项目 | 当前配置 |
| --- | --- |
| 目标设备 | Amazfit GTR 4，圆屏 466×466 |
| 项目设计宽度 | 480，构建工具按设备适配 |
| Zepp OS API | 最低/兼容 3.0，目标 3.5 |
| 应用版本 | 1.0.0，版本代码 1 |
| 应用 ID | 200001，沿用原项目配置 |
| 界面 | 主要为中文；配置中保留中英文应用名和翻译资源 |

其他设备尚未验证。设备的实际系统固件需要满足 API 最低要求；仓库中的通用圆屏配置不表示已在所有圆屏设备上测试。

## 开发与构建

准备 Node.js、npm 和官方 [Zeus CLI](https://docs.zepp.com/docs/guides/tools/cli/)。当前项目已使用 Node.js 24.16.0、npm 11.13.0、Zeus 1.9.0 完成构建和回归检查。

```bash
git clone https://github.com/o0junjie0o/zepp-course-schedule.git
cd zepp-course-schedule
npm ci
npm install --global @zeppos/zeus-cli@1.9.0
npm test
npm run build -- --target "Amazfit GTR 4"
```

`--target` 使用设备名称。省略参数运行 `npm run build` 时，可在交互菜单中选择设备。构建结果生成在 `dist/`，不纳入 Git。项目已经包含所需 PNG 图标，无需另行添加。

```bash
# 安装并启动官方 Zepp OS 模拟器后运行
npm run dev

# 生成真机安装二维码，由 Zepp App 扫码预览
npm run preview
```

真机安装需使用 Zepp App 的开发者功能和 Zeus 的预览流程，详见[官方开发文档](https://docs.zepp.com/docs/guides/quick-start/)。独立发布到应用商店时，应使用自己的开发者应用 ID，并确认版本和资源要求。

## 使用

1. 将手机与手表连接，在 Zepp App 中打开该小程序的设置页面。
2. 选择星期，添加课程，编辑名称、时间、教室和老师；更改自动保存。
3. 批量导入时粘贴完整 JSON，点击“导入课程”，查看导入结果。导入会**替换整周课表**，不是追加；格式错误时保留原数据。
4. 打开手表端应用查看当天课程；如数据尚未更新，保持连接并点击“刷新”。
5. “清空所有课程数据”会清空手机保存的课表，并在连接可用时同步到手表。请先自行备份需要保留的数据。

### JSON 格式

完整的虚构示例见 [`examples/course-data.json`](examples/course-data.json)：

```json
{
  "1": [
    {
      "name": "示例数学课",
      "startTime": "08:00",
      "endTime": "09:40",
      "location": "示例教室 A101",
      "teacher": "示例老师"
    }
  ],
  "2": [],
  "3": [],
  "4": [],
  "5": [],
  "6": [],
  "0": []
}
```

- 顶层必须是对象，键为字符串 `0` 至 `6`，分别表示周日到周六。
- 每个星期对应课程数组；可省略无课日期，`{}` 表示整周无课。
- 每门课必须是对象，以上五个字段如有提供，值必须是字符串；字段可省略或留空。
- 非空时间必须采用 24 小时制 `HH:mm`，例如 `08:00`。建议开始时间早于结束时间。
- 暂不支持学期起止日期、单双周、跨日课程、提醒通知或全天自动跨日刷新。跨日后重新进入页面或点击刷新。

## 目录

```text
├── app.js                         # 手表应用入口
├── app.json                       # 模块、权限、语言和设备配置
├── package.json / package-lock.json
├── icon.png                       # 原项目根目录图标
├── assets/                        # 通用、默认及 gt.r 设备图标
├── page/gt/home/                   # 手表首页与圆屏布局文件
├── app-side/index.js               # 手机伴生服务、请求响应与推送
├── setting/                       # 手机设置页面及翻译资源
├── utils/course-data.js            # 各端共用的数据校验
├── utils/storage.js                # 手表端本地文件缓存
├── examples/course-data.json       # 虚构示例课表
├── tests/app.test.cjs              # 平台接口模拟下的回归检查
├── docs/MAINTENANCE.md             # 检查范围、修复及验证限制
└── .github/workflows/check.yml     # 自动运行测试和 GTR 4 构建
```

数据流：手机设置页 → `settingsStorage` → 手机伴生服务（ZML）→ 手表页面 → `course_data.txt`。手表也可通过 `GET_COURSES` 主动请求手机数据。通信模型见 [Zepp OS 官方整体架构](https://docs.zepp.com/zh-cn/docs/guides/architecture/arc/)。

## 隐私与仓库内容

应用源码未包含账号登录、第三方服务器请求、分析统计或遥测逻辑；课程保存在 Zepp App 的设置存储和手表本地文件中，并通过 Zepp 的通信能力同步。平台自身的数据处理以其政策为准。

请勿提交真实个人课表、学校账号、密码、令牌、签名证书或本地调试记录。`.gitignore` 已排除依赖、构建产物、课程缓存、环境文件和常见凭据文件；提交前仍应检查 `git diff --cached`。安全反馈见 [SECURITY.md](SECURITY.md)，贡献约定见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 版权

原项目未提供开源许可证；本次仓库整理保留原作者身份和现有版权状态，`package.json` 标记为 `UNLICENSED`。公开可见不等同于授予使用、修改或再分发许可。如需这些授权，请联系作者。第三方依赖分别适用其自身许可证。
