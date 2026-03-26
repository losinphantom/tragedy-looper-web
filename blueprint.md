# 惨剧轮回 (Tragedy Looper) Simulator 项目蓝图

**版本**: 1.3
**日期**: 2026-03-25
**状态**: 当前态（基于 Phase 6-20 重构与语义审计收敛）

## 1. 项目愿景与结构

本项目是一个基于 `boardgame.io` 的《惨剧轮回》在线模拟器，目标不是只把当前官方内容跑通，而是把"规则定义、模组装配、剧本内容、共享语义、前端表现"拆成可长期扩展的稳定结构。

### 1.1 Monorepo 分层

- `apps/server`
  - 房间生命周期、同步、Lobby、服务端 authority、服务端视图过滤
- `apps/tl-simulator`
  - React 前端、棋盘与手牌交互、动画、runtime interaction 可视化
  - 核心生态：`vite` + `tailwindcss` + `framer-motion` (结算演出) + `@dnd-kit/core` (卡牌拖拽) + `zustand` (UI状态) + `radix-ui` (无障碍交互) + `sonner` (反馈) + `clsx`/`tailwind-merge` (样式合并，`cn()` helper)
- `packages/domain`
  - 静态定义真理源；存放角色、身份、事件、阴谋、模组、剧本及其定义引用
- `packages/game-logic`
  - 前后端共享状态机；负责 timing windows、moves、phases、shared semantic kernel、runtime interaction 契约
  - 辅助栈：`zod` (运行时 move payload 校验)
- `packages/rules`
  - 规则验证、视图过滤、可玩性校验等宿主外侧规则逻辑
- `docs/`
  - 规则知识、架构文档、审计与迁移记录
- `.planning/`
  - 当前标准 planning 真理源；`PROJECT/REQUIREMENTS/ROADMAP/STATE/phases` 全部在这里维护

## 2. 当前架构结论

### 2.1 不可变定义与运行时分离

- `packages/domain` 是静态内容与定义层真理源
- `packages/game-logic` 只消费已解析的定义与运行时状态，不应承担内容层文本和模组专有知识的长期存放
- 新增规则对象的推荐路径是：`definition -> manifest reference -> script assembly -> runtime use`

### 2.2 公共层只保留共享语义

公共层的职责应收敛为：

- 固定 timing windows
- authority 与 phase gate
- token / death / reveal / world shift / usage mark 等共享语义原语
- 可序列化、跨端一致的状态转换

公共层不应继续增长为：

- 模组专有 `setId` 分支集合
- 按 abilityId / incidentId / roleId 硬编码的共享巨型执行器
- 前端展示语义与剧情文案仓库

### 2.3 Module 是装配层，不是宿主巨石的别名

- `officialModuleManifests` 是当前 live assembly 主入口
- module manifest 负责声明"本模组装配哪些对象、hook、descriptor、registry entry"
- module 不应继续回退成"把共享巨石拆成多个共享巨石"的别名

已稳定的 module 侧装配点包括：

- lifecycle hooks
- interaction descriptors
- processor collection / manifest-first aggregation

## 3. 规则对象与 ownership 边界

### 3.1 当前推荐的 ownership 方向

- `character`
  - 角色实体、角色友好能力 execute 等 character-owned 行为
- `role`
  - 身份后效、role-owned hook、与角色本体解耦的身份规则
- `incident`
  - 事件定义、触发/效果逻辑、目标与可见性约束
- `plot`
  - 阴谋定义与相关规则对象
- `module`
  - 装配边界、资源池、对象清单、module-scoped hook
- `script`
  - 最终装配器；决定具体剧本使用哪些 module 资源、definition 引用和内容组合

### 3.2 残留过渡态

- `pendingIncidents` 仍保留为 shadow compatibility，不应作为新功能真理源
- 部分 processor body 仍通过 catalog/filter 过渡

## 4. Runtime Interaction 与状态边界

### 4.1 Runtime Interaction 是人工交互契约层

前后端人工交互应统一围绕：

- `pendingInteractions`
- `activeInteractionId`

