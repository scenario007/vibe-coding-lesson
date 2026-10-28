# 拖延勇者协会 v0.3 改版设计规格

日期：2026-10-28  
定位：冒险任务养成系统的产品逻辑、多模态素材和 Product Design 输入基线。

## 产品主线

用户把一件想做却一直拖延的事情交给协会。协会先把委托拆成少量可验证的里程碑，用户确认后开始冒险；每个委托都有一件只属于它的专属战利品。任务等级决定奖励的稀有度、装饰复杂度和展示场景的华丽程度。

核心循环：

```text
描述委托 → 选择任务等级 → 确认里程碑 → 完成阶段 → 生成/解锁专属战利品 → 布置据点
```

每日投入时间是可选信息。填写后只用于给计划建议节奏，不生成“每天 27 分钟”这类精确承诺；不填写时，系统只按里程碑和阶段顺序规划。

## 任务创建规则

### 三档任务等级

| 等级 | 适用场景 | 计划表达 | 奖励表现 |
| --- | --- | --- | --- |
| 日常任务 | 小行动、习惯、可重复事项 | 1–3 个轻量里程碑 | 实用小物、徽章、便签、钥匙扣；常见稀有度 |
| 挑战任务 | 需要专注和连续投入的目标 | 3–5 个阶段里程碑 | 有明显轮廓的装备、工具或纪念物；稀有稀有度 |
| 长期任务 | 学业、作品、长期生活目标 | 4–7 个章节里程碑 | 组合式装备、家具或场景核心物；史诗/传说稀有度 |

等级不是难度评分，也不改变用户的失败惩罚。它只决定计划颗粒度建议、战利品预算和展示层级。

### 创建页字段

1. 委托描述：必填，自然语言。
2. 任务等级：三选一，默认日常任务。
3. 每日投入时间：可选；空值表示“按当日状态灵活推进”。
4. 里程碑草案：由 AI 生成，用户可编辑、删除、合并并确认。
5. 地图模式：五选一，可稍后修改。
6. 专属战利品预览：显示奖励等级、名称草案、材质关键词和生成状态。

### AI 计划约束

- 输出阶段名、完成判据、建议顺序和可选节奏。
- 不输出每日固定分钟数，不把估计时间伪装成承诺。
- 每个阶段必须能由用户勾选完成。
- 用户确认前，计划和奖励都处于草案状态，不写入正式进度。

## 专属战利品系统

每个委托生成稳定的 `lootSeed`，由任务描述摘要、等级和用户确认时间组合而成；同一委托重试时沿用 seed，避免每次刷新换一件物品。

### 奖励生成分层

1. 文本层：生成名称、短故事、材质、颜色、轮廓类别和摆放建议。
2. 组件层：用项目内 SVG 奖励部件库立即渲染可用卡片，保证无图像接口时也能完成流程。
3. 场景层：若用户开启图像生成，调用课程允许的全景模型生成一间“战利品展示室”，把该物品作为唯一主角放进场景；详情页展示全景预览，不把全景文件当透明道具。
4. 收藏层：完成任务后锁定名称、故事、稀有度、组件参数和场景 URL，写入素材库，可放入自由据点。

奖励状态：`draft → queued → generating → ready → failed → fallback`。失败时保留文本和 SVG 奖励，界面明确标注“原创组件预览”。

## 史莱姆专注室

首版优先使用静态 SVG/PNG 状态图，状态只有 `idle / focus / rest / complete`。页面用 CSS 做轻微呼吸、压扁和弹起，用户关闭减少动态效果后退化为静态切换。

视频增强是可选层：使用 5 秒、720p 的 `hy-video-v1.5` 或可配置时长的 `kling-video-v3` 生成无文字循环片段。视频只作为背景氛围，不承载按钮、倒计时或任务信息；生成失败时自动回退静态图。

## 冒险地图模式

地图是任务级可选模块，创建时可选，之后可改：

| 模式 | 行为 |
| --- | --- |
| 进度打卡 | 每完成一个里程碑点亮一步，最清楚地反馈进度 |
| 剧情地图 | 里程碑对应章节和场景，完成后解锁下一段故事 |
| 据点解锁 | 用完成进度解锁据点装饰区域，不限制家具摆放 |
| 纯装饰 | 只显示地图插画，不参与进度与奖励 |
| 关闭 | 不显示地图，专注任务和战利品 |

## 自由据点与破烂补给铺

据点采用自由画布：家具通过拖拽、缩放、旋转和层级调整放置；不设置固定点位、网格吸附或数量上限。画布保存每件素材的 `x/y/scale/rotation/zIndex`，移动端提供底部素材栏和双指缩放。

破烂补给铺改成“定制工坊”：

```text
描述想要的家具 → 选择用途/尺寸/情绪 → 预览金币消耗 → 确认生成 → 素材入库 → 拖入据点
```

用户描述是主要输入，AI 只生成家具的名称、轮廓、材质、配色和摆放建议。首版用 SVG 模板组合落地；接入图片模型后，生成一张场景化家具展示图或单件素材，并保留结构化参数，保证换图后仍能编辑。

## 统一美术语言

### 关键词

`guild journal, imperfect hand-drawn ink, charcoal outline, warm parchment, dark red wax seal, muted olive green, faded blue accent, matte flat color, dry comic humor, sleepy tiny hero, pot-lid shield, soft slime, taped notes, paper grain, editorial spread, collectible artifact`

