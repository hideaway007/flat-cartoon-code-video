# 默认旁白：第③版「紧凑短视频叙事」

用户于 **2026-11-09** 试听三种风格及无提示原版后，明确选择第③版，今后的新旁白默认固定使用。

- 模型：`gemini-3.8-flash-tts`。
- 音色：`Fenrir`，自然美式英语，同一讲述者身份。
- 表演：紧凑、有冲击力的叙事；动作词重音清楚，音调灵活，情绪快速切换，惊讶和讽刺有反差，角色对话通过态度区分；不喊叫。
- 语速：保留模型原生输出，不做后期变速。103 词试听为 34.76 秒，约 **177.8 词/分钟**；178 只是估算依据，不要求模型锁速。
- 配置标识：`compact-shortform-v3`，记录在新项目的 `manifest.json` 中。
- 通用表演提示唯一来源：[narration-compact-v3.txt](narration-compact-v3.txt)。`narrate.py` 直接读取它，项目中保存一份实际使用的 `style.txt`。

提示保留第③版的叙事节奏与表演规则，把试听稿里特定的国王、农夫及台词改为可复用指令。参考的是表达方式，不复刻博主的个人声音。除非用户明确要求，不恢复旧的 165 词/分钟提示、无风格提示原版或其他音色。

## 使用

```bash
python3 $K/narrate.py <project> --prepare-only
python3 $K/narrate.py <project>
python3 $K/narrate.py <project> --status
```

`<project>` 换成实际工程路径，不输入尖括号。先核对章节、纯英文正文及 `production/tts/style.txt`，再提交配音。

- 输入：`production/script.md`（`## N Title` 章节标题，` | ` 前是旁白），或 `--texts <dir>` 指定按文件名排序的纯英文 `.txt` 文件。每章一请求，超过约 3,500 字节会在句末拆分。
- 混有中文对照、审稿说明的稿件先导出纯英文。当前解析器会读章节内未排除的普通行，不可直接提交双语审稿文件。
- 输出：`production/tts/` 中保存章节文本、原始 `NN_<title>.raw.wav`、仅裁首尾静音的章节 WAV、`style.txt` 和 `manifest.json`。章节间默认留 0.6 秒，合成为 `assets/audio/narration.wav`。
- 若 `narration.wav` 不是此工具生成的，会先移入 `production/tts/replaced_<time>_narration.wav` 保存。
- 认证：`gcloud auth print-access-token`。项目编号依次来自 `--gcp-project`、`GEMINI_TTS_PROJECT`、Skill 的本机 `local.json`、gcloud 默认项目；不在公开文件内记录个人项目编号。
- API：Vertex `aiplatform.googleapis.com/v1/projects/<p>/locations/global/publishers/google/models/gemini-3.8-flash-tts:generateContent`；正文与 `speechMetadata.style` 分开，声音用 `speechConfig.voiceConfig.voice` 指定。

## 已有项目与风格缓存

已有 `production/tts/manifest.json` 会保留当时的表演提示。若与当前请求的风格不同，生成或准备会停止并说明原因，避免更新了 Skill 却继续生成旧风格，或混用新旧章节。

- `--status` 仍可检查旧项目；`--join-only` 仍可合并已经生成的旧章节。
- 需要把旧项目整体改为第③版时，先归档原有 `production/tts/`，保留旧音频与清单，再重新准备并生成整套章节。不要覆盖或静默重发旧请求。
- 此次更新不自动重配已有成片，也不修改用户稿件。

## 节奏与例外

- 默认 `--wpm native`：只裁首尾静音，不改变句内速度和停顿。以各章实测时长和 `--status` 的 wpm 为准，不承诺每篇都恰好 178 词/分钟。
- 以约 178 词/分钟估算，1,700-2,300 词约 10-13 分钟，另计额外画面留白。严肃或死亡段落应尊重稿件要求，避免把紧凑风格演成不合适的戏谑。
- 自定义 `--style file` 仅在用户明确要求时使用；兼容的 `{wpm}` 占位符填入估算值 178，默认提示本身不含数值词速要求。表演指令不改写旁白正文。
- 仅用户明确要求固定词速时使用 `--wpm N`，它会对保存的原始音频做 `atempo`。`--wpm native` 可恢复原生速度；变速系数超出 0.85-1.20 会标记。
- 已提交但未保存结果或出错的章节不会自动重发；先检查再显式 `--retry NN`，避免重复计费。
- 预置音色加表演提示，每次输出可能有细微差异。报告实际生成、测量和检查的结果，不声称进行了人工逐字试听。
