import { describe, expect, it } from 'vitest';
import { ResultAnnouncementPayloadSchema, normalizePublicAnnouncementText } from '@tragedy/game-logic';

import {
  buildResolutionOverlayModel,
  isResolutionOverlayBlocking,
} from './resolutionOverlayModel';

describe('resolutionOverlayModel', () => {
  it('treats resolve and announce nodes as blocking overlay events', () => {
    expect(isResolutionOverlayBlocking('resolve_effect')).toBe(true);
    expect(isResolutionOverlayBlocking('resolve_move')).toBe(true);
    expect(isResolutionOverlayBlocking('resolve_flip_all')).toBe(false);
    expect(isResolutionOverlayBlocking('resolve_dismiss_all')).toBe(false);
    expect(isResolutionOverlayBlocking('incident_announce')).toBe(true);
    expect(isResolutionOverlayBlocking('ability_announce')).toBe(true);
    expect(isResolutionOverlayBlocking('result_announce')).toBe(true);
    expect(isResolutionOverlayBlocking('stat_change')).toBe(false);
    expect(isResolutionOverlayBlocking('char_move')).toBe(false);
  });

  it('derives forbidden-move steps and invalid cards from resolve_effect payloads', () => {
    const model = buildResolutionOverlayModel({
      type: 'resolve_effect',
      payload: {
        targetType: 'character',
        targetId: 'boy_student',
        effects: [
          { kind: 'forbidden', cardId: 'card-1', reason: '禁止移动：被能力封锁' },
          { kind: 'counter', counter: 'goodwill_plus', delta: 1 },
        ],
      },
    });

    expect(model).not.toBeNull();
    expect(model?.variant).toBe('sequence');
    expect(model?.currentStep).toBe(0);
    expect(model?.invalidCardIds).toEqual(['card-1']);
    expect(model?.summary).toContain('友好+1');
  });

  it('shows resolve_move as blocking overlay before board animation', () => {
    const model = buildResolutionOverlayModel({
      type: 'resolve_move',
      payload: {
        charId: 'boy_student',
        from: 'hospital',
        to: 'school',
      },
    });

    expect(model).not.toBeNull();
    expect(model?.variant).toBe('sequence');
    expect(model?.stageLabel).toBe('角色移动');
    expect(model?.summary).toContain('→');
  });

  it('describes incident overlays from the affected subject perspective', () => {
    const model = buildResolutionOverlayModel({
      type: 'incident_announce',
      payload: {
        incidentName: '杀人事件',
        outcome: 'triggered',
        description: '杀人事件 已发生。',
        characterId: 'boy_student',
        targetId: 'boy_student',
        targetType: 'character',
        detail: '被害者：学生',
      },
    });

    expect(model).not.toBeNull();
    expect(model?.stageLabel).toBe('事件发生');
    expect(model?.targetLabel).toBeTruthy();
    expect(model?.detail).toContain('被害者');
  });

  it('builds not-triggered incident overlays without leaking hidden cause details', () => {
    const model = buildResolutionOverlayModel({
      type: 'incident_announce',
      payload: {
        incidentName: '可疑信件',
        outcome: 'not_triggered',
        description: '📋 事件未发生（条件未满足）',
      },
    });

    expect(model).not.toBeNull();
    expect(model?.stageLabel).toBe('事件未发生');
    expect(model?.summary).toContain('事件未发生');
    expect(model?.subjectCharacterId).toBeUndefined();
    expect(model?.targetLabel).toBeUndefined();
  });

  it('builds announce overlays for ability triggers', () => {
    const model = buildResolutionOverlayModel({
      type: 'ability_announce',
      payload: {
        abilityName: '最后的挣扎',
        characterId: 'boy_student',
      },
    });

    expect(model).not.toBeNull();
    expect(model?.variant).toBe('announce');
    expect(model?.stageLabel).toBe('能力结算');
    expect(model?.title).toBe('最后的挣扎');
  });

  it('builds pink goodwill result overlays with target detail', () => {
    const model = buildResolutionOverlayModel({
      type: 'ability_announce',
      payload: {
        abilityName: '友好能力生效',
        abilityLabel: '公开同一区域任意1名角色的身份',
        resultType: 'goodwill',
        outcome: 'allowed',
        characterId: 'shrine_maiden',
        targetId: 'boy_student',
        targetType: 'character',
        description: '巫女的友好能力已生效。',
        detail: '对象：学生',
      },
    });

    expect(model).not.toBeNull();
    expect(model?.variant).toBe('announce');
    expect(model?.accentTone).toBe('pink');
    expect(model?.stageLabel).toBe('友好能力');
    expect(model?.title).toBe('友好能力生效');
    expect(model?.detail).toContain('对象');
  });

  it('uses affected-target language for resolve_effect overlays', () => {
    const model = buildResolutionOverlayModel({
      type: 'resolve_effect',
      payload: {
        targetType: 'character',
        targetId: 'boy_student',
        effects: [
          { kind: 'counter', counter: 'paranoia_plus', delta: 1 },
        ],
      },
    });

    expect(model).not.toBeNull();
    expect(model?.title).toContain('状态发生变化');
    expect(model?.summary).toContain('不安+1');
  });

  it('builds gold result overlays for loop end announcements', () => {
    const payload = ResultAnnouncementPayloadSchema.safeParse({
      resultType: 'loop_end',
      title: '第 2 轮回结束',
      summary: '时间裂隙开始，主角团可以整理情报。',
      detail: '下一轮将从第 3 轮回开始。',
      characterId: 'boy_student',
      targetId: 'boy_student',
      targetType: 'character',
    });

    expect(payload.success).toBe(true);

    const model = buildResolutionOverlayModel({
      type: 'result_announce',
      payload: payload.success ? payload.data : null,
    });

    expect(model).not.toBeNull();
    expect(model?.variant).toBe('announce');
    expect(model?.accentTone).toBe('gold');
    expect(model?.stageLabel).toBe('轮回结束');
    expect(model?.title).toBe('第 2 轮回结束');
  });

  it('renders normalized result announcements without hidden-cause wording and keeps subject info', () => {
    const payload = ResultAnnouncementPayloadSchema.safeParse({
      resultType: 'loop_failure',
      title: '轮回失败（因为隐藏条件触发）',
      summary: '轮回失败（因为剧作家的隐藏身份触发）',
      detail: '因为剧作家的秘密能力，主角团本轮失败。',
      characterId: 'boy_student',
      targetId: 'boy_student',
      targetType: 'character',
    });

    expect(payload.success).toBe(true);
    if (!payload.success) return;

    const normalized = normalizePublicAnnouncementText(payload.data);

    const model = buildResolutionOverlayModel({
      type: 'result_announce',
      payload: {
        ...payload.data,
        ...normalized,
      },
    });

    expect(model).not.toBeNull();
    expect(model?.title).toBe('轮回失败');
    expect(model?.summary).toBe('轮回失败');
    expect(model?.summary).not.toContain('因为');
    expect(model?.stageLabel).toBe('轮回失败');
  });
});
