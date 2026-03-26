/**
 * Roles Module — 身份统一查询 API
 */

import type { RoleRecord } from '../dictionary';
import { getModuleData, getAllTragedySetIds } from './tragedySets.module';

/** 按模组 + 身份 ID 查询 */
export function getRoleById(setId: string, roleId: string): RoleRecord | undefined {
  const exact = getModuleData(setId)?.roles[roleId];
  if (exact) return exact;

  for (const candidateSetId of getAllTragedySetIds()) {
    if (candidateSetId === setId) continue;
    const fallback = getModuleData(candidateSetId)?.roles[roleId];
    if (fallback) return fallback;
  }

  return undefined;
}

/** 获取模组下所有身份 */
export function getRolesForSet(setId: string): RoleRecord[] {
  const data = getModuleData(setId);
  return data ? Object.values(data.roles) : [];
}

/** 跨模组查找身份（返回第一个匹配） */
export function findRoleById(roleId: string): RoleRecord | undefined {
  for (const setId of getAllTragedySetIds()) {
    const role = getRoleById(setId, roleId);
    if (role) return role;
  }
  return undefined;
}
