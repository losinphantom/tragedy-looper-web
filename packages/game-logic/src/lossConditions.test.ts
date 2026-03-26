import { describe, expect, it } from 'vitest';

import { TragedyLooper } from './game';
import type { TragedyGameState } from './game';
import {
  triggerProtagonistDeath,
  triggerImmediateLoss,
  checkLoopEndLossConditions,
} from './lossConditions';

function createGame(): TragedyGameState {
  return TragedyLooper.setup!({} as any) as TragedyGameState;
}

describe('lossConditions', () => {
  // ── 第一类：主人公死亡 ──────────────────────────────────────────────────

  describe('triggerProtagonistDeath', () => {
    it('sets protagonistKilled flag and adds public log', () => {
      const G = createGame();

      triggerProtagonistDeath(G, '测试死亡');

      expect(G.v1.protagonistKilled).toBe(true);
      expect(G.publicLog.some(line => line.includes('你们死了'))).toBe(true);
      expect(G.fullLog.some(line => line.includes('测试死亡'))).toBe(true);
    });

    it('respects protagonist immunity flag', () => {
      const G = createGame();
      G.v1.loopState.abilityUsage['__protagonist_immunity'] = {
        usedToday: false,
        usedThisLoop: true,
      };

      triggerProtagonistDeath(G, '被免疫的死亡');

      expect(G.v1.protagonistKilled).toBe(false);
      expect(G.publicLog.some(line => line.includes('免于死亡'))).toBe(true);
    });
  });

  // ── 第二类：即时败北 ────────────────────────────────────────────────────

  describe('triggerImmediateLoss', () => {
    it('sets loopLost flag and adds public log', () => {
      const G = createGame();

      triggerImmediateLoss(G, '即时败北原因');

      expect(G.v1.loopLost).toBe(true);
      expect(G.publicLog.some(line => line.includes('你们失败了'))).toBe(true);
      expect(G.fullLog.some(line => line.includes('即时败北原因'))).toBe(true);
    });

    it('does not trigger repeatedly when already lost', () => {
      const G = createGame();

      triggerImmediateLoss(G, '第一次');
      const logCount = G.publicLog.length;

      triggerImmediateLoss(G, '第二次');
      expect(G.publicLog.length).toBe(logCount);
      expect(G.fullLog.filter(line => line.includes('即时败北')).length).toBe(1);
    });
  });

  // ── 第三类：轮回结束败北条件 ────────────────────────────────────────────

  describe('checkLoopEndLossConditions', () => {
    it('returns lost:true and consumes protagonistKilled flag', () => {
      const G = createGame();
      G.v1.protagonistKilled = true;

      const result = checkLoopEndLossConditions(G);

      expect(result.lost).toBe(true);
      expect(result.reason).toBe('主人公死亡');
      expect(G.v1.protagonistKilled).toBe(false);
    });

    it('returns lost:true when loopLost is already set', () => {
      const G = createGame();
      G.v1.loopLost = true;

      const result = checkLoopEndLossConditions(G);

      expect(result.lost).toBe(true);
    });

    it('returns lost:false when no loss condition is met', () => {
      const G = createGame();

      const result = checkLoopEndLossConditions(G);

      expect(result.lost).toBe(false);
      expect(result.reason).toBe('');
    });

    it('prioritizes protagonistKilled over loopLost', () => {
      const G = createGame();
      G.v1.protagonistKilled = true;
      G.v1.loopLost = true;

      const result = checkLoopEndLossConditions(G);

      expect(result.lost).toBe(true);
      expect(result.reason).toBe('主人公死亡');
      // 消费 protagonistKilled
      expect(G.v1.protagonistKilled).toBe(false);
    });
  });
});
