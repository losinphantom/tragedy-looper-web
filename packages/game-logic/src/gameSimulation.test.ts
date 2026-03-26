/**
 * End-to-End Game Simulation — 端到端游戏流程模拟
 *
 * 使用 moves + phases 直接函数调用模拟完整游戏流程。
 * 剧本：traditional_ensemble_murder（BTX 基础规则集，唯一 manifest-backed 剧本）
 *
 * 测试场景：
 *   1. 剧本加载完整性
 *   2. 大厅→出牌阶段全流程
 *   3. 轮回败北 → 下一轮回
 *   4. 剧作家胜利路径（所有轮回耗尽）
 *   5. 主人公胜利路径（无败北）
 *   6. 快照/回退
 *   7. Token 操作和角色管理
 *   8. 状态隔离（playerView）
 */

import { describe, expect, it, vi } from 'vitest';

import { TragedyLooper } from './game';
import type { TragedyGameState } from './game';
import { moves } from './moves';
import { phases } from './phases';
import { createEmptyTokenBag, getToken } from './utils/tokenHelpers';
import { loadScript, buildActiveRules } from './scriptLoader';
import { getScriptById } from '@tragedy/domain';

/** 用真实 loadScript 创建一个已选脚本的游戏状态 */
function createGameWithScript(): TragedyGameState {
  const G = TragedyLooper.setup!({} as any) as TragedyGameState;

  // 使用真实 selectScript move 内联逻辑
  const entry = getScriptById('traditional_ensemble_murder')!;
  const script = loadScript(entry.def);
  G.maxLoops = script.maxLoops;
  G.daysPerLoop = script.daysPerLoop;
  G.seatHands = script.seatHands;
  G.scriptOpen = script.scriptOpen;
  G.scriptSecret = script.scriptSecret;
  G.v1.characters = script.characters;
  G.v1.locations = script.locations;
  G.v1.scheduledIncidents = script.scheduledIncidents;
  G.v1.hiddenRoles = script.hiddenRoles;
  G.v1.ahrVariableRoles = script.ahrVariableRoles;
  G.v1.incidentCulprits = script.incidentCulprits;
  G.v1.activePlots = script.activePlots;
  G.v1.loopState = script.loopState;
  G.v1.castDefinitions = script.castDefinitions;
  G.v1.currentScriptId = 'traditional_ensemble_murder';
  G.v1.playedCards = [];
  G.board = { usedOncePerLoopCards: [], loopLimit: script.maxLoops, dayLimit: script.daysPerLoop } as any;

  const activeRules = buildActiveRules(
    script.scriptOpen.tragedySetId,
    script.activePlots,
    script.hiddenRoles,
    script.scheduledIncidents,
    script.ahrVariableRoles,
  );
  G.v1.activeRuleDefinitions = activeRules;

  return G;
}

