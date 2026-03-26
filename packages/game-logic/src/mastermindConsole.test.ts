import { INVALID_MOVE } from 'boardgame.io/core';
import { describe, expect, it, vi } from 'vitest';

import type { TragedyGameState } from './game';
import { TragedyLooper } from './game';
import { moves } from './moves';
import { createEmptyTokenBag } from './utils/tokenHelpers';
import { buildActiveRules } from './scriptLoader';

function createGame(): TragedyGameState {
  return TragedyLooper.setup!({} as any) as TragedyGameState;
}

describe('mastermind console moves', () => {
  it('captures and restores a snapshot of core tabletop state', () => {
    const G = createGame();
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.day = 2;
    G.loopIndex = 1;
    G.maxLoops = 3;
    G.daysPerLoop = 6;
    G.v1.ex = {
      enabled: true,
      gauge: 2,
      changedThisLoop: false,
      lastLoopEndGauge: 1,
    };
    G.v1.characters = {
      doctor: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      culprit: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      doctor: 'key_person',
    };
    G.v1.incidentCulprits = {
      '2_murder': 'culprit',
    };
    G.v1.leader = '2';

    (moves.createMastermindSnapshot as any)(
      { G, ctx: { phase: 'incidents' }, playerID: '0' },
      'before-console-edits',
    );

    (moves.setLoopAndDay as any)({ G, ctx: { phase: 'time_spiral' }, playerID: '0' }, 2, 0);
    (moves.setLeader as any)({ G, playerID: '0' }, '3');
    (moves.setExState as any)({ G, playerID: '0' }, { gauge: 5, changedThisLoop: true });
    (moves.setHiddenRole as any)({ G, playerID: '0' }, 'doctor', 'brain');
    (moves.setIncidentCulprit as any)({ G, playerID: '0' }, 2, 'murder', 'doctor');

    expect(G.day).toBe(0);
    expect(G.loopIndex).toBe(2);
    expect(G.v1.leader).toBe('3');
    expect(G.v1.ex.gauge).toBe(5);
    expect(G.v1.hiddenRoles.doctor).toBe('brain');
    expect(G.v1.incidentCulprits['2_murder']).toBe('doctor');
    const manualOperationsBeforeRestore = G.v1.timeline.facts
      .filter(fact => fact.payload.family === 'manual')
      .map(fact => (fact.payload as any).operation);
    expect(manualOperationsBeforeRestore).toEqual(expect.arrayContaining([
      'create_mastermind_snapshot',
      'set_loop_and_day',
      'set_leader',
      'set_ex_state',
      'set_hidden_role',
      'set_incident_culprit',
    ]));

    (moves.restoreMastermindSnapshot as any)({ G, ctx: { phase: 'incidents' }, playerID: '0' });

    expect(G.day).toBe(2);
    expect(G.loopIndex).toBe(1);
    expect(G.v1.leader).toBe('2');
    expect(G.v1.ex.gauge).toBe(2);
    expect(G.v1.ex.changedThisLoop).toBe(false);
    expect(G.v1.hiddenRoles.doctor).toBe('key_person');
    expect(G.v1.incidentCulprits['2_murder']).toBe('culprit');
    expect(G.v1.mastermindConsole.lastSnapshot?.label).toBe('before-console-edits');
    expect(G.v1.timeline.facts.at(-1)).toEqual(expect.objectContaining({
      type: 'manual_adjustment',
      payload: expect.objectContaining({
        family: 'manual',
        operation: 'restore_mastermind_snapshot',
      }),
    }));
  });

  it('validates hidden role edits against the current set', () => {
    const G = createGame();
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.v1.activePlots = [];
    G.v1.scheduledIncidents = [];
    G.v1.characters = {
      doctor: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.hiddenRoles = {
      doctor: 'key_person',
    };
    G.v1.activeRuleDefinitions = buildActiveRules('basic_tragedy', [], G.v1.hiddenRoles, []);

    const ok = (moves.setHiddenRole as any)({ G, playerID: '0' }, 'doctor', 'brain');
    const invalid = (moves.setHiddenRole as any)({ G, playerID: '0' }, 'doctor', 'not_a_role');

    expect(ok).toBeUndefined();
    expect(invalid).toBe(INVALID_MOVE);
    expect(G.v1.hiddenRoles.doctor).toBe('brain');
    expect(G.v1.activeRuleDefinitions.some(rule => rule.ruleId === 'brain_intrigue_ability')).toBe(true);
    expect(G.v1.activeRuleDefinitions.some(rule => rule.ruleId === 'key_person_death_loss')).toBe(false);
    expect((G.scriptSecret as any)?.cast).toBeUndefined();
  });

  it('validates incident culprit edits against scheduled ranges and cast', () => {
    const G = createGame();
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.daysPerLoop = 6;
    G.scriptSecret = {
      incidents: [{ day: 1, incidentId: 'murder', culpritCharacterId: 'culprit' }],
    } as any;
    G.v1.characters = {
      culprit: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
      doctor: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
      witness: { locationId: 'school', alive: true, tokens: createEmptyTokenBag() },
    };
    G.v1.pendingIncidents = [{
      id: '1_murder',
      day: 1,
      incidentId: 'murder',
      culpritId: 'culprit',
      targetSlots: [],
    }];
    G.v1.pendingInteractions = [{
      id: 'incident:1_murder',
      kind: 'incident_resolution',
      actorSeat: '0',
      phase: 'incidents',
      blocking: true,
      sourceId: '1_murder',
      day: 1,
      incidentId: 'murder',
      culpritId: 'culprit',
      description: '事件裁定：murder',
      targetSlots: [],
    }];

    const ok = (moves.setIncidentCulprit as any)(
      { G, playerID: '0' },
      1,
      'murder',
      'doctor',
    );
    const badDay = (moves.setIncidentCulprit as any)(
      { G, playerID: '0' },
      7,
      'murder',
      'culprit',
    );
    const badChar = (moves.setIncidentCulprit as any)(
      { G, playerID: '0' },
      1,
      'murder',
      'missing',
    );

    expect(ok).toBeUndefined();
    expect(badDay).toBe(INVALID_MOVE);
    expect(badChar).toBe(INVALID_MOVE);
    expect(G.v1.incidentCulprits['1_murder']).toBe('doctor');
    expect(G.v1.pendingIncidents[0].culpritId).toBe('doctor');
    expect(G.v1.pendingIncidents[0].targetSlots).toEqual([
      expect.objectContaining({
        slotId: 'target',
        eligibleCharacterIds: ['witness'],
      }),
    ]);
    expect(G.v1.pendingInteractions[0]).toEqual(
      expect.objectContaining({
        culpritId: 'doctor',
        targetSlots: [
          expect.objectContaining({
            slotId: 'target',
            eligibleCharacterIds: ['witness'],
          }),
        ],
      }),
    );
    expect((G.scriptSecret as any).incidents[0].culpritCharacterId).toBe('doctor');
  });

  it('rejects unsafe tabletop time edits and loop overflow', () => {
    const G = createGame();
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.maxLoops = 3;
    G.daysPerLoop = 6;
    G.v1.readyPlayers = { '1': true };

    const blockedByTransient = (moves.setLoopAndDay as any)(
      { G, ctx: { phase: 'mastermind_plan' }, playerID: '0' },
      1,
      2,
    );

    G.v1.readyPlayers = {};

    const blockedByPhase = (moves.setLoopAndDay as any)(
      { G, ctx: { phase: 'incidents' }, playerID: '0' },
      1,
      2,
    );

    const blockedByOverflow = (moves.setLoopAndDay as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
      3,
      1,
    );
    const allowedNonZeroDay = (moves.setLoopAndDay as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
      1,
      2,
    );

    expect(blockedByTransient).toBe(INVALID_MOVE);
    expect(blockedByPhase).toBe(INVALID_MOVE);
    expect(blockedByOverflow).toBe(INVALID_MOVE);
    expect(allowedNonZeroDay).toBeUndefined();
    expect(G.loopIndex).toBe(1);
    expect(G.day).toBe(2);
  });

  it('treats runtime incident interactions as transient console state even without pendingIncidents shadow', () => {
    const G = createGame();
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.maxLoops = 3;
    G.daysPerLoop = 6;
    G.v1.pendingInteractions = [{
      id: 'incident:1_murder',
      kind: 'incident_resolution',
      actorSeat: '0',
      phase: 'incidents',
      blocking: true,
      sourceId: '1_murder',
      day: 1,
      incidentId: 'murder',
      culpritId: 'culprit',
      description: '事件裁定：murder',
      targetSlots: [],
    }];
    G.v1.activeInteractionId = 'incident:1_murder';

    const result = (moves.setLoopAndDay as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
      1,
      0,
    );

    expect(result).toBe(INVALID_MOVE);
  });

  it('treats a day_end mandatory queue as transient console state', () => {
    const G = createGame();
    G.scriptOpen = { tragedySetId: 'mystery_circle' } as any;
    G.maxLoops = 3;
    G.daysPerLoop = 6;
    G.v1.pendingAbilities = [{
      id: 'serial_killer_day_end_kill:serial',
      ruleId: 'serial_killer_day_end_kill',
      characterId: 'serial',
      timing: 'day_end',
      phase: 'day_end',
      mandatory: true,
      description: 'serial killer day_end kill',
      targetSlots: [],
    }];

    const result = (moves.setLoopAndDay as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
      1,
      0,
    );

    expect(result).toBe(INVALID_MOVE);
  });

  it('jumps phase and auto-saves a rollback snapshot', () => {
    const G = createGame();
    G.day = 1;
    G.loopIndex = 0;

    const events = {
      setPhase: vi.fn(),
    };

    const result = (moves.jumpToPhase as any)(
      { G, ctx: { phase: 'time_spiral' }, events, playerID: '0' },
      'incidents',
    );

    expect(result).toBeUndefined();
    expect(events.setPhase).toHaveBeenCalledWith('incidents');
    expect(G.v1.mastermindConsole.lastSnapshot?.phase).toBe('time_spiral');
    expect(G.v1.mastermindConsole.lastSnapshot?.label).toContain('Before jump');
  });

  it('can jump back to a snapshot phase without overwriting that snapshot', () => {
    const G = createGame();
    (moves.createMastermindSnapshot as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
      'original-snapshot',
    );

    const events = {
      setPhase: vi.fn(),
    };

    const result = (moves.jumpToPhase as any)(
      { G, ctx: { phase: 'day_end' }, events, playerID: '0' },
      'time_spiral',
      true,
    );

    expect(result).toBeUndefined();
    expect(events.setPhase).toHaveBeenCalledWith('time_spiral');
    expect(G.v1.mastermindConsole.lastSnapshot?.label).toBe('original-snapshot');
  });

  it('rejects restoring a snapshot from a different phase to avoid mixed state', () => {
    const G = createGame();
    (moves.createMastermindSnapshot as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
      'phase-bound-snapshot',
    );

    const result = (moves.restoreMastermindSnapshot as any)(
      { G, ctx: { phase: 'day_end' }, playerID: '0' },
    );

    expect(result).toBe(INVALID_MOVE);
    expect(G.v1.mastermindConsole.lastSnapshot?.label).toBe('phase-bound-snapshot');
  });

  it('hides mastermind console snapshot data from protagonist playerView', () => {
    const G = createGame();
    (moves.createMastermindSnapshot as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
      'private-snapshot',
    );

    const protagonistView = (TragedyLooper.playerView as any)({ G, playerID: '1' }) as TragedyGameState;
    expect(protagonistView.v1.mastermindConsole.lastSnapshot).toBeNull();
    expect(protagonistView.v1.mastermindConsole.nextSnapshotId).toBe(0);
  });

  it('keeps secret console edits out of publicLog', () => {
    const G = createGame();
    G.scriptOpen = { tragedySetId: 'basic_tragedy' } as any;
    G.daysPerLoop = 6;
    G.v1.characters = {
      doctor: { locationId: 'city', alive: true, tokens: createEmptyTokenBag() },
    };

    (moves.setHiddenRole as any)({ G, playerID: '0' }, 'doctor', 'brain');
    (moves.setIncidentCulprit as any)({ G, playerID: '0' }, 1, 'murder', null);

    expect(G.publicLog.some(line => line.includes('隐藏身份'))).toBe(false);
    expect(G.publicLog.some(line => line.includes('事件当事人'))).toBe(false);
  });

  it('keeps snapshot and phase-jump console actions out of publicLog', () => {
    const G = createGame();

    (moves.createMastermindSnapshot as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
      'private-console-snapshot',
    );
    const restoreResult = (moves.restoreMastermindSnapshot as any)(
      { G, ctx: { phase: 'time_spiral' }, playerID: '0' },
    );
    const jumpEvents = {
      setPhase: vi.fn(),
    };
    const jumpResult = (moves.jumpToPhase as any)(
      { G, ctx: { phase: 'time_spiral' }, events: jumpEvents, playerID: '0' },
      'incidents',
    );

    expect(restoreResult).toBeUndefined();
    expect(jumpResult).toBeUndefined();
    expect(G.publicLog.some(line => line.includes('快照'))).toBe(false);
    expect(G.publicLog.some(line => line.includes('跳转阶段'))).toBe(false);
  });
});
