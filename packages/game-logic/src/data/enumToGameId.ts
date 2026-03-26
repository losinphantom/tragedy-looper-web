/**
 * Enum-to-Domain ID Mapping Tables
 *
 * Maps the ENUM-style IDs used in scripts-collection JSON files
 * to the snake_case IDs used in the game engine's domain layer.
 *
 * Translation (ENUM → Chinese display) is handled by translationService.ts
 * using enum-mapping.json as the single source of truth.
 */

import {
  BTX_PLOTS, FIRST_STEPS_PLOTS, MZ_PLOTS, MC_PLOTS,
  HSA_PLOTS, WM_PLOTS, AHR_PLOTS, LL_PLOTS,
} from '@tragedy/domain';

// ── Load enum-mapping.json for RULE_* → Chinese → domain plot ID lookup ─────
import enumMapping from '../../../../docs/game-knowledge/scripts/enum-mapping.json';

// ── Character: CH_* → domain characterId ──────────────────────────────────────

export const CHAR_ENUM_TO_DOMAIN: Record<string, string> = {
  'CH_STUDENT_M': 'boy_student',
  'CH_STUDENT_F': 'girl_student',
  'CH_RICH_MAN': 'rich_man',
  'CH_OFFICE_WORKER': 'office_worker',
  'CH_INFORMER': 'informer',
  'CH_POLICE_OFFICER': 'police_officer',
  'CH_DOCTOR': 'doctor',
  'CH_PATIENT': 'patient',
  'CH_SHRINE_MAIDEN': 'shrine_maiden',
  'CH_CLASS_REP': 'class_rep',
  'CH_MYSTERY_BOY': 'mystery_boy',
  'CH_ALIEN': 'alien',
  'CH_GODLY_BEING': 'godly_being',
  'CH_POP_IDOL': 'pop_idol',
  'CH_JOURNALIST': 'journalist',
  'CH_NURSE': 'nurse',
  'CH_HENCHMAN': 'henchman',
  'CH_A_I': 'ai',
  'CH_SOLDIER': 'soldier',
  'CH_DETECTIVE': 'detective',
  'CH_RICH_DAUGHTER': 'heiress',
  'CH_LITTLE_SISTER': 'sister',
  'CH_SCIENTIST': 'scholar',
  'CH_YOUNG_GIRL': 'little_girl',
  'CH_GOSHINBOKU': 'goshinboku',
  'CH_WILD_CARD': 'wild_card',
  'CH_TEACHER': 'teacher',
  'CH_CULT_LEADER': 'cult_leader',
  'CH_COPYCAT': 'copycat',
  'CH_TRANSFER_STUDENT': 'transfer_student',
  'CH_BLACK_CAT': 'black_cat',
  'CH_FORENSIC_SPECIALIST': 'informer',
  'CH_PART_TIMER': 'office_worker',
  'CH_SERVANT': 'henchman',
  'CH_METAWORLD_DENIZEN': 'godly_being',
  'CH_CRUSADER': 'soldier',
  'CH_ILLUSION': 'mystery_boy',
};

// ── Role: ROLE_* → domain roleId ──────────────────────────────────────────────

