import { getCharLabel } from '../board/boardHelpers';
import type { OverlayEvent, ResolutionOverlayModel } from './resolutionOverlayTypes';
import {
  getEffectStepState,
  getLocationLabel,
  getOverlaySubjectMeta,
  getTargetMeta,
  summarizeEffects,
} from './resolutionOverlayShared';

export function isResolutionSequenceType(type: string): boolean {
  return type.startsWith('resolve_');
}

function buildResolveEffectTitle(payload: any): string {
  const effects = Array.isArray(payload?.effects) ? payload.effects : [];
  const targetMeta = getTargetMeta(payload);
  const subject = targetMeta.targetLabel || '目标';

  if (effects.some((effect: any) => effect.kind === 'move')) {
    return `${subject} 发生了移动`;
  }
  if (effects.some((effect: any) => effect.kind === 'counter')) {
    return `${subject} 的状态发生变化`;
  }
  if (effects.some((effect: any) => effect.kind === 'forbidden')) {
    return `${subject} 受到限制效果`;
  }
  if (effects.some((effect: any) => effect.kind === 'no_effect')) {
    return `${subject} 本次没有受到影响`;
  }
  return `${subject} 的效果结算`;
}

export function buildResolutionSequenceModel(event: OverlayEvent): ResolutionOverlayModel | null {
  const { type, payload } = event;
  if (!isResolutionSequenceType(type)) return null;

  const targetMeta = getTargetMeta(payload);
  const sharedMeta = {
    ...targetMeta,
    ...getOverlaySubjectMeta(payload),
  };

  if (type === 'resolve_effect') {
    const stepState = getEffectStepState(payload);
    const stageLabels = ['禁止移动', '移动处理', '禁止效果', '其余效果'];
    return {
      variant: 'sequence',
      stageLabel: stageLabels[stepState.currentStep] || '效果结算',
      title: buildResolveEffectTitle(payload),
      summary: summarizeEffects(payload),
      detail: targetMeta.targetLabel ? `当前焦点：${targetMeta.targetLabel}` : undefined,
      ...stepState,
      ...sharedMeta,
    };
  }

  if (type === 'resolve_move') {
    const fromLabel = getLocationLabel(payload?.from);
    const toLabel = getLocationLabel(payload?.to);
    return {
      variant: 'sequence',
      stageLabel: '角色移动',
      title: '执行位移结果',
      summary: payload?.charId
        ? `${getCharLabel(payload.charId)}：${fromLabel} → ${toLabel}`
        : `${fromLabel} → ${toLabel}`,
      currentStep: 1,
      invalidCardIds: [],
      ...sharedMeta,
    };
  }

  return null;
}
