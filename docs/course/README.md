# 课程阅读记录与后续开发依据

阅读日期：2026-10-24。以下为最初阅读阶段的历史记录；当时未搭建项目，未安装项目依赖，未启动样例服务，未改动课程源文件。用户随后已明确授权开发「拖延勇者协会」，当前实现与验证记录位于 `procrastination-heroes/README.md` 和 `procrastination-heroes/docs/verification.md`；文中的“等待指令”均描述当时状态，不限制当前授权。

## 来源与阅读范围

课程资料根目录：`/Users/maziqi/Desktop/大三上/无代码零基础软件制作/`。

| 来源 | 范围 | 作用 |
| --- | --- | --- |
| [lec2.pptx](/Users/maziqi/Desktop/大三上/无代码零基础软件制作/课件/lec2.pptx) | 37 页，全部可提取文本及相关嵌入图片 | 环境、技术栈、声明式编程、不可变数据、集合操作、第一次作业示例 |
| [lec3.pptx](/Users/maziqi/Desktop/大三上/无代码零基础软件制作/课件/lec3.pptx) | 26 页，全部可提取文本及相关嵌入图片 | 领域类型、纯函数、Monad、Cats Effect IO |
| [lec4.pptx](/Users/maziqi/Desktop/大三上/无代码零基础软件制作/课件/lec4.pptx) | 13 页，全部可提取文本及相关嵌入图片 | 微服务职责、序列化、数据库、Git |
| [lec5.pptx](/Users/maziqi/Desktop/大三上/无代码零基础软件制作/课件/lec5.pptx) | 20 页，全部可提取文本及相关嵌入图片 | React 状态模型、Zustand、页面拆分、Tailwind、Vite |
| [rules.txt](/Users/maziqi/Desktop/大三上/无代码零基础软件制作/samples/rules.txt) | 60 条全文 | 用户明确要求作为后续生成代码的前提 |
| `samples/sample/backend-sample`、`frontend-sample` | 基础模板的启动、路由、API、对象、表、初始化、事务及主要页面/hooks/组件 | 核对一条功能从页面到数据库的实现方式 |
| `samples/sample/18_2025040217_刘一铭_4669` | 项目说明、后端说明、目录，抽样创建课程 API、服务路由及课程工作区页面 | 理解复杂教学业务与页面区域组织 |
| `samples/sample/20_2026403036_陈柏聪_3998/Ts_project` | 前后端说明、架构文档、目录，抽样预约、收藏 API/Table、前端 API 和详情页 | 理解复杂房源业务及另一种消息实现，识别与 rules 的差异 |

4 份课件合计 96 页。该课件目录中未发现 lec1；不推断缺失课件里的要求。两个完整项目采用架构与关键链路抽样阅读，不表示逐行审计全部源码，也不表示运行验证通过。构建产物、IDE 缓存、第三方依赖不作为业务源码阅读。

## 解释材料的原则

1. 用户的当前明确需求决定任务范围。现在等待后续项目指令，不将课件中的练习或样例业务当作立即执行任务。
2. 用户已明确采纳 rules；材料之间出现冲突时，以 rules 的明确规定约束实现。课件补充方法与背景，示例补充实现参考。
3. 区分“要求”与“建议”：例如只用不可变业务数据、消息执行入口、Table 封装属于明确规范；Windows + WSL、IDE 选择等属于环境建议，不要求在用户的 macOS 上照搬。
4. 不把教学系统、图书借阅、房源系统的功能清单移植为新项目需求。不因示例使用 MinIO、Kafka、Redis、地图或外部 AI 就自动引入。
5. 目前这 4 份课件没有给出本次前后端项目的完整评分表、强制页面数、微服务数量、截止日期或提交包命名。lec2 第 35 页的“两页纯前端 + IP 视频”是第一次作业操作示例，不能套到尚未确定的新项目。

## 课件中的开发要求与建议

### 技术栈及环境

