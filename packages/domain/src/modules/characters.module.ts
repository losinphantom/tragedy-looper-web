/**
 * Characters Module — 角色统一查询 API
 */

import type { CharacterRecord } from '../dictionary';
import { CHARACTERS } from '../data/characters';

/** 按 ID 查询角色 */
export function getCharacterById(id: string): CharacterRecord | undefined {
  return CHARACTERS[id];
}

/** 获取所有角色 ID */
export function getAllCharacterIds(): string[] {
  return Object.keys(CHARACTERS);
}

/** 获取所有角色记录 */
export function getAllCharacters(): CharacterRecord[] {
  return Object.values(CHARACTERS);
}

/** 按 trait 筛选角色 */
export function getCharactersByTrait(trait: string): CharacterRecord[] {
  return Object.values(CHARACTERS).filter(c => c.traits.includes(trait));
}

/** 按起始地点筛选角色 */
export function getCharactersByStartLocation(locationId: string): CharacterRecord[] {
  return Object.values(CHARACTERS).filter(c => c.startingLocations.includes(locationId));
}
