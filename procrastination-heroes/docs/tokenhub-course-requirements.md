# 课程 TokenHub TXT 核对与接入纠正

核对日期：2026-10-25。来源：用户课程目录的 `tokenhub_student_quickstart.txt`，已全文读取，不复制密钥。课程模型与接口快照见 `config/tokenhub-course-models.json`，其中保留源文件 SHA-256 供更新核对。

## 文件明确提供的要求

- 第7行：使用老师单独发给每位学生的 API Key。保持现有 JSON 凭证中的 Key，不因浏览器登录账号而替换。
- 第11–17行：广州地址 `https://tokenhub.tencentmaas.com/v1`，Bearer 鉴权。
- 第26–74行：列出当前开放的9项能力。其中图像能力为 **360°全景图**，模型 `hy-world2-panorama`，接口 `POST /v1/wand/hunyuan-image/world2-panorama`。
- 第246–259行：全景为同步接口，示例请求只有 model 和 prompt，成功主输出在 `data[0].super_resolution_image_url`。
- 第290–296行：402可能表示模型未开通、免费额度用完或额度不足；结果地址临时有效应及时保存；每个 Key 的 Token 配额为 **lifetime 累计配额**，不按天自动重置。

文件没有列出 Seedream Flash，也没有提供普通透明 PNG 文生图、角色图集或独立奖励贴图的模型。公开 `/v1/models` 返回 online 不能替代课程账号的已开通清单；文档列“当前开放”本身也不是一次成功调用的证明。

## 对当前项目的影响

原素材工具按 Seedream 的普通2K图像协议准备，因此与课程清单不一致。已在读取凭证、计费预留和外部请求之前加入课程清单检查，阻止继续使用清单之外的模型。默认检查模式会说明原因，不发起收费请求。

全景输出适合公会场景，不承诺透明背景，也不适合作为六态勇者图集或单件奖励图。不能只替换 model 名称，然后沿用 Seedream 的 size/background/b64_json 参数。

2026-10-25 核对的广州官方参考价为 **500,000 Token/张 × 10元/百万 Token = 5元/张**，约占用户本轮10元预算的一半。它与此前Seedream的0.12元/张不属于同一计费档位。此次仅检查文档与调用保护，**没有生成全景、没有新增费用预留或付费模型请求**。

当前保留原创矢量角色和奖励；后续如需全景场景，应独立实现对应请求、临时URL下载、500,000 Token的预算预留与实际usage对账，再在既有10元总上限内执行。不通过个人账号替课程Key开通服务。

参考：[官方世界模型协议](https://cloud.tencent.com/document/product/1823/136578)、[官方模型价格](https://cloud.tencent.com/document/product/1823/130055)。
