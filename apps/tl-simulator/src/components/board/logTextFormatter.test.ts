import { describe, expect, it } from 'vitest';
import { formatLogText } from './logTextFormatter';

describe('formatLogText', () => {
  it('formats action card counter logs into public-facing sentences', () => {
    expect(
      formatLogText('📘 角色「医生」受到 剧作家的「不安+1」 的影响：不安 +1'),
    ).toBe('因为行动卡效果，医生的不安 +1。');
  });

  it('formats goodwill declaration and resolution logs', () => {
    expect(formatLogText('📣 队长声明使用友好能力: 男学生')).toBe('主人公希望发动男学生的友好能力。');
    expect(formatLogText('✅ 男学生 的友好能力生效')).toBe('男学生的友好能力发动了。');
    expect(formatLogText('❌ 男学生 的友好能力被拒绝')).toBe('主人公希望发动男学生的友好能力，但是被拒绝了。');
  });

  it('formats system mode and loop-failure logs', () => {
    expect(formatLogText('⚡ 已切换到结算模式')).toBe('已切换到结算模式。');
    expect(formatLogText('💀 你们死了，轮回立即结束')).toBe('主人公死亡，轮回结束。');
    expect(formatLogText('⛔ 你们失败了，轮回立即结束')).toBe('轮回立即结束，主人公失败。');
  });

  it('formats generic goodwill handler logs', () => {
    expect(
      formatLogText('📋 医生（医生）使用友好能力：女学生 -1 不安'),
    ).toBe('因为医生的友好能力，女学生的不安 -1。');
    expect(
      formatLogText('📋 巫女（巫女）使用友好能力：男学生 身份公开为 杀手'),
    ).toBe('因为巫女的友好能力，男学生的身份被公开。');
  });
});
