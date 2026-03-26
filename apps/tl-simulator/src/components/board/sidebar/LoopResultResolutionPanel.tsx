import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import type { LoopResultPanelViewModel } from '../runtimeInteractionView';
import type { SidebarInteractionMoves } from './sidebarInteractionHelpers';
import { cn } from '../../../lib/utils';

type LoopResultResolutionPanelProps = {
  panel: LoopResultPanelViewModel;
  isMastermind: boolean;
  loopResultReasonId: string | null;
  setLoopResultReasonId: React.Dispatch<React.SetStateAction<string | null>>;
  loopResultOutcomeId: string | null;
  setLoopResultOutcomeId: React.Dispatch<React.SetStateAction<string | null>>;
  interactionMoves: SidebarInteractionMoves;
};

export const LoopResultResolutionPanel: React.FC<LoopResultResolutionPanelProps> = ({
  panel,
  isMastermind,
  loopResultReasonId,
  setLoopResultReasonId,
  loopResultOutcomeId,
  setLoopResultOutcomeId,
  interactionMoves,
}) => {
  if (!panel.visible || !panel.interaction) {
    return null;
  }

  const interaction = panel.interaction;
  const displayedReasons = interaction.failureReasons.length > 0
    ? interaction.failureReasons
    : [{ id: '__none', label: '当前没有更细的结构化失败原因', detail: '请结合右侧日志复核。' }];

  return (
    <Dialog.Root open={panel.visible}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[7200] bg-black/65 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[7201] w-[min(760px,94vw)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-gold-500/45 bg-[#161109]/96 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.72)] focus:outline-none',
          )}
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="h-3 w-1.5 rounded-full bg-gold-500 shadow-[0_0_6px_rgba(234,179,8,0.6)]"></span>
            <Dialog.Title className="text-[10px] font-black uppercase tracking-widest text-gold-300">
              轮回结果确认
            </Dialog.Title>
            <span className="ml-auto text-[9px] text-gold-400/60">{interaction.resultLabel}</span>
          </div>

          {!isMastermind && (
            <Dialog.Description className="rounded-lg border border-gold-800/30 bg-obsidian-900/60 px-4 py-4 text-center text-[11px] text-slate-300">
              剧作家正在确认轮回结果，公共结果会在确认后继续推进。
            </Dialog.Description>
          )}

          {isMastermind && (
            <div className="space-y-3">
              <Dialog.Description className="rounded-lg border border-gold-800/30 bg-obsidian-900/60 px-3 py-2">
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-gold-300">当前结果</div>
                <div className="mt-1 text-[12px] font-bold text-white">{interaction.resultLabel}</div>
                <div className="mt-1 text-[10px] leading-5 text-slate-400">{interaction.description}</div>
              </Dialog.Description>

              <div className="rounded-lg border border-gold-800/30 bg-obsidian-900/60 px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-gold-300">失败原因</div>
                <div className="mt-2 space-y-1.5">
                  {displayedReasons.map((reason) => (
                    <button
                      key={reason.id}
                      onClick={() => setLoopResultReasonId(reason.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-[10px] transition-all ${
                        loopResultReasonId === reason.id
                          ? 'border-gold-500/60 bg-gold-900/30 text-gold-100'
                          : 'border-slate-700/50 bg-obsidian-800/60 text-slate-300 hover:bg-obsidian-700'
                      }`}
                    >
                      <div className="font-bold">{reason.label}</div>
                      {reason.detail && <div className="mt-1 text-slate-400">{reason.detail}</div>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-gold-800/30 bg-obsidian-900/60 px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-gold-300">后续流向</div>
                <div className="mt-2 space-y-1.5">
                  {interaction.availableOutcomes.map((outcome) => (
                    <button
                      key={outcome.id}
                      onClick={() => setLoopResultOutcomeId(outcome.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-[10px] transition-all ${
                        loopResultOutcomeId === outcome.id
                          ? 'border-gold-500/60 bg-gold-900/30 text-gold-100'
                          : 'border-slate-700/50 bg-obsidian-800/60 text-slate-300 hover:bg-obsidian-700'
                      }`}
                    >
                      <div className="font-bold">{outcome.label}</div>
                      {outcome.detail && <div className="mt-1 text-slate-400">{outcome.detail}</div>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-gold-800/30 bg-obsidian-900/60 px-3 py-2">
                <div className="text-[10px] font-black uppercase tracking-[0.22em] text-gold-300">附加效果</div>
                {interaction.effectOptions.length > 0 ? (
                  <div className="mt-2 space-y-1.5">
                    {interaction.effectOptions.map((effect) => (
                      <div
                        key={effect.id}
                        className="w-full rounded-lg border border-slate-700/50 bg-obsidian-800/60 px-3 py-2 text-left text-[10px] text-slate-300"
                      >
                        <div className="font-bold">{effect.label}</div>
                        {effect.detail && <div className="mt-1 text-slate-400">{effect.detail}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 rounded-lg border border-dashed border-gold-900/40 bg-obsidian-950/50 px-3 py-2 text-[10px] text-slate-500">
                    本次没有额外的结构化附加效果，确认后会直接按当前结果继续推进。
                  </div>
                )}
              </div>

              <button
                onClick={() => interactionMoves.confirmLoopResult(loopResultReasonId || undefined, loopResultOutcomeId || undefined)}
                disabled={interaction.availableOutcomes.length > 0 && !loopResultOutcomeId}
                className="w-full rounded-lg border border-gold-500/50 bg-gold-700 py-2 text-[11px] font-black text-white transition-all hover:bg-gold-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                确认结果
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