export const ROLE_ENUM_TO_DOMAIN: Record<string, string> = {
  'ROLE_PERSON': 'person',
  'ROLE_KEY_PERSON': 'key_person',
  'ROLE_BRAIN': 'brain',
  'ROLE_KILLER': 'killer',
  'ROLE_SERIAL_KILLER': 'serial_killer',
  'ROLE_CONSPIRACY_THEORIST': 'conspiracy_theorist',
  'ROLE_FRIEND': 'friend',
  'ROLE_CURMUDGEON': 'curmudgeon',
  'ROLE_CULTIST': 'cultist',
  'ROLE_FACTOR': 'factor',
  'ROLE_TIME_TRAVELER': 'time_traveler',
  'ROLE_LOVER': 'lover',
  'ROLE_LOVED_ONE': 'loved_one',
  'ROLE_WITCH': 'witch',
  'ROLE_FOOL': 'fool',
  'ROLE_OBSTINATE': 'obstinate',
  'ROLE_NINJA': 'ninja',
  'ROLE_TWIN': 'twin',
  'ROLE_PRIVATE_INVESTIGATOR': 'private_investigator',
  'ROLE_VAMPIRE': 'vampire',
  'ROLE_WEREWOLF': 'werewolf',
  'ROLE_NIGHTMARE': 'nightmare',
  'ROLE_GHOST': 'ghost',
  'ROLE_ZOMBIE': 'zombie',
  'ROLE_DEEP_ONE': 'deep_one',
  'ROLE_PROPHET': 'prophet',
  'ROLE_PARANOIAC': 'paranoiac',
  'ROLE_THERAPIST': 'therapist',
  'ROLE_AGENT': 'agent',
  'ROLE_IMMORTAL': 'immortal',
  'ROLE_POISONER': 'poisoner',
  'ROLE_INSTIGATOR': 'instigator',
  'ROLE_COWARD': 'coward',
  'ROLE_MAGICIAN': 'magician',
  'ROLE_SACRIFICE': 'sacrifice',
  'ROLE_POLTERGEIST': 'poltergeist',
  'ROLE_MONSTER': 'monster',
  'ROLE_WILDCARD': 'wildcard',
  'ROLE_MARIONETTE': 'marionette',
  'ROLE_SECRETKEEPER': 'secretkeeper',
  'ROLE_FRAGMENT': 'fragment',
  'ROLE_ALICE': 'alice',
  'ROLE_STORYTELLER': 'storyteller',
  'ROLE_FACELESS': 'faceless',
  'ROLE_WITNESS': 'witness',
  'ROLE_GOSSIP': 'gossip',
  'ROLE_SHOW_OFF': 'show_off',
  'ROLE_INFLUENCER': 'influencer',
  'ROLE_WATCHER': 'watcher',
  'ROLE_HORROR': 'horror',
  'ROLE_OVERLORD': 'overlord',
  'ROLE_CURSE_GOD': 'curse_god',
  'ROLE_SPELLCASTER': 'spellcaster',
  'ROLE_ZEALOT': 'zealot',
  'ROLE_LIGHT_OF_DAWN': 'light_of_dawn',
  'ROLE_PSYCHOPATH': 'psychopath',
  'ROLE_LULLABY': 'lullaby',
  'ROLE_KEY_PERSON_AND_BRAIN': 'key_person',
  'ROLE_CONSPIRACY_THEORIST_AND_SERIAL_KILLER': 'conspiracy_theorist',
  'ROLE_CONSPIRACY_THEORIST_AND_OBSTINATE': 'conspiracy_theorist',
  'ROLE_PERSON_AND_SERIAL_KILLER': 'person',
  'ROLE_OBSTINATE_AND_KEY_PERSON': 'obstinate',
  'ROLE_PIED_PIPER_AND_GOSSIP': 'gossip',
};

// ── Incident: INC_* → domain incidentId ───────────────────────────────────────

export const INC_ENUM_TO_DOMAIN: Record<string, string> = {
  'INC_MURDER': 'murder',
  'INC_SUICIDE': 'suicide',
  'INC_HOSPITAL_INCIDENT': 'hospital_incident',
  'INC_INCREASING_UNEASE': 'increasing_unease',
  'INC_MISSING_PERSON': 'missing_person',
  'INC_SPREADING': 'spreading',
  'INC_BUTTERFLY_EFFECT': 'butterfly_effect',
  'INC_FOUL_EVIL': 'foul_evil',
  'INC_FARAWAY_MURDER': 'faraway_murder',
  'INC_FIRE': 'fire',
  'INC_RIOT': 'riot',
  'INC_ASSASSINATION': 'assassination',
  'INC_SERIAL_MURDER': 'serial_murder',
  'INC_FAKE_SUICIDE': 'fake_suicide',
  'INC_CONFESSION': 'confession',
  'INC_DISCOVERY': 'discovery',
  'INC_BRAINWASHING': 'brainwashing',
  'INC_TERROR_ATTACK': 'terror_attack',
  'INC_PORTENT': 'portent',
  'INC_LOCKDOWN': 'lockdown',
  'INC_LAST_WILL': 'last_will',
  'INC_MADNESS_NIGHT': 'madness_night',
  'INC_SINGULARITY': 'singularity',
  'INC_WORLD_CONVERGENCE': 'world_convergence',
  'INC_WORLD_COLLAPSE': 'world_collapse',
  'INC_SILVER_BULLET': 'silver_bullet',
  'INC_COLLECTIVE_SUICIDE': 'collective_suicide',
  'INC_IMPULSIVE_MURDER': 'impulsive_murder',
  'INC_PUBLIC_MELTDOWN': 'public_meltdown',
  'INC_CONSPIRACY': 'conspiracy',
  'INC_FUNERAL': 'funeral',
};