- 前端：TypeScript + React；课件介绍并建议使用 Vite、Tailwind、Zustand。
- 后端：Scala 3、Cats Effect IO；Circe 处理序列化，PostgreSQL 存储数据。
- 基础样例补充：http4s 提供 HTTP 服务，JDBC + HikariCP 提供数据库连接；前端通过 Vite 代理访问 `/api`，使用 React Router 和 shadcn/ui 基础组件。
- 版本是材料中的基线，不是“当前最新版”结论：课件有 Scala 3.4.2 / sbt 1.10.0 / OpenJDK 22 的安装示例，也明确允许其他 Scala 3 版本；基础样例使用 Scala 3.3.3。前端样例 package.json 中有 React 19、Vite 8、Tailwind 4、Zustand 5、TypeScript 5.9。正式实施前按样例依赖兼容性和用户环境确定版本。
- 课件推荐英文用户名与不含中文的项目路径。当前工作区祖先路径含空格和中文，实施时需要留意工具兼容性；不能擅自移动用户目录。新项目子目录优先清晰英文名称。

### 函数式风格

- 业务数据不可变，Scala 使用 `val`，避免 `var` 与命令式循环；集合变换使用 `map`、`flatMap`、`filter` 等。
- 课件禁止的是命令式 `for` 循环。lec3 第 5、25 页的截图和基础样例明确使用 `for ... yield`，它是 `map/flatMap` 的组合语法，可以用于 IO、Try、Either 等。
- 核心运算是确定性的纯函数；数据库、网络、随机数、时钟和其他副作用放在 IO 中并显式组合，由框架在边界执行。
- 课件明确不采用业务代码中的 `try/catch/finally` 风格，介绍 Option、Try、模式匹配。基础模板 JDBC 部分仍使用 `try/finally` 关闭资源，这是样例和教学风格的差异；新代码优先用 Cats Effect `Resource`、`IO.blocking` 和 IO 错误处理表达资源与错误。
- 为有实际领域意义的概念定义类型，特别是不同种类 ID、角色和有限状态；“不要使用基础类型”应理解为避免用无区别的 String/Int 充当所有领域概念，不是禁止所有字符串或数字字段。
- 模块高内聚、低耦合。课程允许逻辑拆分、单体部署，并不要求每个模块独立进程、独立数据库。

### React 与状态

- 区分常量、可变的核心状态、由核心状态计算的展示数据；展示数据由纯函数/必要的 useMemo 派生，避免重复存储并同步同一事实。
- 页面局部状态用 hooks；多个页面真正共享的核心状态才使用 Zustand。
- Zustand store 尽量私有，对外暴露清楚命名的 `useXXX`、`getXXXSnap`、`setXXX`；组件订阅 hook，非组件边界按需取快照。纯函数通过参数接收数据，不能因快照函数存在就引入隐藏依赖或 hooks。
- 按业务区域拆页面，入口保留可见骨架；避免无必要的递归目录、包装器和全局 store。

## rules 的执行索引（全部 60 条）

这里是便于导航的摘要；完整措辞见同目录 `rules.reference.txt`，原件仍是来源。

