import type { IncidentRecord } from '../dictionary';

export const OF_INCIDENTS: Record<string, IncidentRecord> = {
  overflowing_miasma: { id: 'overflowing_miasma', label: { 'zh-CN': '溢出的瘴气', en: 'Overflowing Miasma' }, rules: [{ id: 'of_incident_overflowing_miasma', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '往当事人所在版图和另外1块版图各放置1枚[密谋]。' } }], source: { setId: 'old_fashion' } },
  murder: { id: 'murder', label: { 'zh-CN': '谋杀', en: 'Murder' }, rules: [{ id: 'of_incident_murder', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '与当事人位于同一区域的另外1名角色死亡。' } }], source: { setId: 'old_fashion' } },
  hospital_incident: { id: 'hospital_incident', label: { 'zh-CN': '医院事故', en: 'Hospital Incident' }, rules: [{ id: 'of_incident_hospital', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '医院有1枚或以上[密谋]→位于医院的所有角色死亡。医院有2枚或以上[密谋]→主人公死亡。' } }], source: { setId: 'old_fashion' } },
  suicide: { id: 'suicide', label: { 'zh-CN': '自杀', en: 'Suicide' }, rules: [{ id: 'of_incident_suicide', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '当事人死亡。' } }], source: { setId: 'old_fashion' } },
  twisted_spacetime: { id: 'twisted_spacetime', label: { 'zh-CN': '歪曲的时空', en: 'Twisted Spacetime' }, rules: [{ id: 'of_incident_twisted_spacetime', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '事件触发的次日，剧作家可以放置4张行动牌，且主人公方只能放置2张。' } }], source: { setId: 'old_fashion' } },
  unsettling_rumor: { id: 'unsettling_rumor', label: { 'zh-CN': '不安的传言', en: 'Unsettling Rumor' }, rules: [{ id: 'of_incident_unsettling_rumor', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '往当事人所在区域的所有角色身上放置2枚[不安]。' } }], source: { setId: 'old_fashion' } },
  exposure: { id: 'exposure', label: { 'zh-CN': '暴露', en: 'Exposure' }, rules: [{ id: 'of_incident_exposure', timing: 'incident_resolve', mandatory: true, visibility: 'public_result', summary: { 'zh-CN': '选择一项发动：从当事人所在区域的所有角色身上移除[友好]直到剩余2枚；或放置[友好]直到2枚。' } }], source: { setId: 'old_fashion' } },
};