### 禁用词

`photorealistic, glossy 3D, cinematic game render, glassmorphism, neon cyberpunk, generic SaaS dashboard, baked text, watermark, logo, tiny unreadable UI copy, fixed furniture grid, forest-only background`

### 色彩和形态

- 底纸：`#F2E5C7`
- 炭黑：`#30281F`
- 暗红：`#A64534`
- 灰橄榄：`#73805A`
- 暖金：`#D4A33E`
- 稀有奖励可增加宝石蓝和紫色，但只占小面积。
- 外轮廓粗，内部线条细；奖励等级通过轮廓复杂度、装饰数量和局部高亮区分。
- 所有文字、按钮和状态标签由前端渲染，图片不烘焙文字。

## Product Design 输入

### 建议页面/画板

1. `01 Quest Composer`：描述委托、选择三档等级、可选每日投入时间、地图模式、确认计划。
2. `02 Loot Atelier`：战利品生成状态、稀有度对比、奖励详情和失败回退。
3. `03 Focus Room`：史莱姆静态状态、计时、暂停和可选循环视频。
4. `04 Free Base Canvas`：自由拖拽、缩放、旋转、层级和素材库。
5. `05 Custom Supply Shop`：自然语言定制家具、金币预估、预览、入库。
6. `06 Map Mode Sheet`：五种地图模式的选择和示例状态。

### 组件命名

`QuestTierSelector`、`MilestonePath`、`DailyTimeOptionalField`、`LootRarityBadge`、`LootGenerationStatus`、`SlimeStateCard`、`MapModePicker`、`FreeBaseCanvas`、`FurniturePrompt`、`AssetLibraryTray`。

### Product Design 视觉 brief

```text
Chinese adventure productivity app, guild journal and reluctant hero world,
warm parchment paper, charcoal hand-drawn outlines, dark red wax seals,
muted olive and faded blue accents, sleepy pot-lid hero, soft slime companion,
three quest tiers with visibly escalating loot rarity, broad milestone path,
optional map modes, free-form base canvas with loose furniture placement,
editorial journal spread, readable Chinese hierarchy, no baked text in artwork,
no generic SaaS dashboard, no glossy 3D, no rigid grid.
```

## TokenHub 调用模板

模型和 endpoint 必须先通过 `config/tokenhub-course-models.json` 校验。请求前先取得预算锁，成功后立即下载短期 URL，并记录返回的 `usage`；没有 usage 时记为待核对，不当作实扣。

### 战利品展示全景

课程允许模型：`hy-world2-panorama`  
Endpoint：`POST /v1/wand/hunyuan-image/world2-panorama`

```json
{
  "model": "hy-world2-panorama",
  "prompt": "360度环绕查看的废柴勇者公会战利品展示室；任务等级：挑战任务；专属物品：完成毕业论文初稿后获得的‘终于打开文档之剑’；物品是场景唯一视觉主角，折纸稿纸剑身、键盘按键护手、暗红披风挂饰、暖金微光；羊皮纸、炭黑手绘线稿、哑光平涂、灰橄榄和暗红配色；不出现任何文字、数字、UI、水印、人物脸部特写；保持可环绕查看的完整空间。"
}
```

用途是详情页的沉浸式展示和据点背景候选。它不作为透明 PNG 道具，也不替代 SVG 奖励卡。

### 史莱姆循环视频

课程允许模型：`hy-video-v1.5` 或 `kling-video-v3`。

```json
{
  "model": "hy-video-v1.5",
  "prompt": "公会手账风格的灰橄榄史莱姆在木桌旁缓慢呼吸，半睁眼努力专注，纸张和烛火轻微晃动，炭黑手绘线稿、哑光平涂、暖羊皮色背景、无文字、无水印、镜头固定、动作可无缝循环。",
  "aspect_ratio": "1:1"
}
```

提交后轮询 `/v1/wand/hunyuan-video/tasks/{task_id}`；成功从 `videos[0].url` 下载。若使用 Kling，提交参数放在 `settings` 中，并按返回的任务 ID 查询 `outputs[].url`。

### 文本层计划与家具参数

模型：`deepseek-v4.1-flash`  
Endpoint：`POST /v1/chat/completions`

系统提示必须要求返回严格 JSON：

```json
{
  "questTier": "daily | challenge | long_term",
  "milestones": [{"title": "", "doneWhen": "", "order": 1}],
  "loot": {"name": "", "rarity": "common | rare | epic | legendary", "silhouette": "", "materials": [], "palette": [], "story": ""},
  "furniture": {"name": "", "purpose": "", "shape": "", "materials": [], "palette": [], "placementHint": ""}
}
```

`dailyTimeMinutes` 可以为空；如果有值，只用于生成“轻松/标准/冲刺”的节奏建议，不得写入每日固定分钟计划。

## 费用和失败策略

- 文本、视频、全景图共用项目预算锁；当前总预算仍为 10 元。
- 默认先走文本和 SVG，只有用户开启生成且预算锁允许时才调用媒体模型。
- 视频和全景接口只提交一次，按任务 ID 轮询，禁止重复提交同一请求。
- 课程清单没有透明角色图或普通单件 PNG 模型，因此角色、奖励卡和家具卡继续使用原创 SVG；全景模型只做展示场景。
- 所有媒体结果进入素材库前必须记录模型、参数、请求时间、usage、估算/待核对状态和 fallback 原因。