| 规则编号 | 后续落实方式 |
| --- | --- |
| 1、5–7、9–10 | 跨服务可调用公开 API 消息的 `plan(connection)`，也可直接调用任何服务封装好的公开 Table def；SQL、行映射和私有实现不开放。不添加只为转发而存在的跨服务 API 层。 |
| 2–4 | 后端全部领域模块位于 `services/<service>/`；目录优先 `api/objects/routes/tables/utils`，额外目录须说明理由。共享配置、连接、事务、启动、通用路由等明确归属到 `services/system/` 等系统模块。 |
| 8、12 | 服务 utils 仅本服务使用，工具函数采用 `private[服务名] def`。按真实复用或过长 plan 提取；API 中保留可见的主要步骤和重要副作用。 |
| 11 | 用户服务负责角色、权限、会话、令牌规则。其他服务可用其公开 API/Table，但取得用户数据不等于通过业务授权。 |
| 13–16 | objects 纯粹、精简、一对象一文件，类型与伴生对象同文件，import 尽量置顶；数据结构使用 `final case class`，伴生对象按规则提供 Encoder/Decoder；不放随机生成、持久化访问、权限检查、工作流或跨层映射。 |
| 17–19 | 枚举转换与编解码集中在伴生对象，统一 `toString/fromString`、输入规范化与非法值处理；封闭状态用 enum、sealed trait 或 TS 字面量/可辨识联合类型，分支完整覆盖。 |
| 20–23 | 每个 API 独立文件，以 Message 结尾；`final case class XxxMessage(业务输入) extends APIMessage[Response]`；唯一必要公共执行入口 `plan(connection: Connection): IO[Response]`。IO 显式组合；避免 execute 别名和只做转发的 Service。 |
| 24–27 | 核心领域类型在 objects，API 传输类型在 objects/apiTypes；一个 API 一个返回值，多字段合并响应对象；无业务输入使用 NoRequestMessage，不创建空请求包装；不默认注入通用 Context。 |
| 28–30 | 外部令牌在路由边界验证并转换为可信 userId，再构造内部消息；不能信任客户端自报身份。两端消息允许因此不同。仅按实际需要使用 APIWithTokenMessage，不扩张大量认证/管理员子类。 |
| 31–33 | 统一从消息类型推导 API 名称，两端规则一致；路由只处理协议、解析、身份转换、分发和序列化。每服务一个 XXRoutes 注册对前端开放的 API，顶层合并列表；内部 API 不必注册或生成前端文件。 |
| 34–38 | 一表一文件夹，包含 XXTable.scala 与 XXTableInitializer.scala；本表负责建表、索引、约束与初始化。私有 `xxxSql` 在对应公开 def 之前并相邻；def 封装绑定、执行和映射，统一返回 IO[T]，保持业务逻辑简洁。 |
| 39–40 | 全局 components 只放通用 UI 基础组件；页面专属组件、hooks、stores、functions、objects 就近放页面目录。 |
| 41–47 | 复杂页面按用户可见业务区域拆分；页面级 hooks 协调共享状态，objects 定义页面数据，functions 放纯计算；index.tsx 明示主要区域。只在复杂度需要时递归拆分，不为形式增加层级。 |
| 48–49 | 前端 apis 按后端服务划分；面向前端的后端消息尽量与调用文件一一对应，内部 API 除外；身份转换等差异须有解释。 |
| 50–53 | 通用 API 基类、命名、发送、令牌、错误和序列化机制在共享基础设施中，按职责拆文件；推荐每个前端 API 为明确输入、带 send 方法的简洁类；统一计算 API 名称。 |
| 54–58 | 删除未使用脚手架和依赖；样式遵循 Tailwind，确有必要才添加自定义 CSS；目录名称表达职责；页面共享对象用 pages/objects 等明确归属；TS 强类型保持简单。 |
| 59 | 报告、PDF、架构说明、对话历史等文档产物放文档目录，不混入前后端源码。具体交付物以用户后续任务为准。 |
| 60 | API 依赖较多的复杂页面显式表达 loading、ready、empty、error 及操作状态；简单表单允许局部提交/错误状态，不强行引入复杂状态模型。 |

## 从基础模板掌握的端到端结构

示例业务是图书馆，不预设后续项目也是图书馆。

```text
页面 index.tsx
  -> 页面 hook（状态、校验、事件、请求协调）
  -> apis/<service>/XxxAPI（明确输入及响应类型）
  -> 共享发送/命名/令牌机制
  -> POST /api/<统一推导的名称>
  -> 服务注册列表 + 全局 APIMessageRouter
  -> 外部令牌转可信 userId
  -> 构造 XxxAPIMessage(...).plan(connection)
  -> 权限 API / 公开 Table 方法 / 本服务私有 utils
  -> 同一事务连接内数据库操作
  -> Circe 序列化响应
  -> hook 更新核心状态，派生展示数据，组件渲染
```

