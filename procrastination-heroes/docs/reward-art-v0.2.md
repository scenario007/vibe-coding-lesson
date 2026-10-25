# 公会奖励矢量素材 v0.2

新增组件：`procrastination-heroes/frontend/src/components/ui/RewardIllustration.tsx`。

## 素材与参数

`RewardIllustration({ symbol, palette, className, compact, title })` 输出自适应 SVG，viewBox 为 160 × 160，无固定像素尺寸。默认 `className="h-full w-full"`，可以直接放入原 Emblem 的尺寸容器。外层容器和奖励状态仍由主页面维护。

- 旧图案兼容：lamp、leaf、star、book、camera、mountain、moon、flower、cloud。
- 新图案：sword（稿纸剑身与键帽护手）、shield（有补丁的锅盖盾）、scroll（封蜡委托卷轴）。
- 配色兼容：sage、gold、lavender、rose、sky；未知值退回 sage。保留统一炭黑线、羊皮纸、暗红与黄铜色，配色改变物件的重点部件。
- 默认无障碍行为为装饰图 `aria-hidden`；传入 `title` 时作为带说明的图片，不再隐藏。
- `compact` 隐去细密刻痕并增加主描边，适合小图标使用；常规卡片与图鉴使用完整细节。较小尺寸应保证外层已有清晰文本。

## 十二种不同轮廓

稿纸剑、锅盖盾、封蜡卷轴、关节台灯、裂纹陶盆植物、星形绶带奖章、绑带笔记本、复古相机与相片、雪山玻璃罩、月亮小夜灯、胶带花瓶和困倦天气罐。

插画用平涂、轻微不规则几何、不同材质分层、轮廓线和局部刻痕，支持从普通卡片到 180px 图鉴的缩放。没有滤镜、外部纹理、动态生成 ID 或新增依赖。

## 与 AI 的边界

这些是仓库内绘制、可组合的受控矢量模板。AI 可决定图案、配色、奖励名称和故事；每个任务并非独立调用图像模型生成新图。页面应继续标注“任务定制 · 公会插画模板”，不能标为“独立 AI 插画”。本次组件制作未调用模型接口，TokenHub 费用为零。

主角、史莱姆和场景栅格素材另行制作，本组件用于共享奖励图形体系，不能替代角色和场景图片。

## 接入示例

```tsx
<RewardIllustration symbol={symbol} palette={palette} compact={size === 'small'} />
```

新增三种图案的前后端枚举、AI 输出约束以及外层 Emblem 接入由主代理统一修改，本子任务没有改动这些文件。

## 验证

已运行组件 Prettier 格式化和前端 `npm run typecheck`，均通过。将 12 个实际 React SVG 渲染为 4 × 3 总览，逐项目视检查了轮廓、配色、笔触与边界；没有裁切或缺失图案。临时总览位于 `/private/tmp/heroes-reward-art-v0.2.png`，未加入项目源码。

## 商店家具独立插画

新增 `procrastination-heroes/frontend/src/components/ui/FurnitureIllustration.tsx`，接口为 `FurnitureIllustration({ itemId, className? })`。默认类名 `h-full w-full`，160 × 160 viewBox，自适应尺寸且默认 `aria-hidden`。

支持十二个真实物件：lamp 关节台灯、plant 陶盆绿植、desk 勇者书桌、rug 星星地毯、chair 软垫座椅、painting 山间纪念画；lamp2 月光小夜灯、plant2 铃兰花瓶、desk2 橡木工作台、rug2 森林圆毯、chair2 云朵椅、painting2 灯塔画。

椅子都有座垫、扶手和椅脚，书桌有桌面、抽屉和桌腿，地毯采用透视与边缘流苏，画作使用画框和实际风景。两种同类家具分别绘制不同轮廓，不再借用奖励 cloud/book 等符号。未知 itemId 退回木箱图形，便于开发时识别缺失映射。

本组件同样只用仓库内原生 SVG，无模型调用、无费用。已运行 Prettier 与 TypeScript 检查，将十二件实际 React SVG 渲染为总览并目视检查通过；临时预览 `/private/tmp/heroes-furniture-art-v0.2.png`。
