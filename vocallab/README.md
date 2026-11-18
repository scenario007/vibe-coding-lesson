# VocalLab V1

VocalLab 是在 Mac 上运行的歌唱分析工作台。上传歌曲原唱和自己的演唱，分别选择同一乐句对应的区间，即可对照音高轨迹、查看音准和稳定性指标，并复听对应音轨。

## 本机启动

本项目在 Apple Silicon 上开发和验证。需要 Node.js 20.19+ 或 22.12+、JDK 17+、sbt 1.10.1、PostgreSQL、FFmpeg/FFprobe、uv 和 Python 3.13。声音和报告保留在本机。

可用 Homebrew 安装开发依赖。

```sh
brew install ffmpeg openjdk@21 sbt node uv postgresql@18
export PATH="/opt/homebrew/opt/openjdk@21/bin:/opt/homebrew/opt/postgresql@18/bin:$PATH"
./scripts/setup.sh
```

快速分离使用 MDX-Net Kim Vocal 2（约 64 MiB），精细分离使用 BS-RoFormer（约 610 MiB）。可提前下载并校验所需权重。

```sh
./scripts/setup.sh --model fast
# 可选精细档
./scripts/setup.sh --model precise
```

双击 **Start.command**，或运行 `./.venv/bin/python scripts/launch.py start`。打开 [VocalLab](http://127.0.0.1:5188/)。启动命令会建立独立的本地数据库、编译 Scala、构建前端并启动服务。终端可以关闭。双击 **Stop.command** 停止，测试时也可运行 `./.venv/bin/python scripts/launch.py stop`。启动和处理日志在 `.local/` 中。

启动脚本为专用数据库生成本机密码。若手动使用已有的 PostgreSQL，请先创建数据库，然后设置 `VOCALLAB_DB_URL`、`VOCALLAB_DB_USER` 和 `VOCALLAB_DB_PASSWORD`。使用开发热更新时，在 `backend/` 运行 `sbt run`，在 `frontend/` 运行 `npm run dev`，并配置同一组环境变量和端口。预览采用前端同源代理。

## 分析与复听

1. 上传两份 WAV、MP3、M4A、MP4 或 MOV 文件。视频会自动选择标记为默认的音轨，或在缺少标记时选择首条音轨。
2. 用时间轴或秒数分别选择片段。上传文件无固定时长上限，仍需符合文件大小限制。新上传默认选择前 30 秒，每条轨可选最长 5 分钟。选取两份录音里的同一段主歌或副歌，避开过长前奏和静音。清唱或已分离音轨可跳过人声分离。
3. 原唱默认启用分离。带伴奏的录音也可启用；清唱取消勾选即可跳过。分离失败时可返回编辑片段或改用干净人声。
4. 报告显示实际执行阶段、有效帧和分析可信度。曲线用淡虚线提示低可信度的候选音高和句内短缺口的连线。只有两侧音高接近且音频没有明显停顿时才连接，这些补线不计入音准评分。单击曲线播放或暂停，水平拖动定位。播放线固定在绘图区中央，曲线和时间刻度随播放移动。可勾选原唱、翻唱或两轨同时听。点击片段观察会定位并选中相应的复听区间。
5. 有人声分离时，可在声谱图选择原始选段、分离人声或分离伴奏。在时间对齐栏设置原唱起止时间后，可用选区重新检测固定偏移，也可以直接手动输入秒数。可靠的检测选区会用于同一对音轨、相同裁剪起点且仍覆盖该选区的新报告。选择「用开头自动检测」会清除记住的选区。新分析默认只取两段选段的开头，最长 30 秒，用这个范围求固定偏移，完整选段仍可分析和复听。正值表示翻唱相对原唱选段更晚。波形包络、音高和双轨播放使用同一个偏移。

快速预览会在人声轨就绪后逐条显示谐波基频曲线，可缩放、拖动定位和单击播放或暂停。快速基频绘图区加高一倍，左侧在原有音域内标出 C、D、E、F、G、A、B。纯人声模式直接处理上传音轨，含伴奏模式先完成所选分离模型。正式报告默认沿用快速曲线，可以切换到「音高复核（pYIN）」查看经过置信度筛选的曲线。快速曲线结合相邻帧、独立谐波峰值和音频波形的重复周期来校正误判。两端音高接近且中间仍有能量时，可用淡虚线连接约 80 毫秒以内的短缺口。停顿和较长缺口保留留白，声谱图显示实际估计的基频点。音准分只采用快速基频中的可信实测帧。旧报告可以从缓存音轨补算证据。

音高曲线和声谱图从 C3（约 130.8 Hz）开始显示。声谱图默认只显示当前所选分析音轨的人声基频，淡色表示候选或谐波估计，亮色表示报告有相近的可靠测量。完整声谱视图可查看原音、分离人声和伴奏的频率能量。指向图上可读数，点击可定位。长片段分段显示。

### 快速基频音准分

按原调以 100 分制比较两轨的可信实测音高，并显示评分选区、可判定音符和逐段结果。用户明确选择了对齐选区时，评分使用该区间。默认开头检测用于估计偏移，评分仍使用完整选段。音高偏差在 20、50、100、200 音分时分别对应 100、75、35、0 分，中间线性插值。单个音符按有效稳定段评分，权重最长计 0.8 秒。原唱休止跳过，翻唱确认静音且原唱可信时记为漏唱，基频模糊和八度存疑处留待复核。总分至少需要 5 个可判定音符，且音符和片段覆盖率均达到 60%。点击片段或展开音符明细可复听对应位置。

初次分析时复用快速基频结果。已有报告首次点「计算快速基频音准分」时，旧版预览缺少质量信息就用缓存音轨补算一次。后续调整偏移会复用证据并自动更新评分。pYIN 曲线可供独立复核。

### 查询同步歌词（选填）

上传原唱后展开「查询同步歌词」，输入歌名，可加歌手缩小范围。从结果中选与你的原唱相同的版本。候选会按原唱完整文件时长排序，剪辑、现场版和有额外前奏的录音请手动核对。报告也可以直接查询和更换版本。

报告把同步歌词放在音高曲线的时间刻度下方，随原唱时间轴向左移动并高亮当前句。点击一句可跳到对应时间。整体偏早或偏晚时可在报告调整「歌词偏移」，正数让歌词晚出现。找不到带时间轴的版本时仍可使用音频对比。

查询由后端调用 [LRCLIB 公开 API](https://lrclib.net/docs)，搜索只发送歌名和歌手，选定后按记录编号取 LRC。歌曲时长排序、歌词解析和录音处理在本机完成。所选歌词与偏移保存于当前浏览器标签页，刷新或用相同原唱重新对齐时可以保留。

## 项目结构与数据流

- `frontend/` 使用 React、TypeScript、Vite、Tailwind 和 React Router。页面就近组织组件、状态和纯计算，API 按分析服务组织，并用 Zod 校验返回数据。
- `backend/` 使用 Scala 3、Cats Effect IO、http4s、Circe、JDBC 与本地 PostgreSQL。按 Course Fullstack Skill 的 `services/`、独立 `APIMessage.plan(connection)`、领域对象与传输对象、声明式路由及 Table 归属组织。
- `dsp/vocallab/` 是独立 Python CLI。模块分别负责裁剪、重采样、分离、pYIN、对齐、指标与片段观察。Python 通过文件与标准输出接收和返回结构化数据。
- `scripts/` 存放启动、配置与验证脚本。依赖锁文件记录 Apple Silicon / Python 3.13 的可复现环境。

上传以流式写入 UUID 目录。Scala 用 FFprobe 获取媒体信息，FFmpeg 完整解码所选音轨并生成保留时间戳的 FLAC 预览。分析任务写入 PostgreSQL，由单个后台执行器依次领用。含伴奏音轨先加最多 3 秒前后文，再以 44.1 kHz 双声道进入分离。分析端裁回选区，转为单声道后估计基频。Scala 在任务标为完成前验证报告的数据形状、映射单调性和数值范围。浏览器通过范围请求播放 WAV，参考时间、演唱时间和原始媒体时间分开计算。

端点由消息名移除 `Message` 后转小写。JSON 接口统一接收 `X-VocalLab: 1`，上传使用原始二进制请求体及 URL 编码的 `X-File-Name`。编译产物保留前端 API 类名，供同一命名规则使用。

| 方法与路径 | 用途 |
| --- | --- |
| GET `/api/getmedialimitsapi` | 上传与片段限制 |
| POST `/api/uploadmediaapi` | 校验并上传媒体 |
| GET `/api/getmediaaudioapi/{mediaId}` | 试听上传文件的原始音轨 |
| POST `/api/createanalysisapi` | 提交两份片段选项与可选时间偏移 |
| POST `/api/getanalysisapi` | 读取任务状态 |
| POST `/api/getanalysisresultapi` | 读取已完成分析 |
| POST `/api/adjustalignmentapi` | 复用已处理音轨和基频，原地更新报告的固定偏移及比较结果 |
| POST `/api/scorepitchapi` | 为已完成的报告读取或补算快速基频音准分 |
| GET `/api/getanalyzedaudioapi/{analysisId}/{reference\|user}/{original\|vocals\|instrumental}` | 流式播放对应选段 |

## 模型、指标和局限

分离使用 `audio-separator 0.48.0` 与 `torch 2.15.0`。快速档采用 ONNX，支持 Core ML 与 CPU。精细档使用 PyTorch MPS 并可回退到 CPU。可以显式指定 `VOCALLAB_DEVICE=cpu`。同一文件摘要、音轨、区间、模型及推理参数复用分离结果。前后端启动和录音分析都在本机，首次安装、模型缓存预热、可选测试样本下载与手动查询歌词需要联网。

对齐从已处理的人声或所选分析音轨读取音频，以 15 ms 间隔提取平滑对数 RMS、能量差分、宽频带谱通量及演唱活动包络。用 SciPy FFT 计算有效重叠内的加权归一化互相关，融合各特征的候选，并检查次峰和特征一致性。默认搜索 ±3 秒，可在启动环境中设置 `VOCALLAB_ALIGNMENT_SEARCH_SECONDS`。长停顿、重复节奏、伴奏残留和速度漂移会降低可信度。低可信度的候选仍可复听确认。

`offsetSeconds` 是选段内的秒数差，满足 `t_user = t_reference + offsetSeconds`。`originalOffsetSeconds` 另加上翻唱裁剪起点与原唱裁剪起点之差。报告使用同一个固定偏移平移翻唱包络和 F0；播放保持原速。自动重测仅重新提取轻量对齐特征，手动微调直接用缓存 F0 重算比较。首次分析的 pYIN 每约 20 ms 估计一帧；有效音高覆盖不足时，仍可按时序复听。绝对音准保留实际移调差异，整体移调补偿后的命中率另行显示。

模型出处、参数、用量和逐项实测见 [验证记录](docs/verification.md)。

## 环境变量与保留周期

| 变量 | 默认值或含义 |
| --- | --- |
| `VOCALLAB_FRONTEND_PORT`、`VOCALLAB_PORT`、`VOCALLAB_DB_PORT` | 5188、8818、5447 |
| `VOCALLAB_ROOT`、`VOCALLAB_PYTHON` | 项目目录、项目内 `.venv/bin/python` |
| `VOCALLAB_DB_URL`、`VOCALLAB_DB_USER`、`VOCALLAB_DB_PASSWORD` | 使用自有本地 PostgreSQL 时指定 |
| `VOCALLAB_DATA`、`VOCALLAB_MODELS` | `.local/run`、`.local/models` |
| `VOCALLAB_UPLOAD_MIB`、`VOCALLAB_MAX_CLIP` | 150 MiB、300 秒（每条轨的分析选段） |
| `VOCALLAB_WORKER_TIMEOUT` | 单任务 DSP 进程默认最多 3600 秒 |
| `VOCALLAB_MEDIA_HOURS`、`VOCALLAB_CACHE_DAYS` | 已完成与失败报告及闲置媒体 72 小时、分离缓存 14 天 |
| `VOCALLAB_DEVICE` | `auto` 或 `cpu` |
| `VOCALLAB_F0_RATE`、`VOCALLAB_F0_MIN`、`VOCALLAB_F0_MAX` | 22050 Hz、65 Hz、1050 Hz |

后台保留与当前报告或任务关联的文件，过期后按任务、媒体、已分离缓存依次清理。选段音轨用于报告复听，原始上传保存在媒体目录。关闭程序后，本机数据仍在。需要清理全部本机数据时，先停止服务并自行删除项目的 `.local` 目录。权重、测试录音、配置、数据库和构建产物均通过忽略规则留在本地。

## 自动验证

```sh
(cd dsp && ../.venv/bin/python -m pytest -q -m 'not integration')
(cd backend && sbt compile)
(cd frontend && npm run build)
./.venv/bin/python scripts/api_test.py
(cd frontend && npx playwright install chromium && npm run test:e2e)
```

后两项需要启动本地服务。下面的命令使用公开的真实歌声样本。

```sh
./scripts/fetch_song_fixture.sh
project="$PWD"
VOCALLAB_REAL_API_FIXTURES="$project/.local/fixtures" ./.venv/bin/python scripts/api_test.py
(cd frontend && VOCALLAB_REAL_API_FIXTURES="$project/.local/fixtures" npm run test:e2e)
(cd dsp && VOCALLAB_MODEL_TEST=1 VOCALLAB_FIXTURES="$project/.local/fixtures" \
  VOCALLAB_MODELS="$project/.local/models" PYTORCH_ENABLE_MPS_FALLBACK=1 \
  ../.venv/bin/python -m pytest -qs -m integration)
```

若有可使用的手机原片，可用 `VOCALLAB_PHONE_FIXTURE=/absolute/path/to/recording.mov` 追加原片上传回归。
