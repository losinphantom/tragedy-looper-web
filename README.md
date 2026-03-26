# 惨剧轮回 Tragedy Looper Simulator

基于 [boardgame.io](https://boardgame.io/) 的惨剧轮回桌游在线模拟器，支持多人实时对局。

[English Version →](./README_EN.md)

## 项目结构

```
├── apps/
│   ├── server/            后端 — boardgame.io 多人服务器 (port 8000)
│   └── tl-simulator/      前端 — Vite + React SPA (port 5173)
├── packages/
│   ├── domain/            数据模型 — 角色/事件/剧本/模组定义
│   ├── game-logic/        游戏逻辑 — Game 定义、moves、phases（前后端共享）
│   └── rules/             规则引擎
├── docs/
│   ├── game-knowledge/    游戏知识库 — 概念/领域模型/规则/角色/模组
│   ├── architecture/      技术架构文档
│   └── plans/             开发计划
```

## 文档入口

- `docs/README.md`：文档导航总览，适合先看
- `docs/project-index-map.md`：模块与目录索引图
- `docs/game-knowledge/rulebook-review.md`：规则实现现状
- `docs/game-knowledge/rulebook-todo.md`：规则缺口与后续待办
- `memory.md`：项目当前记忆、里程碑与已知限制

## 快速启动

> 需要 Node.js 22.22+ 和 npm 11+

```bash
# 安装依赖
npm install --legacy-peer-deps

# 终端 1：启动后端
npm run serve --workspace=apps/server

# 终端 2：启动前端
npm run dev --workspace=apps/tl-simulator
```

打开 http://localhost:5173 即可进入游戏大厅。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19, Vite 5, Tailwind CSS 3, TypeScript |
| 后端 | boardgame.io Server, Socket.IO, vite-node |
| 共享 | npm workspaces monorepo, ESM |

## 游戏流程

1. **剧本家**创建房间，选择剧本模组
2. **主角**玩家加入房间
3. 按阶段进行：日出 → 出牌 → 结算 → 能力 → 事件 → 日落
4. 轮回结束后判定胜负

## 开发

```bash
# 运行测试
npm test

# 类型检查
npm run typecheck
```
