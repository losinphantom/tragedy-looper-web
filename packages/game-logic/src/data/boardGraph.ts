/**
 * Board Graph — defines the 2×2 location grid and movement logic.
 *
 * The standard Tragedy Looper board is a 2×2 grid:
 *
 *   ┌──────────┬──────────┐
 *   │ hospital │  shrine  │
 *   ├──────────┼──────────┤
 *   │   city   │  school  │
 *   └──────────┴──────────┘
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type LocationId = 'hospital' | 'shrine' | 'city' | 'school';
export type MoveAxis = 'vertical' | 'horizontal' | 'diagonal';

// ── Adjacency graph ──────────────────────────────────────────────────────────

const ADJACENCY: Record<LocationId, Record<MoveAxis, LocationId | null>> = {
  hospital: {
    vertical:   'city',
    horizontal: 'shrine',
    diagonal:   'school',
  },
  shrine: {
    vertical:   'school',
    horizontal: 'hospital',
    diagonal:   'city',
  },
  city: {
    vertical:   'hospital',
    horizontal: 'school',
    diagonal:   'shrine',
  },
  school: {
    vertical:   'shrine',
    horizontal: 'city',
    diagonal:   'hospital',
  },
};

// ── Location metadata ────────────────────────────────────────────────────────

export const LOCATION_LABELS: Record<LocationId, string> = {
  hospital: '医院',
  shrine:   '神社',
  city:     '都市',
  school:   '学校',
};

export const ALL_LOCATIONS: LocationId[] = ['hospital', 'shrine', 'city', 'school'];

// ── Movement helpers ─────────────────────────────────────────────────────────

export function getMovementDestination(
  from: LocationId,
  axis: MoveAxis,
): LocationId | null {
  return ADJACENCY[from]?.[axis] ?? null;
}

export function isValidLocation(id: string): id is LocationId {
  return id in ADJACENCY;
}
