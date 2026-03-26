# 败北条件系统 & 规则引擎

## 三种败北机制

| # | 类型 | 顺序语义 | 公告（publicLog） |
|---|------|---------|-----------------|
| 一 | 主人公死亡 | 先结束轮回，再败北 | "你们死了，轮回立即结束" → "你们失败了" |
| 二 | 即时败北条件达成 | 先败北，再结束轮回 | "你们失败了，轮回立即结束" |
| 三 | 轮回结束时败北条件 | 轮回自然结束后检查 | "此次轮回结束，你们失败了" |

### 日志可见性
- **publicLog**（所有玩家可见）：通用败北公告
- **fullLog**（仅剧作家可见）：具体败北原因

### 重复触发
- 已败北后，后续败北条件不再重复触发
- 轮回结束时即使其他条件也满足，不会额外产生日志

## 规则引擎

### 架构

```
Domain 数据层 (RuleAtomRecord)
    ↓ 数据
规则执行层 (ruleEngine.ts)
    ↓ 调度
Phase 编排层 (phases.ts)
```

### 核心 API

| 函数 | 用途 |
|------|------|
| `registerProcessor(proc)` | 注册规则处理器 |
| `setActiveRules(rules)` | 设置当前剧本的活跃规则 |
| `resolveTimingWindow(G, timing)` | 执行指定时序的所有规则 |

### 时序窗口

`loop_start` → `day_start` → `card_resolve` → `mastermind_ability` →
`goodwill_window` → `incident_check` → `incident_resolve` → `day_end` →
`loop_end` | `always`

### 模组解耦
- 引擎不硬编码任何模组规则
- 具体规则处理器由 `scriptAdapter` 在加载剧本时动态注册
- 注册数据来自 domain 层的 `PlotRecord.rules` 和 `RoleRecord.rules`

## 文件结构

```
packages/game-logic/src/
  ruleEngine.ts        ← 规则引擎骨架（注册表 + 调度）
  lossConditions.ts    ← 三种败北 API
  game.ts              ← 状态字段（hiddenRoles, activePlots 等）
  phases.ts            ← loop_start/loop_end 时序调度
  index.ts             ← 公共导出
```
