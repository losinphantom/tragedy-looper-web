/**
 * Movement Composer — movement vector algebra for action card resolution.
 *
 * Implements the Tragedy Looper movement composition table:
 *   vertical + horizontal = diagonal
 *   diagonal + horizontal = vertical
 *   diagonal + vertical   = horizontal
 */

export type Axis = 'vertical' | 'horizontal' | 'diagonal';

const MOVE_COMBINE: Record<Axis, Record<Axis, Axis>> = {
  vertical:   { vertical: 'vertical',   horizontal: 'diagonal',   diagonal: 'horizontal' },
  horizontal: { vertical: 'diagonal',   horizontal: 'horizontal', diagonal: 'vertical'   },
  diagonal:   { vertical: 'horizontal', horizontal: 'vertical',   diagonal: 'diagonal'   },
};

/** Combine two movement axes using the board game's vector-addition rule. */
export function combineMoveAxes(a: Axis, b: Axis): Axis {
  return MOVE_COMBINE[a][b];
}

/** Resolve a list of movement card axes into a single final direction (or null if empty). */
export function resolveMovementStack(axes: Axis[]): Axis | null {
  if (axes.length === 0) return null;
  return axes.reduce((acc, cur) => combineMoveAxes(acc, cur));
}
