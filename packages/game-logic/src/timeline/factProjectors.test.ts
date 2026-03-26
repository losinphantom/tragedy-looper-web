import { describe, expect, it } from 'vitest';

import {
  buildAnimationHistoryProjection,
  buildMastermindHistoryProjection,
  buildPublicHistoryProjection,
  buildSeatHistoryProjection,
} from './factProjectors';
import { createMastermindTimelineVisibility, createPublicTimelineVisibility, createSeatPrivateTimelineVisibility } from './factVisibility';
import { buildTimelineCompatibilityMetadata } from './legacyHistoryProjection';
import { appendTimelineFact, createInitialTimelineState } from './factWriter';
import { buildHistoryProjectionForViewer, projectFactsForViewer } from './viewerFactProjection';

function createTimelineHost() {
  return {
    loopIndex: 1,
    day: 1,
    v1: {
      timeline: createInitialTimelineState(),
    },
  };
}

describe('timeline fact projectors', () => {
  it('derives public, mastermind, seat-private, and animation projections from compatibility metadata', () => {
    const host = createTimelineHost();

    appendTimelineFact(host, {
      type: 'state_change',
      source: { system: 'move', id: 'public-fact' },
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: 'public_update',
        summary: 'public update',
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          publicLog: ['公开日志'],
          fullLog: ['剧作家备注'],
          eventLogs: [{
            type: 'result',
            payload: {
              resultType: 'loop_end',
              title: '第 1 轮回结束',
              summary: '时间裂隙开始。',
            },
          }],
        }),
      },
    });

    appendTimelineFact(host, {
      type: 'state_change',
      source: { system: 'move', id: 'seat-fact' },
      visibility: createSeatPrivateTimelineVisibility(['2']),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: 'seat_note',
        summary: 'seat note',
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          seatHistory: {
            '2': ['座位笔记'],
          },
        }),
      },
    });

    appendTimelineFact(host, {
      type: 'state_change',
      source: { system: 'move', id: 'mastermind-fact' },
      visibility: createMastermindTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: 'mastermind_secret',
        summary: 'mastermind secret',
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          fullLog: ['秘密记录'],
        }),
      },
    });

    const facts = host.v1.timeline.facts;
    expect(buildPublicHistoryProjection(facts).map(entry => entry.text)).toEqual(['公开日志']);
    expect(buildMastermindHistoryProjection(facts).map(entry => entry.text)).toEqual([
      '公开日志',
      '剧作家备注',
      '秘密记录',
    ]);
    expect(buildSeatHistoryProjection(facts, '2').map(entry => entry.text)).toEqual([
      '公开日志',
      '座位笔记',
    ]);
    expect(buildAnimationHistoryProjection(facts)).toEqual([
      expect.objectContaining({
        type: 'result',
        payload: expect.objectContaining({
          title: '第 1 轮回结束',
        }),
      }),
    ]);
  });

  it('filters viewer-visible facts without leaking other-seat private history to mastermind or spectators', () => {
    const host = createTimelineHost();

    appendTimelineFact(host, {
      type: 'state_change',
      source: { system: 'move', id: 'public-fact' },
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: 'public_update',
        summary: 'public update',
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          publicLog: ['公开日志'],
        }),
      },
    });

    appendTimelineFact(host, {
      type: 'state_change',
      source: { system: 'move', id: 'mastermind-fact' },
      visibility: createMastermindTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: 'mastermind_secret',
        summary: 'mastermind secret',
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          fullLog: ['秘密记录'],
        }),
      },
    });

    appendTimelineFact(host, {
      type: 'state_change',
      source: { system: 'move', id: 'seat-two-fact' },
      visibility: createSeatPrivateTimelineVisibility(['2']),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: 'seat_two_note',
        summary: 'seat two note',
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          seatHistory: {
            '2': ['2 号位私有备注'],
          },
        }),
      },
    });

    appendTimelineFact(host, {
      type: 'state_change',
      source: { system: 'move', id: 'seat-three-fact' },
      visibility: createSeatPrivateTimelineVisibility(['3']),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: 'seat_three_note',
        summary: 'seat three note',
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          seatHistory: {
            '3': ['3 号位私有备注'],
          },
        }),
      },
    });

    const facts = host.v1.timeline.facts;
    expect(projectFactsForViewer(facts, null)).toHaveLength(1);
    expect(projectFactsForViewer(facts, '0').map(fact => fact.source.id)).toEqual([
      'public-fact',
      'mastermind-fact',
    ]);
    expect(projectFactsForViewer(facts, '2').map(fact => fact.source.id)).toEqual([
      'public-fact',
      'seat-two-fact',
    ]);
    expect(buildHistoryProjectionForViewer(host.v1.timeline, '2').map(entry => entry.text)).toEqual([
      '公开日志',
      '2 号位私有备注',
    ]);
    expect(buildHistoryProjectionForViewer(host.v1.timeline, '0').map(entry => entry.text)).toEqual([
      '公开日志',
      '秘密记录',
    ]);
  });

  it('keeps timeline history authoritative even if stale compatibility arrays still exist elsewhere', () => {
    const host = createTimelineHost();

    appendTimelineFact(host, {
      type: 'state_change',
      source: { system: 'move', id: 'authoritative-public-fact' },
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: 'public_update',
        summary: 'authoritative public update',
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          publicLog: ['当前公开日志'],
          eventLogs: [{
            type: 'result',
            payload: {
              title: '当前结算',
            },
          }],
        }),
      },
    });

    appendTimelineFact(host, {
      type: 'state_change',
      source: { system: 'move', id: 'authoritative-mastermind-fact' },
      visibility: createMastermindTimelineVisibility(),
      payload: {
        family: 'resolution',
        type: 'state_change',
        outcome: 'mastermind_secret',
        summary: 'authoritative mastermind update',
        changes: [],
        metadata: buildTimelineCompatibilityMetadata({
          fullLog: ['当前剧作家日志'],
        }),
      },
    });

    expect(buildHistoryProjectionForViewer(host.v1.timeline, null).map(entry => entry.text)).toEqual([
      '当前公开日志',
    ]);
    expect(buildHistoryProjectionForViewer(host.v1.timeline, '0').map(entry => entry.text)).toEqual([
      '当前公开日志',
      '当前剧作家日志',
    ]);
    expect(buildAnimationHistoryProjection(host.v1.timeline.facts)).toEqual([
      expect.objectContaining({
        type: 'result',
        payload: expect.objectContaining({
          title: '当前结算',
        }),
      }),
    ]);
  });

  it('normalizes public result announcements to outcome-first wording', () => {
    const host = createTimelineHost();

    appendTimelineFact(host, {
      type: 'result_announced',
      source: { system: 'phase', id: 'normalized-public-announcement' },
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'result',
        type: 'result_announced',
        announcement: {
          resultType: 'loop_failure',
          title: '轮回失败（因为隐藏条件触发）',
          summary: '轮回失败（因为剧作家的隐藏身份触发）',
          detail: '因为剧作家的秘密能力，主角团本轮失败。',
          characterId: 'boy_student',
          targetId: 'boy_student',
          targetType: 'character',
        },
        metadata: buildTimelineCompatibilityMetadata({}),
      },
    });

    const publicHistory = buildPublicHistoryProjection(host.v1.timeline.facts).map((entry) => entry.text);
    expect(publicHistory).toEqual(['轮回失败']);

    const animationProjection = buildAnimationHistoryProjection(host.v1.timeline.facts);
    expect(animationProjection[0]).toEqual(expect.objectContaining({
      type: 'result',
      payload: expect.objectContaining({
        summary: '轮回失败',
      }),
    }));
    expect(String((animationProjection[0] as any).payload.summary)).not.toContain('因为');
    expect(String((animationProjection[0] as any).payload.detail ?? '')).not.toContain('因为');
  });

  it('keeps simultaneous-style result announcements separate without hidden-cause linkage', () => {
    const host = createTimelineHost();

    appendTimelineFact(host, {
      type: 'result_announced',
      source: { system: 'phase', id: 'simultaneous-result-a' },
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'result',
        type: 'result_announced',
        announcement: {
          resultType: 'loop_failure',
          title: 'A 角色死亡',
          summary: 'A 角色死亡（因为隐藏因果链）',
          characterId: 'boy_student',
          targetId: 'boy_student',
          targetType: 'character',
        },
        metadata: buildTimelineCompatibilityMetadata({}),
      },
    });

    appendTimelineFact(host, {
      type: 'result_announced',
      source: { system: 'phase', id: 'simultaneous-result-b' },
      visibility: createPublicTimelineVisibility(),
      payload: {
        family: 'result',
        type: 'result_announced',
        announcement: {
          resultType: 'loop_failure',
          title: 'B 角色死亡',
          summary: 'B 角色死亡（由于隐藏因果链）',
          characterId: 'doctor',
          targetId: 'doctor',
          targetType: 'character',
        },
        metadata: buildTimelineCompatibilityMetadata({}),
      },
    });

    const publicHistory = buildPublicHistoryProjection(host.v1.timeline.facts).map((entry) => entry.text);
    expect(publicHistory).toEqual(['A 角色死亡', 'B 角色死亡']);
    expect(publicHistory.join(' ')).not.toContain('因为');
    expect(publicHistory.join(' ')).not.toContain('由于');
  });
});
