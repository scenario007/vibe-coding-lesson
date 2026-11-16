# VocalLab V1 验证

## 环境与模型

验收使用 Apple M3（16 GB）、macOS 27.0.1、Python 3.13.5、PyTorch 2.15.0、audio-separator 0.48.0、FFmpeg 7.1.1、JDK 22、Node.js 24 和本地 PostgreSQL 18。媒体解码、模型推理与声学分析均在本机运行。Vite 生产构建保留 API 类名，浏览器实测了编译后的路由。

| 项目 | 已验证值 |
| --- | --- |
| 模型 | BS-RoFormer Viperx 1297 |
| 权重标识 | `model_bs_roformer_ep_317_sdr_12.9755.ckpt` |
| 权重大小 | 639,331,213 B（约 610 MiB） |
| SHA-256 | `5b84f37e8d444c8cb30c79d77f613a41c05868ff9c9ac6c7049c00aefae115aa` |
| 配置 SHA-256 | `2bfdd16c656bd9519aba757cc4f8834b7ede675eb1e00ec4772d74ae1c41af7f` |
| 推理参数 | 44.1 kHz 双声道，窗口 256 帧，overlap 4，batch size 1，pitch shift 0 |
| 使用设备 | MPS。运行支持 CPU 手动选择与 MPS 兼容异常回退。 |
| 权重分发与许可 | 由 audio-separator 注册表指向 UVR 模型发布页。该分发页未注明单独的权重许可证，项目和 Git 不附带权重。 |
| 代码许可 | audio-separator 以 MIT 分发。代码许可证与检查点的权利分别记录。 |

权重来源为 [UVR 模型发布](https://github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/model_bs_roformer_ep_317_sdr_12.9755.ckpt)，版本由 [audio-separator 模型清单](https://github.com/nomadkaraoke/python-audio-separator#usage-) 和本地 SHA-256 核验。分离库的代码许可证见 [audio-separator LICENSE](https://github.com/nomadkaraoke/python-audio-separator/blob/main/LICENSE)。BS-RoFormer 结构见 [原始论文](https://arxiv.org/abs/2309.02612)。

## 分离对 pYIN 的影响

使用 SigSep 发布的 MUSDB18 短样本 **Cristina Vane — So Easy**。对同一份约 6.80 秒的独立人声和三条伴奏 stem 求和后的伴奏，构造两档混音。伴奏相对人声的 RMS 比分别为 −5 dB 和 +5 dB。以清晰人声运行 pYIN 得到的 228 个有效帧作为比较基线。样本留在本机测试目录。 [SigSep 数据集与授权范围](https://sigsep.github.io/datasets/musdb.html) · [官方短样本资产](https://github.com/sigsep/sigsep-mus-db/releases/tag/v0.4.0)

| 伴奏相对电平 | 进入 pYIN 的源 | 基线帧中检出率 | 有效匹配帧 MAE | 有效匹配帧 ±50 cent | 全部基线帧 ±50 cent | 近八度误判 |
| --- | --- | --- | --- | --- | --- | --- |
| −5 dB | 混音 | 49/228（21.49%） | 1.02 cent | 100% | 21.49% | 0 |
| −5 dB | 分离人声 | 228/228（100%） | 0.22 cent | 100% | 100% | 0 |
| +5 dB | 混音 | 0/228（0%） | 不可用 | 不可用 | 0% | 0 |
| +5 dB | 分离人声 | 227/228（99.56%） | 0.40 cent | 100% | 99.56% | 0 |

清晰人声的 pYIN 输出是本实验的算法基线。近八度误判按误差 1150–1250 cent 统计，未检出的帧单独计入覆盖。分离主要改善了这个样本的人声可检出性。对其他歌曲、歌手、和声和录音条件仍需重新测量。单个短样本 MPS 分离约 24.5 秒。两档连续推理共用同一加载的模型，用时 50.3 秒，`/usr/bin/time -l` 报告峰值进程 footprint 约 3.11 GB。再次读取相同身份与参数命中缓存，测试确认未重做推理。

## 验收范围

- DSP 基础用例涵盖同曲、整体延迟、升一半音、增益变化、局部节奏变化、长静音、白噪声、不同旋律、人工偏移、颤音与慢漂移区分、纯人声旁路和分离错误。
- HTTP 用例涵盖 WAV、MP3、M4A、MP4、HEVC MOV、默认音轨、媒体偏移、破损或扩展名不符、无音轨、长度及容量限制、播放范围请求、真实 Worker、报告校验、手动重对齐和分离缓存。
- 真机媒体以 PhotoPrism 样本的 iPhone 12 mini HEVC/LPCM MOV 和 iPad mini HEVC/AAC MOV 验证原片上传、轨道识别、音频提取和分段访问。视频视觉数据未进入分析。 [PhotoPrism Apple 原片夹具](https://dl.photoprism.app/samples/Brands/Apple/)
- 浏览器在生产构建上从上传走完真实分析报告。另覆盖曲线缩放、A/B 对应时间跳转、播放、循环区间、手动重对齐、刷新恢复、分离音轨切换、上传错误和窄屏布局。

## 30 秒真实歌曲端到端

使用 Wave-U-Net 研究项目提供的 **Cristina Vane — So Easy** 的约 30 秒 MP3 示例。上传歌曲混音与同一录音的独立人声轨，选择各自前 30 秒。API 完成 MPS 分离、F0、时间对齐、报告和三轨播放。由同一分析重新对齐时命中缓存。该曲的配对比较结果为 282 帧、绝对音准命中率 98.94%、平均绝对偏差 6.56 cent。独立人声在整个选段中有 19.45% 的帧被检测为有效基频，报告因此将整体可信度标为中等。此数据检验分离和对齐管线；不同人重唱的音准阈值与可靠性仍需要另外采样验证。 [研究项目及公开试听文件](https://github.com/f90/Wave-U-Net-Pytorch/tree/master/audio_examples/Cristina%20Vane%20-%20So%20Easy)

最终回归通过 12 项 DSP 基础测试、1 项实际模型集成测试、5 项 API 测试和 3 项浏览器测试。额外用 1.5 秒真实混音强制 CPU 模式运行，确认两条音轨均成功输出。独立启动命令退出后，通过后续终端和无头浏览器验证前后端仍可访问。
