import { describe, expect, it } from 'vitest';

import { getMovingCharacterId } from './MovementAnimationLayer';

describe('getMovingCharacterId', () => {
  it('returns the moving character for board move animations', () => {
    expect(getMovingCharacterId({
      type: 'char_move',
      payload: { charId: 'doctor' },
    })).toBe('doctor');
  });

  it('ignores resolve_move overlay events so the board move waits for char_move', () => {
    expect(getMovingCharacterId({
      type: 'resolve_move',
      payload: { charId: 'boy_student' },
    })).toBeNull();
  });

  it('ignores unrelated animation types', () => {
    expect(getMovingCharacterId({
      type: 'incident_announce',
      payload: { charId: 'doctor' },
    })).toBeNull();
  });
});
