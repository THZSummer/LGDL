# Agent 基础能力调研（web-cli-base 孵化前置输入）

> **定位**：为 web-cli-base 未来孵化（F-14/v1.1 web-cli 生态线的 web 侧基础 agent 框架）做前提输入——调研主流 agent 框架应该提供哪些基础能力。
> **归属**：LGDL 项目调研体系（与 docs/research/edge-routing、archify 并列）。
> **日期**：2026-09-06
> **来源**：独立调研工作区迁移（/home/usb/wks/sddu/agent-capabilities-research/）

## 产出
- **SUMMARY.md** — 总汇总报告：能力矩阵 + 共识能力 + 差异决策 + 落地建议（web-cli-base 分层：MVP/增强/进阶/不做）
- `reports/01-opencode.md` — opencode（本地实测）
- `reports/02-pi.md` — pi（本地实测）
- `reports/03-dsh.md` — dsh（本地实测，DeepSeek 官方）
- `reports/04-other-agents.md` — Claude Code/Aider/Codex/Qwen/Gemini/Goose
- `reports/05-workbuddy.md` — WorkBuddy（腾讯系，生态市场）

## 调研对象（10 个框架）
opencode / pi / dsh / Claude Code / Aider / Codex / Qwen Code / Gemini CLI / Goose / WorkBuddy

## 一句话结论
10 个框架共识出 8 项 MVP 能力（read/write/edit/bash/grep/glob/subagent/todo）为内核；网络（web_search+webfetch）与权限门禁是 web 侧两大必补项；长期参照 dsh 插件化 + 三层任务体系，短期骨架 opencode 权限三元组 + agent markdown，扩展对齐 MCP + WorkBuddy 市场分发路线。
