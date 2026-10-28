# 拖延勇者协会 · v0.2.1

一间不招天才、能开工就行的废柴勇者公会。AI 把目标拆成小委托，你完成现实里的步骤，用战利品和冒险币建设自己的据点。

## 已实现

- 公会手账美术：锅盖勇者六态、史莱姆四态、纸质委托公告板、手绘小屋、12 种奖励轮廓与对应家具。
- TokenHub 用量账本每 5 秒刷新，区分估算与预留，项目级 10 元上限、并发锁、超时保留预留。
- 10 种页面：登录注册、协会大厅、任务大厅、任务工作台、专注营地、冒险地图、我的据点、补给商店、成长档案、勇者资料。
- 真实 TokenHub 后台任务生成，计划与奖励均可编辑，确认后才建立/开始任务；可找回最近的 AI 草案。
- 任务奖励和补给铺家具支持后端调用阿里云百炼 `wan2.7-image`：统一使用 1K 正方形、公会手账＋废柴勇者风格提示词，并把返回的临时图片下载到本地素材目录；未配置图片 Key 时自动回退到原创 SVG。
- 任务前置阶段、不可重复领取、每日奖励上限、归档恢复、复盘与重新安排日期。
- 服务端专注计时、暂停继续、刷新恢复和历史记录。
- 固定地图、12 件商店物品、6 个房间槽位、任务纪念物解锁与持久保存。
- 注册登录、密码哈希、会话校验与用户数据隔离。

奖励名称、故事、图案类型与配色可由 AI 设计，画面使用原创 SVG 部件组合，页面标明“公会手绘部件”。勇者、史莱姆、小屋与家具同样为原创矢量插画，支持缩放与状态动画。用户选择本轮不启用付费图像；没有把矢量素材称作独立 AI 生图。旧版森林背景已从当前应用移除，历史版本仍可在 Git 标签中查看。

## 在这台 Mac 上启动

当前机器已准备好依赖与独立开发数据库。双击 **Start.command**，等待应用就绪后访问：

- 网页：http://127.0.0.1:5173
- 后端健康检查：http://127.0.0.1:8088/api/health

显示“准备好了”后可关闭启动窗口，前后端会继续在后台运行。请等这条提示出现后再打开网页；若进程启动失败，启动器会提示对应日志位置。重复双击会复用本项目已经运行的服务。

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
3. 若要启用奖励和家具生图，双击 `ConfigureAliyun.command`，在隐藏输入中粘贴**重新生成的**阿里云百炼 Key。也可以手动将新 Key 写入 `.env.local` 的 `ALIYUN_DASHSCOPE_API_KEY`。不要使用聊天中暴露的旧 Key，也不要放进 `VITE_` 变量。默认模型为 `wan2.7-image`，画幅为 `1K`；`ALIYUN_DASHSCOPE_BASE_URL` 可按 Key 所属地域调整。
4. 在 `frontend` 目录运行 `npm ci --legacy-peer-deps`。
5. 回到项目目录，执行 `python3 scripts/dev.py start`。

若默认包源较慢，可仅本次安装指定 `--registry=https://registry.npmmirror.com`。不要把 `.env.local`、数据库或密钥文件打进提交包。

阿里云图片调用的额度和费用不在现有 TokenHub 账本及其 10 元预算锁内。请在阿里云百炼控制台查看剩余额度并开启“免费额度用完即停”，以免免费额度耗尽后产生未预期费用。

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

# 阿里云图片适配器和奖励/家具完整流程（使用本地模拟服务，不产生模型费用）
python3 scripts/aliyun_image_mock_test.py
python3 scripts/aliyun_workflow_mock_test.py

# 计费规则、隔离数据库中的真实并发预算保护（不调用模型）
python3 scripts/usage_meter_test.py

# 启动器回归：真实终端关闭后，隔离端口上的前端应持续运行
python3 scripts/launcher_test.py

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

v0.1.1 修复了关闭启动窗口后前端退出、网页无法连接的问题，详见 [修复与回归记录](docs/startup-v0.1.1.md)。

## 本机演示账号

本次浏览器验证创建了本地演示账号 `littlehero`，密码 `LittleHero2026!`，昵称“慢慢勇者”。其中保留一项已通关任务、一项演示中的文档委托、一件专属纪念物和两处小屋布置，便于立即查看效果。也可以自行注册一个新账号体验完整流程。

此账号只存在当前机器的开发数据库，源码包不包含数据库或模型凭证；在新电脑上启动后，请自行注册。

## 用量、费用与图片开关

点击网页右上角“AI 账本”查看本项目从 v0.2 启用后的用量、费用估算、未确认预留和剩余调用预算。它轮询本地后台，不额外调用模型。每个文本请求先按最大输出和高峰费率预留，响应后使用平台 usage、缓存和峰谷规则更新估算；校验失败也记录已返回的用量。网络中断或缺失用量保留预留，不自动重试。

`TOKENHUB_ROUND_BUDGET_CNY` 默认 10，仅允许调低至 0–10 元；项目预算包括所有用户的累计文本估算及素材调用档案，通过 PostgreSQL 同一事务锁防止并发超额。重启、退出登录不清零。素材档案随项目保留，是制作历史，不是克隆仓库后新账号的实际扣费。

现有推理 Key 无法读取腾讯云账户余额或最终实扣，它们需要独立的 TC3 管控权限。账本中的费用是公开费率估算，不能当作现金余额；启用账本前的旧版本调用也未计入。最终费用以腾讯云账单为准。

配置模板默认 `TOKENHUB_IMAGE_GENERATION_ENABLED=false`，新机器必须明确选择才会收费调用。用户随后要求打开付费生图，本机 `.env.local` 已开启；这不等于腾讯云账号已开通后付费。Seedream Flash 当天核实参考价为 0.12 元/张，最新验证仍返回 402 / 401007。三次失败均未返回图像或用量，保守保留合计 0.36 元待核对预留，非实扣。需要原 API Key 所属账号的管理员开通图片模型；若 Key 来自课程方，用户个人账号开通不会改变原 Key 的权限。原文本 Key 保持不变，停止重复探测；不自动重试、不代签计费协议，也不转用其他收费图像服务。

`scripts/generate_guild_art.py` 默认只做免费 dry run；实际生成必须有新的明确授权、开启图片开关并在当天重新核实价格。该工具与在线文本调用共用数据库预算锁，并在网络请求前保存预留。失败不会自动重试或把未知费用记为 0。

课程 TXT 已重新全文核对：列出的图像模型是 `hy-world2-panorama`，属于360°全景能力，没有列Seedream或透明角色图集模型。当前普通图集适配器因此在凭证读取与计费之前被课程清单检查拦截，不能继续误调用。全景官方参考价约5元/张，不沿用0.12元预留。具体文件行号、协议区别及lifetime配额说明见 [课程接入核对](docs/tokenhub-course-requirements.md)。
