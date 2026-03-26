import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';

import { cn } from '../../lib/utils';

type LeaderModeDialogProps = {
  open: boolean;
  title: string;
  description: string;
  detail?: string;
  confirmLabel?: string;
  onAcknowledge: () => void;
};

export const LeaderModeDialog: React.FC<LeaderModeDialogProps> = ({
  open,
  title,
  description,
  detail,
  confirmLabel = '我知道了',
  onAcknowledge,
}) => {
  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[7300] bg-black/60 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[7301] w-[min(560px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-loop-500/35 bg-obsidian-950/96 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.72)] focus:outline-none',
          )}
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="h-3 w-1.5 rounded-full bg-loop-400 shadow-[0_0_8px_rgba(34,211,238,0.55)]"></span>
            <Dialog.Title className="text-[10px] font-black uppercase tracking-[0.28em] text-loop-200">
              队长模式确认
            </Dialog.Title>
          </div>
          <div className="text-2xl font-black tracking-wide text-slate-50">{title}</div>
          <Dialog.Description className="mt-3 text-sm leading-6 text-slate-300">
            {description}
          </Dialog.Description>
          {detail && <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs leading-5 text-slate-400">{detail}</div>}
          <button
            type="button"
            onClick={onAcknowledge}
            className="mt-5 w-full rounded-2xl border border-loop-500/45 bg-loop-700 px-4 py-3 text-sm font-black tracking-[0.2em] text-white transition-all hover:bg-loop-600"
          >
            {confirmLabel}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
