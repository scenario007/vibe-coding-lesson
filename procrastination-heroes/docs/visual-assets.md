# v0.2 公会素材来源

当前应用以原创 SVG 完成美术，未新增成功的 AI 图片。锅盖勇者六态、史莱姆四态在 `frontend/src/components/ui/AtlasSprite.tsx`，奖励十二种独立轮廓在 `RewardIllustration.tsx`，十二件家具在 `FurnitureIllustration.tsx`，小屋场景在 `pages/Base/components/RoomScene.tsx`。配色和纸面质感见 `frontend/src/index.css`。

用户本轮不启用图片付费。此前尝试的 Seedream Flash 无可用免费额度且未开后付费，图像调用已关闭；未产生可用PNG，manifest保留两次无usage失败请求的0.24元待核对预留，非实扣。原拟生成的提示词、费率核查和费用记录见同目录 art-direction-v0.2.md、tokenhub-image-research.md 和 release-v0.2.md。

旧版两张 imagegen 森林/木屋背景已从当前应用移除，其历史素材与提示词可在 Git v0.1.x 标签和工作区上级 docs/procrastination-heroes/visual-assets.md 查看。
