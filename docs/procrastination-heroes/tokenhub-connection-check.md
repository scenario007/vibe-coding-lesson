# TokenHub 接入检查（已更正）

检查日期：2026-10-24（用户时区 Asia/Shanghai）。

## 当前结论

**JSON 正式配置中的 API Key 可以使用。** 广州站点模型列表查询和 DeepSeek 文本生成均已实际成功。任务拆解与定制奖励名称的小型 JSON 输出也已验证。

先前结论不完整：第一次测试使用的是速查 TXT 顶部的一段独立字符串，遗漏了同目录 JSON 正式配置中的 `api_key` 字段。这两个值不同。TXT 值返回的 401002 不能代表 JSON 中的正式密钥无效，不需要基于该次错误要求用户更换有效密钥。

## 正确凭证来源与配置

正式配置：`/Users/maziqi/Desktop/大三上/无代码零基础软件制作/099-2024011160-马子奇.json`。

速查说明：`/Users/maziqi/Desktop/大三上/无代码零基础软件制作/tokenhub_student_quickstart.txt`。

| 项目 | 已核对内容 |
| --- | --- |
| 正式密钥字段 | JSON 的 `api_key`；不使用 `api_key_id` 代替密钥 |
| 站点 | `ap-guangzhou` |
| Base URL | `https://tokenhub.tencentmaas.com/v1` |
| 认证 | `Authorization: Bearer <JSON 中的 api_key>` |
| 已测试文本模型 | `deepseek-v4.1-flash` |
| 文本接口 | `POST /v1/chat/completions` |
| 模型列表 | `GET /v1/models` |

密钥仅由本机检测程序运行时读取，未打印或写入本记录、项目代码、命令参数或生成样例。

## 正式配置实测结果

| 测试 | 结果 |
| --- | --- |
| 查询模型列表 | HTTP 200，约 2.39 秒；目标文本模型为 online |
| 文本生成 | HTTP 200，约 3.32 秒；正常结束，finish_reason 为 stop |
| JSON 格式与业务字段检查 | 通过；包含 title、恰好两个步骤、reward_name |
| 本次文本 usage | 输入 78 token，输出 38 token，共 116 token |

测试返回：

```json
{
  "title": "整理书桌",
  "steps": [
    "清空桌面并分类物品",
    "擦拭桌面后归位摆放"
  ],
  "reward_name": "净桌小徽章"
}
```

请求模式：

```json
{
  "model": "deepseek-v4.1-flash",
  "messages": [
    {
      "role": "system",
      "content": "Return only a JSON object. Do not include markdown. Use exactly the keys title, steps, reward_name. steps must contain exactly two short Chinese strings."
    },
    {
      "role": "user",
      "content": "把整理书桌拆成两个小步骤，并取一个专属纪念徽章名称。"
    }
  ],
  "response_format": {"type": "json_object"},
  "thinking": {"type": "disabled"},
  "max_tokens": 256,
  "stream": false
}
```

这验证的是小型 JSON Object 输出及应用侧字段检查，不是复杂 JSON Schema 严格输出、完整项目长计划质量或所有模型功能的保证。实际延迟和用量随请求变化。

## 对项目的意义

可以按设计把 TokenHub 接到 services/ai，由后端读取密钥，请求任务拆解、行动清单、奖励名称、故事与视觉方案，再验证并交由用户确认。只在后端配置凭证，不放入前端构建变量或浏览器请求。

模型列表中有图像生成模型，但列表展示平台能力不等于所有模型都对本账户开放。奖励插画的具体调用权限、费用与质量仍未实测。本次没有提交图片、视频、音频或 3D 生成请求。

JSON 中的 quota 是配置额度，不是余额接口返回的实时剩余额度；不能将它表述为当前剩余量。此次只观察到 usage，没有查询账单或准确消费金额。

## 保留的初测记录

以下为使用 TXT 字符串的历史测试，已被正式 JSON 配置的成功结果纠正：

- `GET /v1/models`：HTTP 401 / 401002，请求编号 `4507b43b-f89f-4fec-add4-e175a2d3aecd`。
- `POST /v1/chat/completions`：HTTP 401 / 401002，请求编号 `42d90c30-912b-4e3a-a5c2-e424e28a955f`。

不基于这两个历史结果推断正式密钥失效、额度不足或需要重新申请。

## 官方来源

- [API 使用说明、地域与鉴权](https://cloud.tencent.com/document/product/1823/130078)
- [模型列表](https://cloud.tencent.com/document/product/1823/130051)
- [语言模型调用概览](https://cloud.tencent.com/document/product/1823/130079)
- [Chat Completions 参数说明](https://cloud.tencent.com/document/product/1823/135872)
- [错误码说明](https://cloud.tencent.com/document/product/1823/131595)
- [图像生成模型概览](https://cloud.tencent.com/document/product/1823/135744)

当前只完成接入检查，没有创建应用源码或部署资源。
