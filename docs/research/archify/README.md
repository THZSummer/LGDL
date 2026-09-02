# Archify 使用与研究资料

> archify 绘图工具的使用与研究资料——LGDL 全景项目两轮实战（8 图 + V2 6 图）沉淀
> 日期 2026-09-02 · 分支 `feature/group-as-node`

## 一句话定位

> **archify 是 Agent-first 的「架构图即代码」确定性渲染工具（5 种图类型，IR → 校验 → 编译 HTML），本项目以双全景实战验证其确定性、门禁与修复闭环，并对其布局/走线机制做源码级研究。**

## 目录

| 文件 | 内容 |
|---|---|
| [archify-guide.md](archify-guide.md) | 使用指南：五图类型 / 工作流 / 验证与交付 |
| [archify-usage-report.md](archify-usage-report.md) | 使用体验报告 v1.2：两轮实战 + 痛点与改进建议 |
| [archify-layout-secrets.md](archify-layout-secrets.md) | 布局与走线机制揭秘 v1.1：源码级分析 + 两次实测回验 |
| [lessons-for-lgdl.md](lessons-for-lgdl.md) | 深度研究：给 LGDL 的借鉴与规避清单（验收闭环/工程收据借鉴 + 手排陷阱/约束后置规避） |

## 相关现状

- 工具源码位于 `.opencode/skills/archify/`（随 skill 分发，本目录只存研究资料）
- LGDL 自研对照：`docs/research/edge-routing/lgdl-router-current.md`（确定性渲染同路线互鉴）
