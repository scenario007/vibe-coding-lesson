# 后端接口与验证说明

服务只监听本机。除健康检查以外，接口均为 `POST /api/<消息类去掉 Message 后的小写名称>`，请求为 `application/json`。如需浏览器跨源直接访问，必须显式配置 `MIST_ALLOWED_ORIGIN`；通常前端应由本地代理调用。

## 初始化

在 `backend` 执行 `python3 scripts/dev.py serve`。手动启动时，设置 `MIST_DATABASE_URL`（JDBC URL）、`MIST_DATABASE_USER`、`MIST_DATABASE_PASSWORD` 和可选 `MIST_HTTP_PORT`，再运行 `sbt run`。游戏数据库必须与课程项目的账本数据库分开。

AI 还需要本机凭据路径 `TOKENHUB_CONFIG_FILE`、现有课程项目账本连接 `MIST_LEDGER_JDBC_URL` / `MIST_LEDGER_DB_USER` / `MIST_LEDGER_DB_PASSWORD`、真实且唯一的 `MIST_LEDGER_USER_ID`、完整素材账本路径 `TOKENHUB_ART_MANIFEST` 和不超过 10 的 `TOKENHUB_ROUND_BUDGET_CNY`。脚本根据 `MIST_LEDGER_USER` 查找用户，不把密钥写入项目。账本与素材记录不可用时拒绝调用；`estimatedCny` 是按现有费率规则估算的费用，未确认请求保留预留，不等于平台实扣。

## 档案和剧情

- `listrolesapi`、`liststoryprogressapi`：空对象；查询预设身份、公开解锁条件和不剧透的剧情进度。
- `createadventureapi`：`name`、`role`、`difficulty`，可选 `aiEnabled`、`storyId`、`replaceId`、`confirmReplace`。模式固定后不支持切换；三档案满时须提供要覆盖的 ID 和明确确认。
- 挑战模式附加 `mode: "challenge"`、`role: "自定义"`、`aiEnabled: true`、`confirmProfile: true`、`profile: {background, secret, secretKnownBy, stats}`；`secret` 和 `stats` 可为空，知情人用人物 ID。AI 根据限定事故、涉及者、认知和动机生成一次真相，并保存到私有状态。不能指定预设 `storyId`。
- `listadventuresapi`：空对象；`getadventureapi`：`{id}`。响应不会返回真相、随机种子、其他人物未被玩家察觉的位置或状态。人物关系内部使用单一信任值，接口只返回玩家上次了解到的态度（敌视、戒备、中立、友善或信赖），不暴露具体数值。
- `listsavesapi`：`{id}`；`saveadventureapi`：`{id, slot, confirmOverwrite}`，slot 为 1–3，已有存档必须确认；`loadadventureapi`：`{id, slot}`，slot 0 为阶段自动存档。完整主线结局后档案封存；死亡可读档。
- `revealtruthapi`：`{id}`；仅完整主线结局后可调用，标准模式记录玩家已主动查看，死亡不可调用。
- `listoutcomesapi`：空对象；列出死亡或主线结局的游戏外记录。回顾先展示结局，再简述最多三位已认识人物的最后已知态度和状况；不会自动揭示隐藏真相或未被察觉的人物状态。

## 行动与手记

- `listactionsapi`：`{id}`，返回当前位置的可用行动、预计耗时和已知风险。移动行动为 `move:gate`、`move:clinic`、`move:forge`、`move:hall`、`move:forest`、`move:mine`、`move:camp`；矿洞需许可或从村口潜入。
- `getmapapi`：`{id}`，只读返回七个地点、当前位置、普通路线是否开放和当前预计耗时。不会在地图上标记人物请求；暂停时仍可查看。特殊绕行路线以行动列表为准。
- 调查阶段可在议事厅花两小时查找事故档案；记录随本局真相变化，也可作为报告以外申请进入矿洞、推进调查的书面依据。
- 查明事故后，控制污染源前需在矿洞准备现场：快速准备耗时两小时并需检定，失败可能受伤；谨慎准备耗时四小时。撤离和保护水源不依赖这项准备。
- `performactionapi`：`{id, action, confirmed}`；最终行动 `resolve:evacuate`、`resolve:contain`、`resolve:water` 以及 `harm:<npc>`、`kill:<npc>` 需要 `confirmed: true`。行动是否可行、消耗和后果由服务端检查。
- 三种预设最终行动耗费两小时；如果执行过程中黑雾失控，结局记为失败，不能算作剧情通关。撤离和保护水源的结局不代表黑雾源头已经消除。
- `talk:<npc>`、`question:<npc>`、`share:<npc>:<线索索引>`、`join:<npc>` 等受在场和规则限制；NPC 最近已知位置不会自动追踪未被玩家看到的移动。受限请求可以接受、搁置和恢复；期限照常推进。
- 黑雾加重后，药师会暂时离开诊所前往村口协助伤者；玩家在场时可以目睹行动，也可以之后向有合理接触机会的知情人打听。诊所书面记录仍可用作调查替代路径。
- 人物之间传播消息需要时间推进和合理的同地接触；普通的不耗时调查不会让消息立即在人物之间传播。
- 存在待回应的请求或已有三条进行中的请求时，普通交谈不会继续堆出新请求；可以用 `decline:<请求ID>` 暂不接受尚未承诺的请求，不扣信任。条件改变后再次交谈可获得尚未提出的请求。
- 已接受或搁置的请求逾期后，提出请求的存活人物会记住失约并降低对玩家的信任；玩家再次交谈时才会看到对应反应和更新的态度。未接受的请求过期不算失约。
- `addjournalnoteapi`：`{id, text, clueIndexes}`，记录玩家推测并关联已有线索，不消耗时间。对话和已知线索保存在档案中。
- `markclueapi`：`{id, index, important}`，标记或取消标记已有线索的重要性。
- `getshopapi`：`{id}`；NPC 在场时返回固定价格和库存。交易、药品、食物和严重伤势处理都由行动接口执行。
- 森林中的 `start:beast` 启动简化回合遭遇，随后只接受 `combat:attack`、`combat:defend`、`combat:flee` 或 `combat:medicine`。矿洞危险失败时可能要求 `recover:accept`、`recover:food` 或 `recover:delay`；完成选择前不能进行其他世界行动。
- 战斗攻击掷出 20 且正常命中时造成双倍伤害；掷出 1 且未命中时会露出破绽。极端点数本身不会改变行动的先决条件或把不可能的行动变成可能。
- `listgrowthoptionsapi`：`{id}`，列出成长选项、可用性和未解锁原因；`spendgrowthapi`：`{id, choice}` 消耗里程碑成长机会。可选四项属性，以及需要相应调查或交谈经历的 `mine_sense`、`investigator`、`mediator`；后者改善说服与协商检定。