describe('Game Simulation — 端到端游戏流程', () => {
  // ── 场景 1：剧本加载完整性 ───────────────────────────────────────────

  it('correctly loads script data including characters and incidents', () => {
    const G = createGameWithScript();

    // 角色加载
    expect(G.v1.characters['boy_student']).toBeDefined();
    expect(G.v1.characters['girl_student']).toBeDefined();
    expect(G.v1.characters['rich_mans_daughter']).toBeDefined();
    expect(G.v1.characters['shrine_maiden']).toBeDefined();
    expect(G.v1.characters['doctor']).toBeDefined();
    expect(G.v1.characters['patient']).toBeDefined();
    expect(G.v1.characters['police_officer']).toBeDefined();
    expect(G.v1.characters['office_worker']).toBeDefined();
    expect(G.v1.characters['informer']).toBeDefined();

    // 事件日程（4 个事件）
    expect(G.v1.scheduledIncidents.length).toBe(4);
    expect(G.v1.scheduledIncidents[0]).toMatchObject({ day: 2, incidentId: 'increasing_unease' });
    expect(G.v1.scheduledIncidents[1]).toMatchObject({ day: 4, incidentId: 'hospital_incident' });
    expect(G.v1.scheduledIncidents[2]).toMatchObject({ day: 5, incidentId: 'missing_person' });
    expect(G.v1.scheduledIncidents[3]).toMatchObject({ day: 7, incidentId: 'murder' });

    // 隐藏角色（剧作家秘密）
    expect(G.v1.hiddenRoles?.['boy_student']).toBe('serial_killer');
    expect(G.v1.hiddenRoles?.['girl_student']).toBe('key_person');
    expect(G.v1.hiddenRoles?.['informer']).toBe('brain');
    expect(G.v1.hiddenRoles?.['rich_mans_daughter']).toBe('killer');
    expect(G.v1.hiddenRoles?.['shrine_maiden']).toBe('friend');
    expect(G.v1.hiddenRoles?.['doctor']).toBe('conspiracy_theorist');

    // 密谋列表
    expect(G.v1.activePlots).toContain('murder_plan');
    expect(G.v1.activePlots).toContain('the_hidden_freak');
    expect(G.v1.activePlots).toContain('an_unsettling_rumor');

    // 手牌 — 4 个座位
    expect(G.seatHands['0'].length).toBeGreaterThan(0);
    expect(G.seatHands['1'].length).toBeGreaterThan(0);

    // 活跃规则
    expect(G.v1.activeRuleDefinitions!.length).toBeGreaterThan(0);
  });

  // ── 场景 2：大厅准备 → 循环设置 → 第一天 ────────────────────────────

  it('sets up lobby and progresses to loop_setup and day_start', () => {
    const G = createGameWithScript();

    // 大厅：主角加入并准备
    (moves.toggleReady as any)({ G, ctx: { phase: 'lobby_wait' }, playerID: '1' });
    (moves.toggleReady as any)({ G, ctx: { phase: 'lobby_wait' }, playerID: '2' });
    expect(G.v1.readyPlayers['1']).toBe(true);
    expect(G.v1.readyPlayers['2']).toBe(true);

    // 剧作家开始
    G.v1.readyPlayers['0'] = true;
    G.v1.joinedProtagonists = { '1': true, '2': true };
    const startEvents = { endPhase: vi.fn() };
    (moves.startGame as any)({ G, ctx: { phase: 'lobby_wait' }, events: startEvents, playerID: '0' });
    expect(startEvents.endPhase).toHaveBeenCalled();

    // 模拟 loop_setup（瞬态阶段）
    const loopEvents = { endPhase: vi.fn() };
    (phases.loop_setup.onBegin as any)({ G, events: loopEvents });
    expect(loopEvents.endPhase).toHaveBeenCalled();
    expect(G.day).toBe(0);

    // 进入 day_start
    (phases.day_start.onBegin as any)({ G });
    expect(G.day).toBe(1);
  });

  // ── 场景 3：出牌阶段流程 ────────────────────────────────────────────

  it('supports mastermind card play in mastermind_plan phase', () => {
    const G = createGameWithScript();
    G.day = 1;
    G.loopIndex = 0;

    // 剧作家出 3 张牌
    const hand = [...G.seatHands['0']];
    const card1 = hand[0];
    const card2 = hand[1];
    const card3 = hand[2];

    (moves.playCard as any)(
      { G, ctx: { phase: 'mastermind_plan' }, playerID: '0' },
      card1, 'character', 'doctor',
    );
    (moves.playCard as any)(
      { G, ctx: { phase: 'mastermind_plan' }, playerID: '0' },
      card2, 'character', 'girl_student',
    );
    (moves.playCard as any)(
      { G, ctx: { phase: 'mastermind_plan' }, playerID: '0' },
      card3, 'character', 'boy_student',
    );

    expect(G.v1.playedCards.length).toBe(3);
    expect(G.v1.playedCards.every(c => c.playedBySeat === '0')).toBe(true);
    expect(G.v1.playedCards.every(c => c.owner === 'mastermind')).toBe(true);

    // 验证 advancePhase 现在可以推进（3张牌满足条件）
    const events = { endPhase: vi.fn() };
    (moves.advancePhase as any)(
      { G, ctx: { phase: 'mastermind_plan' }, events, playerID: '0' },
    );
    expect(events.endPhase).toHaveBeenCalled();
  });

  // ── 场景 4：轮回败北 → 下一轮回 ──────────────────────────────────────

  it('handles loop loss and resets for next loop', () => {
    const G = createGameWithScript();

    // 开始第一轮回
    const loopEvents = { endPhase: vi.fn() };
    (phases.loop_setup.onBegin as any)({ G, events: loopEvents });
    (phases.day_start.onBegin as any)({ G });

    expect(G.loopIndex).toBe(0);
    expect(G.day).toBe(1);

    // 宣布败北
    const lossEvents = { endPhase: vi.fn() };
    (moves.declareLoopLoss as any)(
      { G, ctx: { phase: 'day_start' }, events: lossEvents, playerID: '0' },
    );
    expect(G.v1.loopLost).toBe(true);
    expect(lossEvents.endPhase).toHaveBeenCalled();

    // 模拟 loop_end_check
    const endEvents = { endPhase: vi.fn() };
    (phases.loop_end_check.onBegin as any)({ G, events: endEvents });

    // loopIndex 递增
    expect(G.loopIndex).toBe(1);
    expect(G.v1.loopLost).toBe(false);

    // 开始第二轮回
    const loop2Events = { endPhase: vi.fn() };
    (phases.loop_setup.onBegin as any)({ G, events: loop2Events });
    expect(G.day).toBe(0);

    // 角色已重置
    for (const char of Object.values(G.v1.characters)) {
      expect(char.alive).toBe(true);
      expect(getToken(char, 'paranoia')).toBe(0);
      expect(getToken(char, 'intrigue')).toBe(0);
      expect(getToken(char, 'goodwill')).toBe(0);
    }
  });

  // ── 场景 5：全轮回耗尽 → 剧作家胜利 ──────────────────────────────────

  it('routes to final_guess when all loops are exhausted (basic_tragedy)', () => {
    const G = createGameWithScript();
    expect(G.maxLoops).toBe(4);

    // 模拟 4 轮败北
    for (let loop = 0; loop < 4; loop++) {
      const loopEvents = { endPhase: vi.fn() };
      (phases.loop_setup.onBegin as any)({ G, events: loopEvents });

      (phases.day_start.onBegin as any)({ G });

      // 宣布败北
      G.v1.loopLost = true;

      // 结束轮回
      const endEvents = { endPhase: vi.fn() };
      (phases.loop_end_check.onBegin as any)({ G, events: endEvents });
    }

    // loopIndex == maxLoops → basic_tragedy 支持 finalGuess，不直接设 mastermind winner
    expect(G.loopIndex).toBe(4);
    // winner 尚未设置（等待最终猜测阶段）
    expect(G.v1.winner).toBeUndefined();

    // 模拟 boardgame.io 的 next 路由：loop_end_check → final_guess
    const fgEvents = { endPhase: vi.fn(), setPhase: vi.fn() };
    (phases.final_guess.onBegin as any)({ G, events: fgEvents });
    // 游戏应路由到 final_guess 并写入最终猜测日志
    expect(G.publicLog.some(line => line.includes('最终猜测'))).toBe(true);
  });

  // ── 场景 6：主人公胜利路径 ──────────────────────────────────────────

  it('protagonist wins when loop ends without loss', () => {
    const G = createGameWithScript();

    // 开始第一轮回
    const loopEvents = { endPhase: vi.fn() };
    (phases.loop_setup.onBegin as any)({ G, events: loopEvents });
    (phases.day_start.onBegin as any)({ G });

    // 无败北：直接进入 loop_end_check
    G.v1.loopLost = false;
    G.v1.protagonistKilled = false;

    const endEvents = { endPhase: vi.fn() };
    (phases.loop_end_check.onBegin as any)({ G, events: endEvents });

    expect(G.v1.winner).toBe('protagonist');
  });

  // ── 场景 7：多日推进 ─────────────────────────────────────────────────

  it('correctly increments day count through multiple days', () => {
    const G = createGameWithScript();

    const loopEvents = { endPhase: vi.fn() };
    (phases.loop_setup.onBegin as any)({ G, events: loopEvents });

    // Day 1
    (phases.day_start.onBegin as any)({ G });
    expect(G.day).toBe(1);

    // Day 2
    (phases.day_start.onBegin as any)({ G });
    expect(G.day).toBe(2);

    // Day 3
    (phases.day_start.onBegin as any)({ G });
    expect(G.day).toBe(3);
  });

  // ── 场景 8：快照/回退 ────────────────────────────────────────────────

  it('supports snapshot creation and restoration', () => {
    const G = createGameWithScript();

    // 创建快照
    (moves.createMastermindSnapshot as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
      '测试快照',
    );

    expect(G.v1.mastermindConsole.lastSnapshot).toBeDefined();
    expect(G.v1.mastermindConsole.lastSnapshot!.label).toBe('测试快照');

    // 修改一些状态
    G.day = 5;
    G.loopIndex = 2;

    // 恢复快照（同阶段）
    (moves.restoreMastermindSnapshot as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
    );

    // 应恢复到快照时的状态
    expect(G.day).toBe(0);
    expect(G.loopIndex).toBe(0);
  });

  // ── 场景 9：手动 Token 操作 ──────────────────────────────────────────

  it('supports manual token modifications and character operations', () => {
    const G = createGameWithScript();

    // 加不安
    (moves.modifyToken as any)({ G, playerID: '0' }, 'doctor', 'paranoia', 3);
    expect(getToken(G.v1.characters['doctor'], 'paranoia')).toBe(3);

    // 加友好
    (moves.modifyToken as any)({ G, playerID: '0' }, 'girl_student', 'goodwill', 2);
    expect(getToken(G.v1.characters['girl_student'], 'goodwill')).toBe(2);

    // 加阴谋到地点
    (moves.modifyLocationToken as any)({ G, playerID: '0' }, 'school', 'intrigue', 1);
    expect(getToken(G.v1.locations['school'], 'intrigue')).toBe(1);

    // 杀死角色
    (moves.killCharacter as any)({ G, playerID: '0' }, 'doctor');
    expect(G.v1.characters['doctor'].alive).toBe(false);

    // 复活
    (moves.killCharacter as any)({ G, playerID: '0' }, 'doctor');
    expect(G.v1.characters['doctor'].alive).toBe(true);

    // 移动角色
    (moves.moveCharacter as any)({ G, playerID: '0' }, 'doctor', 'city');
    expect(G.v1.characters['doctor'].locationId).toBe('city');
  });

  // ── 场景 10：playerView 信息隔离 ───────────────────────────────────

  it('playerView filters hidden information for protagonist', () => {
    const G = createGameWithScript();
    const playerView = TragedyLooper.playerView!;

    // 剧作家视角：完整
    const mmView = playerView({ G, ctx: {} as any, playerID: '0' });
    expect(mmView.v1.hiddenRoles).toEqual(G.v1.hiddenRoles);

    // 主角视角：隐藏角色应被清除
    const p1View = playerView({ G, ctx: {} as any, playerID: '1' });
    expect(Object.keys(p1View.v1.hiddenRoles || {})).toHaveLength(0);
    expect(p1View.scriptSecret).toBeNull();
  });

  it('playerView reveals all played cards during resolve_cards for protagonists', () => {
    const G = createGameWithScript();
    G.v1.playedCards = [
      {
        id: 'mm-card',
        cardTemplateId: 'mastermind_forbid_movement',
        owner: 'mastermind',
        targetType: 'character',
        targetId: 'doctor',
        faceUp: false,
        playedBySeat: '0',
      },
      {
        id: 'p1-card',
        cardTemplateId: 'protagonist_goodwill_plus_2',
        owner: 'protagonist',
        targetType: 'character',
        targetId: 'doctor',
        faceUp: false,
        playedBySeat: '1',
      },
    ];

    const protagonistView = TragedyLooper.playerView!({
      G,
      ctx: { phase: 'resolve_cards' } as any,
      playerID: '2',
    });

    expect(protagonistView.v1.playedCards).toEqual([
      expect.objectContaining({
        id: 'mm-card',
        cardTemplateId: 'mastermind_forbid_movement',
        faceUp: true,
      }),
      expect.objectContaining({
        id: 'p1-card',
        cardTemplateId: 'protagonist_goodwill_plus_2',
        faceUp: true,
      }),
    ]);
  });

  // ── 场景 11：事件阶段 ────────────────────────────────────────────────

  it('incidents phase handles scheduled incidents correctly', () => {
    const G = createGameWithScript();
    G.v1.settings.autoResolve = false;

    // 设置到第 2 天（有 increasing_unease 事件）
    const loopEvents = { endPhase: vi.fn() };
    (phases.loop_setup.onBegin as any)({ G, events: loopEvents });
    (phases.day_start.onBegin as any)({ G }); // day 1
    (phases.day_start.onBegin as any)({ G }); // day 2

    expect(G.day).toBe(2);

    // 事件阶段
    const incidentEvents = { endPhase: vi.fn(), setPhase: vi.fn() };
    (phases.incidents.onBegin as any)({ G, events: incidentEvents });

    // 应有事件需要处理
    expect(G.publicLog.some(line => line.includes('事件阶段'))).toBe(true);
  });

  // ── 场景 12：因果线数据跨轮回保留 ──────────────────────────────────

  it('preserves causal thread data across loops', () => {
    const G = createGameWithScript();

    // 第一轮回
    const loopEvents = { endPhase: vi.fn() };
    (phases.loop_setup.onBegin as any)({ G, events: loopEvents });
    (phases.day_start.onBegin as any)({ G });

    // 给角色加友好，杀死角色
    (moves.modifyToken as any)({ G, playerID: '0' }, 'doctor', 'goodwill', 3);
    (moves.killCharacter as any)({ G, playerID: '0' }, 'girl_student');

    // 第一轮回败北
    G.v1.loopLost = true;
    const endEvents = { endPhase: vi.fn() };
    (phases.loop_end_check.onBegin as any)({ G, events: endEvents });

    // 因果线数据应保留
    expect(G.v1.loopState.lastLoopGoodwillChars).toContain('doctor');
    expect(G.v1.loopState.lastLoopDeadCharacters).toContain('girl_student');

    // 第二轮回设置
    const loop2Events = { endPhase: vi.fn() };
    (phases.loop_setup.onBegin as any)({ G, events: loop2Events });

    // 角色重置但因果线数据保留
    expect(G.v1.characters['girl_student'].alive).toBe(true);
    expect(getToken(G.v1.characters['doctor'], 'goodwill')).toBe(0);
    // 因果线数据仍在
    expect(G.v1.loopState.lastLoopGoodwillChars).toContain('doctor');
  });
});