// ── Module: MOD_* → tragedySetId ──────────────────────────────────────────────

export const MOD_ENUM_TO_DOMAIN: Record<string, string> = {
  'MOD_FIRST_STEPS': 'first_steps',
  'MOD_BASIC_TRAGEDY': 'basic_tragedy',
  'MOD_MIDNIGHT_ZONE': 'midnight_zone',
  'MOD_MYSTERY_CIRCLE': 'mystery_circle',
  'MOD_HAUNTED_STAGE': 'haunted_stage',
  'MOD_HAUNTED_STAGE_AGAIN': 'haunted_stage_again',
  'MOD_COSMIC_MYTHOLOGY': 'weird_mythology',
  'MOD_ANOTHER_HORIZON': 'another_horizon',
  'MOD_ANOTHER_HORIZON_REVISED': 'another_horizon_revised',
  'MOD_LAST_LIAR': 'last_liar',
  'MOD_SUPERNATURAL': 'supernatural',
  'MOD_UNKNOWN': 'unknown',
};

// ── Plot rules: RULE_* → domain plotId ────────────────────────────────────────
// Uses enum-mapping.json (RULE_* → Chinese) + domain plot databases (Chinese → key)

const ALL_PLOT_DATABASES = [
  BTX_PLOTS, FIRST_STEPS_PLOTS, MZ_PLOTS, MC_PLOTS,
  HSA_PLOTS, WM_PLOTS, AHR_PLOTS, LL_PLOTS,
];

// Build: zh-CN label → domain plot key
const LABEL_TO_PLOT_ID: Record<string, string> = {};
for (const db of ALL_PLOT_DATABASES) {
  for (const [key, plot] of Object.entries(db)) {
    const label = (plot as any).label?.['zh-CN'];
    if (label && !LABEL_TO_PLOT_ID[label]) {
      LABEL_TO_PLOT_ID[label] = key;
    }
  }
}

// Build: valid domain plot keys set
const VALID_PLOT_IDS = new Set<string>();
for (const db of ALL_PLOT_DATABASES) {
  for (const key of Object.keys(db)) {
    VALID_PLOT_IDS.add(key);
  }
}

// Build: RULE_* enum → Chinese from enum-mapping.json (automated, not hardcoded!)
interface EnumEntry { id: string; en: string }
const RULE_ENUM_TO_ZH: Record<string, string> = {};
for (const [zhLabel, entry] of Object.entries(enumMapping.rules as Record<string, EnumEntry>)) {
  if (entry.id) {
    RULE_ENUM_TO_ZH[entry.id] = zhLabel;
  }
}

export function resolvePlotId(enumId: string): string {
  // Strategy 1: Auto-convert RULE_X_Y_Z → x_y_z and check domain databases
  const autoKey = enumId.replace(/^RULE_/, '').toLowerCase();
  if (VALID_PLOT_IDS.has(autoKey)) return autoKey;

  // Strategy 2: RULE_* → Chinese (enum-mapping.json) → domain plot key
  const zhLabel = RULE_ENUM_TO_ZH[enumId];
  if (zhLabel && LABEL_TO_PLOT_ID[zhLabel]) return LABEL_TO_PLOT_ID[zhLabel];

  // Strategy 3: Return auto-converted key as fallback
  return autoKey;
}

// ── Resolver helpers ────────────────────────────────────────────────────────

export function resolveCharId(enumId: string): string {
  return CHAR_ENUM_TO_DOMAIN[enumId] || enumId;
}
export function resolveRoleId(enumId: string): string {
  return ROLE_ENUM_TO_DOMAIN[enumId] || enumId;
}
export function resolveIncidentId(enumId: string): string {
  return INC_ENUM_TO_DOMAIN[enumId] || enumId;
}
export function resolveModuleId(enumId: string): string {
  return MOD_ENUM_TO_DOMAIN[enumId] || enumId;
}