## AI

- `draftcharacterapi`：`{background}`，生成四项属性草案并检查总点数；用于创建前的确认，不会自动创建角色。其调用记录在共享账本中，不属于某个已创建的冒险档案。
- `proposeactionapi`：`{id, input}`，只提出受限动作，不直接执行；`generatequestapi`：`{id}`，基于在场已认识人物和可执行目标生成一条待接受请求；这两项要求本局开启 AI 动态玩法。
- 启用 AI 时，故事进入调查阶段后，每阶段至多自动尝试生成一次支线；只有存在适合提出请求的在场熟人、可用目标，且请求数量允许时才触发。生成失败不会撤销触发它的行动，但会暂停改变世界的操作，使用 `generatequestapi` 手动重试。当前自动支线由有限目标和奖励组合构成，不是无限制的新剧情。
- 动态请求的调查目标达成后，`goalReached` 标记为真；如委托人不在现场，需在期限内找到对方并用 `report:<请求ID>` 汇报，才能完成请求和领取奖励；在场时可直接完成。不会隔空改变委托人的信任或发放物品。
- `generatevisitorapi`：`{id}`，由在场且已认识的相关人物引荐新人物，每局最多两人；目前需要显式调用，身份与关联由限定选项组成。
- `gethintapi`：`{id, level: "direction" | "connection", confirmed: true}`；只发送玩家已知线索及笔记，成功后耗费一小时。AI 不掌握本局隐藏真相，但生成的自然语言仍可能推测错误。
- `proposeresolutionapi`：`{id, input}`，AI 模式下将自由描述转换为规则内的方案预览；返回的计划必须通过 `executeresolutionapi` 的 `{id, proposal, confirmed: true}` 再次校验后执行。支持的组合有限，不表示支持任意行动；执行期间可能因时间耗尽而进入失败结局。
- 本局 AI 接口通常返回 `status: "ready" | "failed"`；自由行动和最终方案还可能返回 `unsupported`（无法映射）或 `unavailable`（当前条件不满足），这两种情况不暂停游戏。服务请求失败时会记录暂停状态；读取档案仍可用，改变世界的操作需要先手动重试相同类型的请求。自由行动重试时可修改输入。发送失败、超时、未知用量等情况可能保留费用预留。
- `getusagereportapi`：`{id}`；返回该档案内请求数、已知 token、估算费用和未确认预留。角色创建前的草案调用、创建失败的挑战请求只在共享账本中，不属于已创建档案。

## 验证

`backend/scripts/smoke.py` 会创建三个档案，**只能对空白、专用于测试的数据库运行**。可使用 `python3 scripts/integration_test.py` 自动创建并清理隔离数据库，它不使用云端凭据。Scala 检查可运行：

```sh
sbt 'Test / runMain services.game.RuleChecks' 'Test / runMain services.game.ResolutionChecks' 'Test / runMain services.ai.ActionCheck' 'Test / runMain services.ai.ChallengeCheck' 'Test / runMain services.ai.QuestPlanCheck' 'Test / runMain services.ai.HintPlanCheck' 'Test / runMain services.ai.VisitorCheck'
```

另有 `SharedLedgerCheck` 和 `ConcurrencyCheck`，需要单独配置隔离 PostgreSQL 测试库。测试不会使用或打印真实密钥。文本真实联调曾成功，详细费用以共享账本为准。
