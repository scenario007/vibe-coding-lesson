# TokenHub 生图、用量与费用核查

核查日期：2026-10-25，广州站点。只读取官方文档和两次 `/v1/models`；本研究没有发起生图或文本推理，没有变更账号、套餐、付费开关或凭证。

## 结论

本轮优先候选为 **Seedream-Image-v5.0-flash**：官方公开按量参考价为 **0.12 元/张**，支持透明 PNG，适合角色图集、史莱姆和奖励部件。同步接口能随结果返回平台 Token 用量，便于逐次记账。模型列表返回 `online`，但这不等于该 API Key 已开通该模型的付费服务，最终应由一次预算内调用验证。[价格](https://cloud.tencent.com/document/product/1823/130055)、[Seedream 协议](https://cloud.tencent.com/document/product/1823/136609)、[模型启用限制](https://cloud.tencent.com/document/product/1823/130079)。

可选 **Hy-Image-3.5-preview**，1K/2K 为 **0.15 元/张**，4K 为 **0.20 元/张**。该模型支持参考生图，但接口参数中没有承诺独立的透明背景开关，因此透明角色素材优先用前者。[Hy 协议](https://cloud.tencent.com/document/product/1823/135745?lang=zh)。

不能把“实际 Token × 公开单价”写成“平台实扣”。平台生图按小时结算，实际付款可能受免费额度、套餐抵扣和计费规则影响。现有配置提供推理 API Key，不含腾讯云管控接口所需的 SecretId/SecretKey，因此可以实时维护本项目调用账本，暂不能自动读取云账户真实余额。

## 当前图像模型比较

本机凭证读取的 `/v1/models` 共 122 个模型，相关状态如下；未将密钥或原始响应写入仓库。

| 模型 ID | 返回状态 | 公开参考费用 | 本项目判断 |
| --- | --- | --- | --- |
| `seedream-image-v5.0-flash` | online | 0.12 元/张 | 优先做少量透明角色与场景素材 |
| `wand-vega-image-lite` | online | 1K/2K 0.135 元/张 | 低价备选，本轮不额外试多家 |
| `hy-image-v3.5-preview` | online | 1K/2K 0.15 元/张 | 中文与参考图备选 |
| `hy-image-v3` | pre-offline | 0.20 元/张 | 不用于新接入 |
| `seedream-image-v5.0-lite` | pre-offline | 0.22 元/张 | 不用于新接入 |

价格页核查时最近更新时间为 2026-10-24。旧页面或缓存中的 HY-Image-Lite 0.099 元报价不能当作现有在线模型报价。官方已公告 Hy-Image-3.0 将于 2026-11-12 下线、Seedream-Image-v5.0-lite 将于 2026-11-24 下线，替代型号为 3.5-preview 和 5.0-flash。[下线公告](https://cloud.tencent.com/announce/detail/2524)。

本轮三张图集/场景若各生成一次，按上述公开费率预计：Seedream Flash 约 0.36 元，Hy 3.5 2K 约 0.45 元；这是预算测算，不是已发生费用。用户确认的本轮新增费用上限为 10 元。

## Seedream Flash 接入要点

官方端点：`POST https://tokenhub.tencentmaas.com/v1/wand/si-image/generation`。鉴权使用原有 Bearer API Key。

建议首轮参数：

```json
{
  "model": "seedream-image-v5.0-flash",
  "prompt": "具体美术提示词，不超过 600 字符",
  "size": "2048x2048",
  "output_format": "png",
  "background": "transparent",
  "response_format": "b64_json",
  "watermark": false
}
```

背景场景使用 `background: "opaque"`。Flash 支持 1K、1.5K、2K；显式宽高总面积需处于 921600–4624220 像素，2048×2048 合法。参考图通过 `images` 传 URL 或 Data URL，最多 10 张；不传即为文生图。不要传入 Lite 专属的组图参数。

同步返回 `data[].b64_json` 或 `data[].url`、`request_id` 和 `tokenhub_usage.total_tokens`。下载 URL 仅约 12 小时有效，项目应保存本地最终素材。透明通道应实际检查；不能仅凭提示词就声称已透明。[完整参数](https://cloud.tencent.com/document/product/1823/136609)。

## Hy 3.5 备选接入

端点：`POST https://tokenhub.tencentmaas.com/v1/wand/hunyuan-image/v35-generation`。

使用 `model: "hy-image-v3.5-preview"`、`size: "2048x2048"` 与 `messages: [{role:"user",content:[{type:"text",text:"提示词"}]}]`。宽高在 256–8192 范围、总面积不超过 16777216；2048×2048 合法。关闭外部搜索增强，避免引入不必要费用。

无需任务轮询。图片应读取 `choices[0].delta.image.url`；成功条件以实际图片 URL 存在为准，不能要求 finish_reason 必须为 stop。平台用量取 `tokenhub_usage.total_tokens`，可兼容 `usage.total_tokens`。`assembled_history` 内图是多轮编辑中间图，不应误当最终交付图。临时 URL 需下载保存。[官方说明](https://cloud.tencent.com/document/product/1823/135745?lang=zh)。

## 文本模型费率与保守预留

当前业务使用 `deepseek-v4.1-flash`，与 `deepseek-v4-flash` 旧预览版不是同一费率。广州公开按量费率，单位为元/百万 Token：

| 时段 | 未命中输入 | 输出 | 命中缓存输入 |
| --- | --- | --- | --- |
| 空闲 | 1 | 4 | 0.02 |
| 高峰 | 2 | 8 | 0.04 |

北京时间工作日 09:00–12:00、14:00–18:00 为高峰，其余及周末全天为空闲。平台以接收请求的时间定档，应用本地发出时间只是近似；跨边界时用高峰保守估算。[官方价格与峰谷规则](https://cloud.tencent.com/document/product/1823/130055)。

预算预留可统一按未命中输入 2 元/百万、最大输出 8 元/百万计算；生成后再按平台返回的实际 Token 和对应费率更新估算。当前最大输出 1800 Token，假设输入上界为 4000 Token，预留约 0.0224 元；输入上界必须真实约束提示词长度，不能当作固定实扣值。

Chat 响应中的 `usage.prompt_tokens`、`completion_tokens`、`total_tokens` 应持久保存。缓存优先读取 `prompt_tokens_details.cached_tokens`，兼容 `cache_read_tokens`；原厂也可能提供 `prompt_cache_hit_tokens`。缓存是输入子集，不能再次加到输入总数。`completion_tokens` 已包含推理 Token，也不能再次累加 reasoning_tokens。没有缓存细分时按未命中输入估算并明确标注。[Chat usage 定义](https://cloud.tencent.com/document/product/1823/135872)。

## 账户用量与余额的实际边界

以下为**存在的官方接口**，不是普通推理 API Key 的 Bearer 接口：

- `tokenhub.tencentcloudapi.com`，版本 `2026-03-22`，`DescribeUsageRankList`：按 API Key / endpoint / model 查询时间窗用量与趋势。[接口](https://cloud.tencent.com/document/product/1823/132340)。
- 同域 `DescribeApiKey`：API Key 维度的限额与周期已使用量，配额单位为 Token，不等同人民币现金余额。[详情](https://cloud.tencent.com/document/product/1823/132345)。
- `billing.tencentcloudapi.com`，版本 `2018-07-09`，`DescribeAccountBalance`：云账户真实余额，金额单位为分。[余额接口](https://cloud.tencent.com/document/product/555/20253)。

它们需要腾讯云访问权限与 TC3-HMAC-SHA256 签名，使用 SecretId/SecretKey 或临时凭证。现有本地 JSON 不含这些字段；本轮不新增权限、不索取聊天中的密钥、不尝试创建凭证，也不将静态 JSON 的 quota 字段冒充实时余额。[管控面鉴权](https://cloud.tencent.com/document/product/1823/132283)。

## 建议的监测与预算行为

1. 每次外部调用前持久化请求用途、模型、请求标识及保守预留费用；对项目级共享凭证预算加锁，避免并发突破预算。
2. 响应后保存实际 usage、平台 request_id、费率版本与费用估算；公开展示只返回本人数据和汇总，不暴露凭证或其他用户调用详情。
3. 超时/网络断开但无法确认是否计费时标记“待核对”，保留预留，不标 0 元、不自动重试重复付费。
4. 读取不到 usage 时标记“用量未知”，不能用张数乘单价冒充平台返回实际 Token。
5. 预算涵盖本轮开发生图及真实文本联调。达到上限前拒绝新付费请求；不自动切换更贵型号、开通后付费或购买套餐。
6. UI 使用“本项目记录用量 / 按公开费率估算 / 平台余额未连接”等明确名称。费用趋势可以轮询本地账本；真实现金余额和最终实扣需有管控凭证或由用户在控制台核对。

## 最少计费验证案例

以下是建议由实现者对计费纯函数、用量解析与数据库预算锁运行的验证向量，不代表已经运行了对应后端测试。数值计算已用 Python Decimal 独立复核；无额外模型请求。费用均为人民币估算，保留小数精度，不按分向上取整每笔小额请求。

### 费率与 Token 解析

| 案例 | 平台返回 / 条件 | 应有结果 |
| --- | --- | --- |
| 空闲时段，无缓存 | prompt=1000，completion=200，total=1200 | `(1000×1+200×4)/1000000 = 0.001800` 元 |
| 高峰时段，无缓存 | 同上 | `(1000×2+200×8)/1000000 = 0.003600` 元 |
| 空闲缓存 | prompt=1000，其中 cached=800；completion=200 | `(200×1+800×0.02+200×4)/1000000 = 0.001016` 元 |
| 高峰缓存 | 同上 | `(200×2+800×0.04+200×8)/1000000 = 0.002032` 元 |
| 推理已含在输出中 | prompt=1000，completion=300，其中 reasoning=200 | 空闲费用 `0.002200` 元；reasoning 不再额外加入输出，total 应为 1300 |
| 缓存字段别名 | `prompt_tokens_details.cached_tokens=800` 或仅 `cache_read_tokens=800` | 两者分别作为输入缓存子集解析，不能两者相加成为 1600；缺失时按未命中输入估算 |
| 图像计费 | `tokenhub_usage.total_tokens=12000`，公开图像费率 10 元/百万 | 保存实际整数 12000，费用 `0.120000` 元；总 Token 不能拆造为文本输入/输出 |
| 图像返回异常用量 | 平台确实返回 total=12142 | 估算 `0.121420` 元，不能强制改成“每图固定 12000”以迎合参考价 |
| 缺少或非法用量 | 字段不存在、负值、Token 非整数、cached>prompt、总数冲突 | 保留“未知/待核对”及预留；不记为已确认 0 Token，不把非法数字截断后计费 |

时段边界测试建议固定 Asia/Shanghai：2026-10-26（周一）08:59:59 空闲、09:00:00 高峰、12:00:00 空闲、14:00:00 高峰、18:00:00 空闲；2026-10-25（周日）全天空闲。可再用 `2026-10-26T01:00:00Z` 验证 UTC 转换为北京时间 09:00 后采用高峰档。平台接收时间处于边界附近但无法确定时保守保留高峰估算，不声称与云账单精确一致。

### 预留、失败与并发预算

- **超时保留预留**：输入上界 4000、输出上界 1800，按高峰预留 `0.022400` 元。HTTP 客户端在服务端接收请求后超时，应将该请求标为待核对并继续占用这笔预算。重复读取任务、重启后台和页面刷新都不能释放它或自动重发。
- **已有实测用量但任务失败**：HTTP 200、usage 完整，但计划 JSON 解码失败或生成内容不合格，仍记录该次消耗；不能因为业务结果失败就把预算全退回。若响应中 usage 不完整，则标未知、保留预留。
- **同一请求幂等**：同一项目 requestKey 并发提交 6 次，只允许一笔预留和一次外部请求；完成结果重复回调、后台重启或重复导入 manifest 也不能多记费用。新 requestKey 仍需独立占预算。
- **跨用户共享预算**：共享同一平台凭证的不同本地用户必须在同一项目预算行锁下检查。假设图像已确认估算 `0.36` 元、已有预留 `9.50` 元，10 元限额仅余 `0.14` 元；两个并发请求各需预留 `0.12` 元，只能放行一个。第一个后为 `9.98` 元，第二个若放行将变为 `10.10` 元，应拒绝，且被拒绝者不得调用外部模型。
- **原子结算**：成功后在同一事务用实际估算替换该请求的预留，不能把二者同时累加造成重复占额，也不能先释放再写入留下并发空窗。使用 BigDecimal / 数据库 NUMERIC，避免二进制浮点误差。
- **未知型号或单价**：未配置可核实费率时应拒绝新收费调用或要求显式配置，不能默认采用 0 元。未知记录展示为待核对，不能伪装“费用已全量监测”。

### 开发生图记录导入

素材的请求记录以 `frontend/public/assets/guild-v2/manifest.json` 为最终来源。研究中曾读取到一次未确认的 hero HTTPError 记录，后续生成过程可能更新该文件，因此不得把旧的中间状态硬编码为最终消费。

若最终三条成功记录都确实有平台返回的 12000 Token，则历史导入预期为 `36000` Token、`0.360000` 元估算。逐条导入应保留原始 request_id、模型和状态，并用稳定唯一键防止每次服务启动重复导入。若某条 status 为 unconfirmed 或 tokens=null，则其金额属于未决预留；即使有图片文件或 estimatedCny，也不能冒充已观测平台 Token。公开素材 manifest 不放凭证、原始敏感响应或账号余额。

### 协议误读风险

1. 当前官方 **Chat Completions** 文档定义的是顶层 `usage`，并没有承诺 Chat 响应必定含 `tokenhub_usage`。前者提供 prompt/completion 分项；Seedream 的后者只保证 `total_tokens`。不能据图像协议要求 Chat 也存在相同分项。[Chat usage](https://cloud.tencent.com/document/product/1823/135872)、[Seedream 输出字段](https://cloud.tencent.com/document/product/1823/136609)。
2. 如果实际响应同时存在二者，只记录一次请求。文本费用优先用合法完整的 `usage.prompt_tokens` 与 `completion_tokens` 做分项估算；`tokenhub_usage.total_tokens` 可保留对账。若二者冲突，应标数据异常、保留原值与保守预留，不静默相加或覆盖。只有一个总量时，不能反推出输入/输出比例并声称准确费用。
3. 图像计费只对平台返回的整数总 Token 乘 10 元/百万。不要对 12000 Token 再乘图片张数；它已经是本次响应的总量。也不要把图像 Token 以文本输入/输出费率结算。
4. 用“平台返回用量”和“公开费率估算”描述账本；在没有云账单凭证时始终显示“平台实扣 / 余额未连接”。免费包或后付费结算的实际金额可能与估算不同。

## 本轮最终决定

2026-10-25：用户明确选择本轮不启用图像付费。三张PNG方案未执行成功；已采用原创矢量角色、史莱姆、小屋、奖励与家具完成视觉改造。图像调用开关默认关闭。两次失败请求无usage，保留0.24元待核对预留，非实扣；详情见项目 docs/release-v0.2.md。
