import { describe, expect, it } from 'vitest';

import type {
  LocalizedText,
  MatchState,
  OpenScriptView,
  RoomState,
  SecretScriptView,
  SpecialRuleRecord,
  ScriptDef,
} from '@tragedy/domain';
import {
  appendTimelineFact,
  createInitialTimelineState,
  createMastermindTimelineVisibility,
  createPublicTimelineVisibility,
  createSeatPrivateTimelineVisibility,
} from '@tragedy/game-logic';
import {
  buildMastermindView,
  buildOpenScriptView,
  buildPublicMatchView,
  buildSecretScriptView,
  buildSeatView,
  buildSpectatorView,
} from './index';

const scriptFixture: ScriptDef<LocalizedText, number, SpecialRuleRecord> = {
  title: {
    'zh-CN': '午夜地带',
    en: 'Midnight Zone',
  },
  tragedySetId: 'basic_tragedy',
  loops: 3,
  daysPerLoop: 4,
  specialRules: [
    {
      id: 'no-early-reveal',
      label: {
        'zh-CN': '不可提前公开',
      },
      summary: {
        'zh-CN': '用于测试结构化特殊规则投影。',
      },
    },
  ],
  mainPlotId: 'murder_plan',
  subplotIds: ['the_sealed_item'],
  cast: [
    { characterId: 'doctor', roleId: 'key_person' },
    { characterId: 'office_worker', roleId: 'killer' },
  ],
  incidents: [
    {
      day: 1,
      incidentId: 'hospital_incident',
      culpritCharacterId: 'office_worker',
    },
  ],
};

function createRoomState(): RoomState {
  return {
    roomId: 'room-1',
    roomCode: 'ABCD',
    spectators: ['spec-1'],
    seats: [
      {
        seatId: 'seat-mm',
        playerId: 'player-mm',
        boardgamePlayerId: '0',
        role: 'mastermind',
      },
      {
        seatId: 'seat-p1',
        playerId: 'player-p1',
        boardgamePlayerId: '1',
        role: 'protagonist',
      },
    ],
    reconnectTokens: {
      'seat-mm': 'mm-token',
      'seat-p1': 'p1-token',
    },
    status: 'in_game',
  };
}

function createMatchState(secretScript: SecretScriptView): MatchState {
  return {
    scriptOpen: buildOpenScriptView(scriptFixture) as unknown as OpenScriptView,
    scriptSecret: secretScript,
    tragedySet: 'basic_tragedy',
    loopIndex: 1,
    maxLoops: 3,
    day: 2,
    daysPerLoop: 4,
    leaderSeat: 'seat-p1',
    phase: 'protagonist_plan',
    playerCount: 4,
    publicLog: ['public event'],
    fullLog: ['hidden event'],
    seatHands: {
      'seat-p1': ['move', 'paranoia'],
      'seat-mm': ['forbid_movement'],
    },
    board: {
      locations: ['hospital'],
      characters: ['doctor', 'office_worker'],
      scheduledIncidents: ['hospital_incident'],
      usedOncePerLoopCards: ['forbid_movement'],
      revealedRoles: ['doctor:key_person'],
      protagonistsDead: false,
      loopLossReason: null,
      incidentHistory: ['day1:hospital_incident'],
    },
  };
}

function attachTimeline(match: MatchState) {
  const timelineHost = {
    loopIndex: 1,
    day: 2,
    v1: {
      timeline: createInitialTimelineState(),
    },
  };

  appendTimelineFact(timelineHost, {
    type: 'state_change',
    source: { system: 'move', id: 'public-fact' },
    visibility: createPublicTimelineVisibility(),
    payload: {
      family: 'resolution',
      type: 'state_change',
      outcome: 'public_update',
      summary: 'public update',
      changes: [],
      metadata: {
        compatibility: {
          publicLog: ['public event'],
        },
      },
    },
  });
  appendTimelineFact(timelineHost, {
    type: 'state_change',
    source: { system: 'move', id: 'mastermind-fact' },
    visibility: createMastermindTimelineVisibility(),
    payload: {
      family: 'resolution',
      type: 'state_change',
      outcome: 'mastermind_update',
      summary: 'mastermind update',
      changes: [],
      metadata: {
        compatibility: {
          fullLog: ['hidden event'],
        },
      },
    },
  });
  appendTimelineFact(timelineHost, {
    type: 'state_change',
    source: { system: 'move', id: 'seat-fact' },
    visibility: createSeatPrivateTimelineVisibility(['seat-p1']),
    payload: {
      family: 'resolution',
      type: 'state_change',
      outcome: 'seat_private_update',
      summary: 'seat private update',
      changes: [],
      metadata: {
        compatibility: {
          seatHistory: {
            'seat-p1': ['seat-only event'],
          },
        },
      },
    },
  });

  return {
    ...match,
    v1: {
      timeline: timelineHost.v1.timeline,
    },
  } as MatchState & { v1: { timeline: typeof timelineHost.v1.timeline } };
}

