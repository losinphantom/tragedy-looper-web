import { describe, expect, it } from 'vitest';

import { getPlayedCardRenderUrl } from './boardHelpers';

describe('getPlayedCardRenderUrl', () => {
  it('uses the seat-colored front image for face-up protagonist cards', () => {
    expect(getPlayedCardRenderUrl({
      cardTemplateId: 'protagonist_unease_plus_1',
      playedBySeat: '1',
      faceUp: true,
    })).toBe('/assets/行动卡面/主人公橙不安放置.png');
  });

  it('uses the colored back for facedown cards', () => {
    expect(getPlayedCardRenderUrl({
      cardTemplateId: 'protagonist_unease_plus_1',
      playedBySeat: '2',
      faceUp: false,
    })).toBe('/assets/卡背/card_back_主人公绿.png');
  });

  it('falls back to the back image when a face-up front asset cannot be resolved', () => {
    expect(getPlayedCardRenderUrl({
      cardTemplateId: 'hidden',
      playedBySeat: '3',
      faceUp: true,
    })).toBe('/assets/卡背/card_back_主人公蓝.png');
  });

  it('can be forced to render the back even if the card state is face-up', () => {
    expect(getPlayedCardRenderUrl({
      cardTemplateId: 'protagonist_unease_plus_1',
      playedBySeat: '1',
      faceUp: true,
    }, { forceBack: true })).toBe('/assets/卡背/card_back_主人公橙.png');
  });
});
