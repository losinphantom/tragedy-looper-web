import { getCharLabel } from '../board/boardHelpers';
import type { ResolutionOverlayModel } from './resolutionOverlayTypes';

const LOCATION_LABELS: Record<string, string> = {
  hospital: '医院',
  shrine: '神社',
  city: '都市',
  school: '学校',
};

const COUNTER_LABELS: Record<string, string> = {
  paranoia: '不安',
  goodwill: '友好',
  intrigue: '密谋',
  ex: 'Ex',
};

function normalizeCounter(counter?: string): string {
  return (counter || '').replace(/_plus$|_minus$/, '');
}

function formatDelta(delta?: number): string {
  if (typeof delta !== 'number' || Number.isNaN(delta)) return '';
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export function getLocationLabel(locationId?: string): string {
  if (!locationId) return '未知区域';
  return LOCATION_LABELS[locationId] || locationId;
}

export function getTargetMeta(payload: any): Pick<ResolutionOverlayModel, 'targetLabel' | 'targetKindLabel'> {
  if (payload?.targetType === 'character' && payload?.targetId) {
    return {
      targetLabel: getCharLabel(payload.targetId),
      targetKindLabel: '角色',
    };
  }

  if (payload?.targetType === 'location' && payload?.targetId) {
    return {
      targetLabel: getLocationLabel(payload.targetId),
      targetKindLabel: '地点',
    };
  }

  if (payload?.charId) {
    return {
      targetLabel: getCharLabel(payload.charId),
      targetKindLabel: '角色',
    };
  }

  if (payload?.locationId) {
    return {
      targetLabel: getLocationLabel(payload.locationId),
      targetKindLabel: '地点',
    };
  }

  if (payload?.characterId) {
    return {
      targetLabel: getCharLabel(payload.characterId),
      targetKindLabel: '角色',
    };
  }

  return {};
}

export function getOverlaySubjectMeta(
  payload: any,
): Pick<ResolutionOverlayModel, 'subjectCharacterId' | 'locationLabel'> {
  return {
    subjectCharacterId: typeof payload?.characterId === 'string' ? payload.characterId : undefined,
    locationLabel: payload?.locationId ? getLocationLabel(payload.locationId) : undefined,
  };
}

export function getEffectStepState(payload: any): Pick<ResolutionOverlayModel, 'currentStep' | 'invalidCardIds'> {
  const effects = Array.isArray(payload?.effects) ? payload.effects : [];
  const invalidCardIds = effects
    .filter((effect: any) => effect.kind === 'forbidden' && typeof effect.cardId === 'string')
    .map((effect: any) => effect.cardId);

  if (effects.some((effect: any) => effect.kind === 'forbidden' && String(effect.reason || '').includes('移动'))) {
    return { currentStep: 0, invalidCardIds };
  }

  if (effects.some((effect: any) => effect.kind === 'move')) {
    return { currentStep: 1, invalidCardIds };
  }

  if (effects.some((effect: any) => effect.kind === 'forbidden')) {
    return { currentStep: 2, invalidCardIds };
  }

  return { currentStep: 3, invalidCardIds };
}

export function summarizeEffects(payload: any): string {
  const effects = Array.isArray(payload?.effects) ? payload.effects : [];
  if (effects.length === 0) return '本步没有额外效果。';

  const parts: string[] = [];

  const counterParts = effects
    .filter((effect: any) => effect.kind === 'counter')
    .map((effect: any) => {
      const counterKey = normalizeCounter(effect.counter);
      const counterLabel = COUNTER_LABELS[counterKey] || counterKey || '数值';
      return `${counterLabel}${formatDelta(effect.delta)}`;
    });

  if (counterParts.length > 0) {
    parts.push(counterParts.join(' / '));
  }

  const moveCount = effects.filter((effect: any) => effect.kind === 'move').length;
  if (moveCount > 0) {
    parts.push(moveCount === 1 ? '触发角色移动' : `触发 ${moveCount} 个移动效果`);
  }

  const forbiddenReasons = effects
    .filter((effect: any) => effect.kind === 'forbidden')
    .map((effect: any) => String(effect.reason || '效果被禁止'));
  if (forbiddenReasons.length > 0) {
    parts.push(forbiddenReasons.slice(0, 2).join(' / '));
  }

  const noEffectCount = effects.filter((effect: any) => effect.kind === 'no_effect').length;
  if (noEffectCount > 0) {
    parts.push(noEffectCount === 1 ? '1 个效果落空' : `${noEffectCount} 个效果落空`);
  }

  return parts.join(' · ') || '本步没有额外效果。';
}
