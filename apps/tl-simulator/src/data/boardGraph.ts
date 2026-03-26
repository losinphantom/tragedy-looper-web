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
 *
 * Adjacency:
 *   vertical:   hospital↔city,   shrine↔school
 *   horizontal: hospital↔shrine, city↔school
 *   diagonal:   hospital↔school, shrine↔city
 *
 * Movement rules (from adjudicationNotes.movement_legality):
 *   - Combine all movement cards into a single final axis via vector addition
 *   - Look up the destination from the current location + final axis
 *   - If destination is out of bounds or forbidden → entire movement cancelled
 *   - No partial movement, no wrapping
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type LocationId = 'hospital' | 'shrine' | 'city' | 'school';
export type MoveAxis = 'vertical' | 'horizontal' | 'diagonal';

// ── Adjacency graph ──────────────────────────────────────────────────────────

/**
 * For each location, defines the destination when moving along each axis.
 * `null` means movement in that direction is impossible (out of bounds).
 * In a 2×2 grid every direction is always valid, but this structure
 * generalizes to larger boards or expansion maps.
 */
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

// ── Location metadata (for UI) ──────────────────────────────────────────────

export const LOCATION_LABELS: Record<LocationId, string> = {
  hospital: '医院',
  shrine:   '神社',
  city:     '都市',
  school:   '学校',
};

export const ALL_LOCATIONS: LocationId[] = ['hospital', 'shrine', 'city', 'school'];

// ── Movement helpers ─────────────────────────────────────────────────────────

/**
 * Given a character's current location and a resolved movement axis,
 * returns the destination location, or null if the move is illegal.
 */
export function getMovementDestination(
  from: LocationId,
  axis: MoveAxis,
): LocationId | null {
  return ADJACENCY[from]?.[axis] ?? null;
}

/**
 * Check if a location ID is valid.
 */
export function isValidLocation(id: string): id is LocationId {
  return id in ADJACENCY;
}