前端从 runtime queue 派生具体面板与显隐逻辑；不要再为 goodwill / incident / butterfly 单独维护平行状态机。

### 4.2 后端主状态源与投影关系

后端允许存在少量"主状态源 -> runtime queue 投影"的双层结构，例如：

- `pendingAbilities`
- `goodwillInteraction`

但这些主状态源的存在前提是：

- 由后端严格控制
- 前端不直接把它们当主读路径
- 最终仍通过 runtime queue 对外暴露

### 4.3 Legacy shadow 纪律

允许短期保留 shadow state，但必须满足：

- 只做兼容，不做新功能真理源
- 不新增前端对 shadow 的直接依赖
- 在后续 phase 中有明确退场方向

## 5. 可见性与 `playerView` 契约

`playerView` 是显式契约层：

- 剧作家视图可以看到完整秘密状态
- 主角与 seat 私有视图只能看到授权后的 payload
- 公共日志不能泄露 hidden truth、internal reason、隐藏身份因果

已经明确不能再向非剧作家暴露的典型信息包括：

- `castDefinitions`
- `originalRoles`
- `revealedRoleMemory`
- 非授权 seat 的 `detectiveGuesses`
- 带隐藏因果的 `triggerStatus.reason`

## 6. 能力执行边界

能力执行边界已稳定为：

- **character-owned execute**：`characterOwnedGoodwillHandlers` 是角色友好能力的唯一入口；`owned-goodwill/*.ts` 是角色能力落点
- **role-owned post-resolve / hook**：身份后效通过 roleProcessorCatalog + flag/查询函数导出
- **module-owned assembly**：module manifest 只承担装配职责
- **core-owned shared semantic kernel**：token / death / reveal / world shift 由 core 提供

已通过的语义审计：
- 角色友好能力 Phase 18 全面修复（34✅/1⚠️/0🔴）
- 事件效果 Phase 19 语义核对（51 处理器 48✅/1⚠️/0🔴）
- 身份后效 Phase 20 语义核对（55 处理器 52✅/3📋）

## 7. 规划与工作流约束

- 当前 planning 真理源是 `.planning/`
- 继续工作前优先读取 `.planning/ROADMAP.md`、`.planning/STATE.md` 与当前 phase 文档
- 在本 linked worktree 内使用 `npm run gsd:progress` / `gsd:next` / `gsd:doctor`
- 外部 stock `gsd-tools` 因 worktree root 解析会跳到主仓根，不直接代表本项目当前 planning 状态

## 8. 当前不该回退的结论

- 不回退到 full catalog arrays 直拼作为 live assembly 主路径
- 不回退到 `phases.ts` / `moves.ts` 中的模组硬编码分支扩张
- 不回退到把 `playerView` 当作"事后删字段"而非显式契约层
- 不回退到把新增能力继续塞进共享 giant switch 作为默认做法
- 不为 `.planning` 再维护一套平行 `.gsd` 真理源

## 9. 已完成的语义审计链

- Phase 14：官方模组 manifest 接线补完（processors、scriptIds、hooks 全部收口）
- Phase 15：结算模式语义重做（autoResolve 半自动化 + day_end 强制能力队列）
- Phase 16：里程碑证据回填（Phase 1-4、10、11、13 审计缺口关闭）
- Phase 18：角色友好能力全面修复（34/1/0，交互化 + Bug 修复 + 架构清理）
- Phase 19：事件效果语义核对（51 个处理器 48/1/0，灭绝之火 key 修复、廷达罗斯消费端实现）
- Phase 20：身份后效语义核对（55 个处理器 52/3，ll_eccentric_day3 实现、管线重复排查）

## 10. 后续演进方向

- Phase 21：阴谋规则（Plot / 规则X / 规则Y）语义核对与修复
- Phase 17：桌面交互与隐藏队列行为的人工验收收口（延后处理）
- 里程碑归档：v1.0 milestone audit + closeout
- 未来方向：官方模组演进为 `mods-official`、`mod-sdk` 设计、联机全流程验证、移动端适配

这份蓝图描述的是"现在系统应该如何被理解"。具体阶段进度与执行状态以 `.planning/` 中的 planning 文档为准。
