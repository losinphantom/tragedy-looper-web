import { ResultAnnouncementPayloadSchema } from '@tragedy/game-logic';
import { getCharLabel } from '../board/boardHelpers';
import type { OverlayEvent, ResolutionOverlayModel } from './resolutionOverlayTypes';
import { getLocationLabel, getOverlaySubjectMeta, getTargetMeta } from './resolutionOverlayShared';

export function isResolutionAnnouncementType(type: string): boolean {
  return type === 'incident_announce' || type === 'ability_announce' || type === 'result_announce';
}

function buildResultAnnouncementModel(payload: any): ResolutionOverlayModel {
  const parsedPayload = ResultAnnouncementPayloadSchema.safeParse(payload);
  const normalizedPayload = parsedPayload.success ? parsedPayload.data : {
    resultType: String(payload?.resultType || ''),
    title: payload?.title || '结果公布',
    summary: payload?.summary || '关键结果已经确定。',
    detail: payload?.detail || undefined,
  };
  const resultType = String(normalizedPayload.resultType || '');
  const isFailure = resultType === 'loop_failure' || resultType === 'game_defeat';
  const stageLabelMap: Record<string, string> = {
    loop_failure: '轮回失败',
    loop_end: '轮回结束',
    game_victory: '胜利结果',
    game_defeat: '失败结果',
  };

  return {
    variant: 'announce',
    accentTone: isFailure ? 'blood' : 'gold',
    stageLabel: stageLabelMap[resultType] || '结果公布',
    title: normalizedPayload.title,
    summary: normalizedPayload.summary,
    detail: normalizedPayload.detail || undefined,
    currentStep: 3,
    invalidCardIds: [],
    ...getOverlaySubjectMeta(normalizedPayload),
  };
}

function buildIncidentAnnouncementModel(payload: any): ResolutionOverlayModel {
  const targetMeta = getTargetMeta(payload);
  const triggered = payload?.outcome !== 'not_triggered';
  return {
    variant: 'announce',
    accentTone: 'blood',
    stageLabel: triggered ? '事件发生' : '事件未发生',
    title: payload?.incidentName || (triggered ? '事件发生' : '事件未发生'),
    summary: payload?.description || (triggered ? '关键事件已进入结算。' : '事件未发生。'),
    detail: payload?.detail || (
      payload?.characterId
        ? `${getCharLabel(payload.characterId)} 受本次事件影响。`
        : payload?.locationId
          ? `地点：${getLocationLabel(payload.locationId)}`
          : undefined
    ),
    currentStep: 3,
    invalidCardIds: [],
    ...targetMeta,
    ...getOverlaySubjectMeta(payload),
  };
}

function buildAbilityAnnouncementModel(payload: any): ResolutionOverlayModel {
  const targetMeta = getTargetMeta(payload);
  const isGoodwill = payload?.resultType === 'goodwill';
  const outcome = payload?.outcome === 'rejected' ? 'rejected' : 'allowed';
  return {
    variant: 'announce',
    accentTone: isGoodwill ? 'pink' : 'blood',
    stageLabel: isGoodwill ? '友好能力' : '能力结算',
    title: payload?.abilityName || '能力发动',
    summary: isGoodwill
      ? (payload?.description || (payload?.characterId
          ? `${getCharLabel(payload.characterId)} 的友好能力${outcome === 'rejected' ? '被拒绝。' : '已生效。'}`
          : '友好能力已结算。'))
      : (payload?.characterId
          ? `${getCharLabel(payload.characterId)} 的能力开始结算。`
          : '能力效果已进入结算。'),
    detail: payload?.detail || payload?.abilityLabel || undefined,
    currentStep: 3,
    invalidCardIds: [],
    ...targetMeta,
    ...getOverlaySubjectMeta(payload),
  };
}

export function buildResolutionAnnouncementModel(event: OverlayEvent): ResolutionOverlayModel | null {
  const { type, payload } = event;

  if (type === 'result_announce') {
    return buildResultAnnouncementModel(payload);
  }

  if (type === 'incident_announce') {
    return buildIncidentAnnouncementModel(payload);
  }

  if (type === 'ability_announce') {
    return buildAbilityAnnouncementModel(payload);
  }

  return null;
}
