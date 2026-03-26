import React, { useState } from 'react';
import { getCharLabel, LOCATION_LABELS_MAP } from './boardHelpers';
import { InteractionDock } from './InteractionDock';
import type { ButterflyChoicePanelViewModel } from './runtimeInteractionView';

export interface ButterflyChoiceModalProps {
  viewModel: ButterflyChoicePanelViewModel;
  isMastermind: boolean;
  moves: Record<string, (...args: any[]) => void>;
}

// ── Component ────────────────────────────────────────────────────────────────

export const ButterflyChoiceModal: React.FC<ButterflyChoiceModalProps> = ({
  viewModel, isMastermind, moves,
}) => {
  const [selectedToken, setSelectedToken] = useState<'goodwill' | 'paranoia' | 'intrigue' | null>(null);
  const { visible, interaction } = viewModel;

  if (!visible) return null;
  if (!interaction || !isMastermind) return null;
  const targetLabel = interaction.targetKind === 'location'
    ? (LOCATION_LABELS_MAP[interaction.targetId] || interaction.targetId)
    : getCharLabel(interaction.targetId);

  const TOKEN_OPTIONS: Array<{ key: 'goodwill' | 'paranoia' | 'intrigue'; label: string; color: string; icon: string }> = [
    { key: 'goodwill', label: '友好', color: 'emerald', icon: '💚' },
    { key: 'paranoia', label: '不安', color: 'amber', icon: '💛' },
    { key: 'intrigue', label: '密谋', color: 'blood', icon: '❤️' },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-700 border-emerald-500 hover:bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
    amber: 'bg-amber-700 border-amber-500 hover:bg-amber-600 shadow-[0_0_10px_rgba(234,179,8,0.3)]',
    blood: 'bg-blood-700 border-blood-500 hover:bg-blood-600 shadow-[0_0_10px_rgba(225,29,72,0.3)]',
  };

  const colorMapInactive: Record<string, string> = {
    emerald: 'bg-obsidian-700 border-emerald-800/50 hover:bg-obsidian-600 text-emerald-400',
    amber: 'bg-obsidian-700 border-amber-800/50 hover:bg-obsidian-600 text-amber-400',
    blood: 'bg-obsidian-700 border-blood-800/50 hover:bg-obsidian-600 text-blood-400',
  };

  return (
    <InteractionDock
      tone="violet"
      title="蝴蝶效应"
      badge="选择 1 项"
      subtitle={`目标锁定为 ${targetLabel}。保持盘面可见，方便确认该目标当前状态。`}
      footer={(
        <div className="flex justify-end">
          <button
            onClick={() => {
              if (selectedToken) {
                moves.chooseButterflyToken(selectedToken);
                setSelectedToken(null);
              }
            }}
            disabled={!selectedToken}
            className="rounded-xl border border-purple-500/50 bg-purple-700 px-6 py-2.5 text-sm font-black uppercase tracking-wider text-white transition-all hover:bg-purple-600 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            放置指示物
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
            指示物类型
          </div>
          <div className="flex gap-2">
            {TOKEN_OPTIONS
              .filter(opt => interaction.allowedTokens.includes(opt.key))
              .map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSelectedToken(opt.key)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-black uppercase tracking-wider transition-all ${
                    selectedToken === opt.key
                      ? `${colorMap[opt.color]} text-white`
                      : `${colorMapInactive[opt.color]}`
                  }`}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-purple-300">
            目标
          </div>
          <div className="rounded-xl border border-purple-800/40 bg-obsidian-900/70 px-3 py-2 text-sm font-bold text-white">
            {interaction.targetKind === 'location' ? '📍' : '👤'} {targetLabel}
          </div>
        </div>
      </div>
    </InteractionDock>
  );
};