- 借书链路先验证身份、锁定图书、检查并扣减库存，再创建记录。还书链路校验记录、标记归还并恢复库存。原子性依赖共享事务，而不是让每个嵌套 API 开独立事务。
- 基础模板在统一路由处建立事务，注册列表按 user/books 合并；数据库操作返回 IO，JDBC 阻塞操作放入 IO.blocking。
- UserId、BookId 等 Scala 值包装类型序列化为字符串；有限状态在 TS 中用字面量联合，时间以约定格式的字符串传输。
- 页面逻辑放 hooks，组件通过明确 props 渲染；前端严格 TS 配置、ESLint，提供 typecheck/lint/build。后续实施时根据项目实际完成编译和关键流程验证，本次没有运行这些检查。

## 必须纠正的样例差异

| 已核对的样例情况 | 后续采用的规范 |
| --- | --- |
| 基础模板的 Main、routes、system 位于 services 外部 | 依 rules 4 将共享基础设施归入明确系统服务；必要的最小入口额外结构说明理由。 |
| 基础模板 Table 方法带 `private[books]`、`private[user]` | 依 rules 6–10、36，供整个后端 API 使用的封装表操作应是公开 def；SQL 与行映射保持私有。服务 utils 才采用服务级私有可见性。 |
| 基础模板多个 API 重复密码处理、用户资料映射或图书校验 | 按真实复用提取到本服务私有 utils；不把映射或随机数塞入 objects，不制造转发层。 |
| 基础模板用单独 sendAPI(new XxxAPI(...))，API 类自身没有 send | rules 52 推荐简洁 API 类带 send；新项目优先采用该推荐，底层共用发送机制。此处是推荐风格差异，并非声称旧模板无法运行。 |
| 基础模板由 constructor.name 推导前端 API 名 | 保留统一命名原则；正式实现需验证构建压缩后的类名稳定性，不能只测开发环境。命名实现属于工程选择，应由一次端到端验证确认。 |
| 完整教学样例用 microservices、infrastructure、support、api/requests 和 api/responses，并有 `plan` 自行开启事务 | 不能直接当作新项目目录与执行签名；按 rules 使用 services、objects/apiTypes、私有 utils 和 `plan(connection)`。 |
| 完整房源样例部分 API 是单例 object，使用请求/响应双泛型及 principal，存在 application/model/shared 等目录 | 新项目按单响应泛型、消息构造参数和 `plan(connection)` 建模；只有真实依赖才引入额外参数/目录，并解释理由。 |
| 完整样例有服务私有 Table、初始化与 Table 合并、按读写拆多文件等结构 | 按当前 rules 保持公开封装操作、每表文件夹、Table/Initializer 分离及 SQL/def 相邻。 |
| 示例中有 JDBC try/finally、while 遍历 ResultSet、时钟/随机数处理不完全统一 | 不将其提升为业务层规范；新代码优先纯计算与 IO/Resource 边界，避免裸副作用和可变业务数据。 |
| 部分复杂页面只有多个布尔值，或页面主结构隐藏在大型 Region/Panel 中 | 按 rules 43–47、60 明确页面骨架与状态，避免照搬其模糊结构和互相矛盾的状态组合。 |

以上是阅读中发现的结构和风格差异，不是完整缺陷清单；没有修改原样例，也没有宣称样例通过运行验证。

## 后续接到项目任务时

先明确业务目标、角色、完整流程和数据类型，再划分服务、表、API、页面及状态。实现必须同时满足 rules 的结构要求和课程的函数式原则。用户尚未指定项目选题、功能规模、视觉风格、验收与交付材料，不能提前固定。

## 来源指纹

用于后续判断来源是否更新；rules 全文快照在本目录，非重新解释后的版本。

```text
lec2.pptx  a883e312ab05949591459397ad7a953159966976f79e625f4c677fbd786d2134
lec3.pptx  73541844d74e82e9b0be56adcfcb1777c7a20ed77cc75d0613e2a9bd90c9a841
lec4.pptx  00aa48e996d0b8db3089ad114947f486d8ccc993aef6f69cca7e0c647f2e5adb
lec5.pptx  4f958ab303c211f7a7252c9b1a4ec935e220938407b699f3ea13137efb2356e6
rules.txt  6a720d72b729f65e5cfbdda95d618d7c48ca3d356dc398efd3db2ff757c8713a
```
