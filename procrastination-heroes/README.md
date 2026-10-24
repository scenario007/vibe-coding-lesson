# 拖延勇者协会

一个可运行的课程全栈项目：让 AI 把目标拆成小步骤，为任务设计专属纪念物，再用每次进展建设自己的据点。

## 已实现

- 10 种页面：登录注册、协会大厅、任务大厅、任务工作台、专注营地、冒险地图、我的据点、补给商店、成长档案、勇者资料。
- 真实 TokenHub 后台任务生成，计划与奖励均可编辑，确认后才建立/开始任务；可找回最近的 AI 草案。
- 任务前置阶段、不可重复领取、每日奖励上限、归档恢复、复盘与重新安排日期。
- 服务端专注计时、暂停继续、刷新恢复和历史记录。
- 固定地图、12 件商店物品、6 个房间槽位、任务纪念物解锁与持久保存。
- 注册登录、密码哈希、会话校验与用户数据隔离。

奖励的名称、故事、图案类型与配色由 AI 设计，画面使用统一模板渲染，页面已标明。每份奖励的独立 AI 插画生成尚未接入。两张固定场景背景为 imagegen 制作的素材。

## 在这台 Mac 上启动

当前机器已准备好依赖与独立开发数据库。双击 **Start.command**，等待应用就绪后访问：

- 网页：http://127.0.0.1:5173
- 后端健康检查：http://127.0.0.1:8088/api/health

也可以在项目目录运行：

```bash
python3 scripts/dev.py start
```

双击 **Stop.command** 或执行下列命令停止本项目服务，数据会保留：

```bash
python3 scripts/dev.py stop
```

启动日志位于 `.local/backend.log`、`.local/frontend.log`。数据库只监听本机，数据位于 `.local/postgres`，端口 54329。开发数据库采用本机专用信任认证，不能直接作为公网生产配置。启动器不会安装系统级软件或修改全局包源。

## 换到一台新电脑

准备 Node 24、Java 21/22、sbt、PostgreSQL（含 psql/initdb/pg_ctl）和 Python 3。后端固定 Scala 3.3.3 / sbt 1.10.1，前端依赖由 package-lock.json 锁定。

1. 复制 `.env.example` 为 `.env.local`。
2. 将 `TOKENHUB_CONFIG_FILE` 指向老师发的本地 JSON 凭证文件，读取字段为 `api_key`。也可以只在后端环境设置 `TOKENHUB_API_KEY`。不要把密钥放进前端 `VITE_` 变量。
3. 在 `frontend` 目录运行 `npm ci --legacy-peer-deps`。
4. 回到项目目录，执行 `python3 scripts/dev.py start`。

若默认包源较慢，可仅本次安装指定 `--registry=https://registry.npmmirror.com`。不要把 `.env.local`、数据库或密钥文件打进提交包。

## 自己运行与检查

```bash
# 前端：在 frontend/ 目录
npm run typecheck
npm run build
npm run format:check

# 后端：在 backend/ 目录
sbt -batch compile

# 集成测试：先启动服务，在项目根目录运行
python3 scripts/integration_test.py

# 生产构建后的前后端 API 名称一致性
node scripts/check_api_names.mjs

# 可选：额外调用一次真实模型，验证 AI 计划与奖励结构
python3 scripts/integration_test.py --ai
```

集成测试会在本项目开发数据库创建隔离的 qa_/qb_ 测试账号，测试并发结算、余额、归属、每日上限与专注状态；不输出会话令牌和模型密钥。`--ai` 会实际消耗少量模型额度。

## 目录

```text
frontend/src/
  pages/          页面骨架、页面级 hooks 与业务区域组件
  apis/           对应后端服务的 API 类
  objects/        领域对象、有限状态与传输类型
  components/ui/  通用 UI 基础组件
  system/         发送、令牌、共享状态与应用导航
backend/src/main/scala/services/
  users/          用户与会话
  quests/         任务与阶段
  focus/          专注会话与区间
  adventure/      成长与统计
  economy/        钱包、物品、纪念物与据点
  ai/             异步模型生成与草案
  system/         配置、连接、共享分发器与启动
```

架构、规则映射与实现范围见 [docs/architecture.md](docs/architecture.md)，实际验证记录见 [docs/verification.md](docs/verification.md)。

## 本机演示账号

本次浏览器验证创建了本地演示账号 `littlehero`，密码 `LittleHero2026!`，昵称“慢慢勇者”。其中保留一项已通关任务、一件专属纪念物和两处小屋布置，便于立即查看效果。也可以自行注册一个新账号体验完整流程。

此账号只存在当前机器的开发数据库，源码包不包含数据库或模型凭证；在新电脑上启动后，请自行注册。