function attachTimelineWithResultAnnouncement(match: MatchState) {
  const timelineHost = {
    loopIndex: 1,
    day: 2,
    v1: {
      timeline: createInitialTimelineState(),
    },
  };

  appendTimelineFact(timelineHost, {
    type: 'result_announced',
    source: { system: 'phase', id: 'public-result-announcement' },
    visibility: createPublicTimelineVisibility(),
    payload: {
      family: 'result',
      type: 'result_announced',
      announcement: {
        resultType: 'loop_failure',
        title: '轮回失败（因为隐藏条件触发）',
        summary: '轮回失败（因为剧作家的隐藏身份触发）',
        detail: '因为剧作家的秘密能力，主角团本轮失败。',
        characterId: 'doctor',
        targetId: 'doctor',
        targetType: 'character',
      },
      metadata: {
        compatibility: {},
      },
    },
  });

  return {
    ...match,
    v1: {
      timeline: timelineHost.v1.timeline,
    },
  } as MatchState & { v1: { timeline: typeof timelineHost.v1.timeline } };
}

describe('rules view builders', () => {
  it('splits open and secret script data', () => {
    const open = buildOpenScriptView(scriptFixture);
    const secret = buildSecretScriptView(scriptFixture);

    expect(open).toEqual({
      title: {
        'zh-CN': '午夜地带',
        en: 'Midnight Zone',
      },
      tragedySetId: 'basic_tragedy',
      loops: 3,
      daysPerLoop: 4,
      specialRules: [
        {
          id: 'no-early-reveal',
          label: {
            'zh-CN': '不可提前公开',
          },
        },
      ],
      incidentSchedule: [{ day: 1, incidentId: 'hospital_incident' }],
    });

    expect(secret).toEqual({
      mainPlotId: 'murder_plan',
      subplotIds: ['the_sealed_item'],
      cast: [
        { characterId: 'doctor', roleId: 'key_person' },
        { characterId: 'office_worker', roleId: 'killer' },
      ],
      incidents: [
        {
          day: 1,
          incidentId: 'hospital_incident',
          culpritCharacterId: 'office_worker',
        },
      ],
    });
  });

  it('removes hidden information from the public view', () => {
    const secret = buildSecretScriptView(scriptFixture);
    const view = buildPublicMatchView(createRoomState(), attachTimeline(createMatchState(secret)));

    expect(view.room).toEqual({
      roomId: 'room-1',
      roomCode: 'ABCD',
      spectatorCount: 1,
      seats: [
        { seatId: 'seat-mm', occupied: true, role: 'mastermind' },
        { seatId: 'seat-p1', occupied: true, role: 'protagonist' },
      ],
      status: 'in_game',
    });
    expect(view.match.scriptOpen?.title).toEqual({
      'zh-CN': '午夜地带',
      en: 'Midnight Zone',
    });
    expect(view.match.publicLog).toEqual(['public event']);
    expect(view.match.history).toEqual([
      expect.objectContaining({
        audience: 'public',
        text: 'public event',
      }),
    ]);
    expect(view.match.board).toEqual({
      locations: ['hospital'],
      characters: ['doctor', 'office_worker'],
      scheduledIncidents: ['hospital_incident'],
      revealedRoles: ['doctor:key_person'],
      protagonistsDead: false,
      loopLossReason: null,
      incidentHistory: ['day1:hospital_incident'],
    });
    expect(view).not.toHaveProperty('secret');
    expect(view).not.toHaveProperty('private');
    expect(view.match.scriptOpen?.specialRules[0]).toEqual({
      id: 'no-early-reveal',
      label: {
        'zh-CN': '不可提前公开',
      },
    });
    expect(view.match.scriptOpen?.incidentSchedule[0]).toEqual({
      day: 1,
      incidentId: 'hospital_incident',
    });
    expect(JSON.stringify(view)).not.toContain('killer');
    expect(JSON.stringify(view)).not.toContain('hidden event');
    expect(JSON.stringify(view)).not.toContain('culpritCharacterId');
    expect(JSON.stringify(view)).not.toContain('player-mm');
    expect(JSON.stringify(view)).not.toContain('spec-1');
  });

  it('includes secret data for the mastermind view only', () => {
    const secret = buildSecretScriptView(scriptFixture);
    const view = buildMastermindView(createRoomState(), attachTimeline(createMatchState(secret)));

    expect(view.secret.scriptSecret).toEqual(secret);
    expect(view.secret.fullLog).toEqual(['hidden event']);
    expect(view.secret.history).toEqual([
      expect.objectContaining({
        audience: 'public',
        text: 'public event',
      }),
      expect.objectContaining({
        audience: 'mastermind',
        text: 'hidden event',
      }),
    ]);
  });

  it('keeps public history outcome-oriented for result announcements and strips hidden-cause prose', () => {
    const secret = buildSecretScriptView(scriptFixture);
    const view = buildPublicMatchView(createRoomState(), attachTimelineWithResultAnnouncement(createMatchState(secret)));

    expect(view.match.history).toEqual([
      expect.objectContaining({
        audience: 'public',
        text: '轮回失败',
      }),
    ]);
    expect(JSON.stringify(view.match.history)).not.toContain('因为');
  });

  it('returns detached copies so view consumers cannot mutate authoritative state', () => {
    const secret = buildSecretScriptView(scriptFixture);
    const room = createRoomState();
    const match = createMatchState(secret);

    const publicView = buildPublicMatchView(room, match);
    const mastermindView = buildMastermindView(room, match);

    expect(publicView.match.scriptOpen).not.toBe(match.scriptOpen);
    expect(publicView.match.scriptOpen?.specialRules).not.toBe(match.scriptOpen?.specialRules);
    expect(publicView.match.scriptOpen?.incidentSchedule).not.toBe(match.scriptOpen?.incidentSchedule);
    expect(mastermindView.secret.scriptSecret).not.toBe(match.scriptSecret);
    expect(mastermindView.secret.scriptSecret?.cast).not.toBe(match.scriptSecret?.cast);
    expect(mastermindView.secret.scriptSecret?.incidents).not.toBe(match.scriptSecret?.incidents);

    publicView.match.scriptOpen?.specialRules.push({
      id: 'mutated',
      label: { 'zh-CN': '变异' },
    });
    mastermindView.secret.scriptSecret?.cast.push({
      characterId: 'patient',
      roleId: 'friend',
    });

    expect(match.scriptOpen?.specialRules).toHaveLength(1);
    expect(match.scriptSecret?.cast).toHaveLength(2);
  });

  it('returns spectator-safe data without hidden information', () => {
    const secret = buildSecretScriptView(scriptFixture);
    const view = buildSpectatorView(createRoomState(), createMatchState(secret));

    expect(view).not.toHaveProperty('secret');
    expect(view).not.toHaveProperty('private');
    expect(JSON.stringify(view)).not.toContain('killer');
    expect(JSON.stringify(view)).not.toContain('hidden event');
    expect(JSON.stringify(view)).not.toContain('mm-token');
  });

  it('returns seat-specific private data from authoritative state', () => {
    const secret = buildSecretScriptView(scriptFixture);
    const view = buildSeatView(createRoomState(), attachTimeline(createMatchState(secret)), 'player-p1');

    expect(view.private).toEqual({
      seatId: 'seat-p1',
      reconnectToken: 'p1-token',
      hand: ['move', 'paranoia'],
      history: [
        expect.objectContaining({
          audience: 'public',
          text: 'public event',
        }),
        expect.objectContaining({
          audience: 'seat-private',
          text: 'seat-only event',
          seatIds: ['seat-p1'],
        }),
      ],
    });
    expect(JSON.stringify(view)).not.toContain('mm-token');
    expect(JSON.stringify(view)).not.toContain('killer');
    expect(JSON.stringify(view)).not.toContain('hidden event');
  });

  it('rejects private seat views when the authenticated player does not own a protagonist seat', () => {
    const secret = buildSecretScriptView(scriptFixture);

    expect(() => buildSeatView(
      createRoomState(),
      createMatchState(secret),
      'player-mm',
    )).toThrow(/No authenticated protagonist seat found/);
  });
});
