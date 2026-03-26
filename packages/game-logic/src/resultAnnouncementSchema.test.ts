import { describe, expect, it } from 'vitest';

import { ResultAnnouncementPayloadSchema } from './resultAnnouncementSchema';

describe('ResultAnnouncementPayloadSchema', () => {
  it('accepts valid loop result announcements with public subject metadata', () => {
    expect(ResultAnnouncementPayloadSchema.parse({
      resultType: 'loop_end',
      title: '第 1 轮回结束',
      summary: '时间裂隙开始，主角团可以整理情报。',
      detail: '下一轮将从第 2 轮回开始。',
      characterId: 'doctor',
      locationId: 'hospital',
      targetId: 'doctor',
      targetType: 'character',
    })).toEqual({
      resultType: 'loop_end',
      title: '第 1 轮回结束',
      summary: '时间裂隙开始，主角团可以整理情报。',
      detail: '下一轮将从第 2 轮回开始。',
      characterId: 'doctor',
      locationId: 'hospital',
      targetId: 'doctor',
      targetType: 'character',
    });
  });

  it('rejects malformed announcement payloads', () => {
    expect(() => ResultAnnouncementPayloadSchema.parse({
      resultType: 'unknown',
      title: '',
      summary: '',
    })).toThrow();
  });

  it('rejects invalid target metadata', () => {
    expect(() => ResultAnnouncementPayloadSchema.parse({
      resultType: 'game_victory',
      title: '主角团获胜',
      summary: '最终猜测全部正确。',
      targetType: 'token',
    })).toThrow();
  });
});
