import { describe, expect, it } from 'vitest';

import { getPhaseBannerDetails } from './PhaseTransitionBanner';

describe('getPhaseBannerDetails', () => {
  it('maps real game phase names to banner metadata', () => {
    expect(getPhaseBannerDetails('resolve_cards')?.titleCn).toBe('行动揭晓与结算');
    expect(getPhaseBannerDetails('mastermind_abilities')?.titleCn).toBe('剧作家能力阶段');
    expect(getPhaseBannerDetails('goodwill_window')?.titleCn).toBe('友好能力阶段');
    expect(getPhaseBannerDetails('incidents')?.titleCn).toBe('事件阶段');
    expect(getPhaseBannerDetails('match_end')?.titleCn).toBe('游戏结束');
  });

  it('returns null for phases that should not render a banner', () => {
    expect(getPhaseBannerDetails('idle')).toBeNull();
    expect(getPhaseBannerDetails('script_select')).toBeNull();
  });
});
