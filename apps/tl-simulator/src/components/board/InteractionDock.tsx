import React from 'react';

type DockTone = 'blood' | 'loop' | 'gold' | 'violet' | 'slate';

const PANEL_TONE: Record<DockTone, { border: string; glow: string; header: string; badge: string; label: string }> = {
  blood: {
    border: 'border-blood-700/50',
    glow: 'shadow-[0_0_45px_rgba(225,29,72,0.16)]',
    header: 'from-blood-950/70 via-blood-950/35 to-obsidian-900/90',
    badge: 'bg-blood-900/60 text-blood-200 border-blood-500/40',
    label: 'text-blood-300',
  },
  loop: {
    border: 'border-loop-700/50',
    glow: 'shadow-[0_0_45px_rgba(56,189,248,0.16)]',
    header: 'from-loop-950/70 via-loop-950/35 to-obsidian-900/90',
    badge: 'bg-loop-900/60 text-loop-200 border-loop-500/40',
    label: 'text-loop-300',
  },
  gold: {
    border: 'border-gold-700/50',
    glow: 'shadow-[0_0_45px_rgba(234,179,8,0.16)]',
    header: 'from-gold-950/70 via-gold-950/35 to-obsidian-900/90',
    badge: 'bg-gold-900/60 text-gold-200 border-gold-500/40',
    label: 'text-gold-300',
  },
  violet: {
    border: 'border-purple-700/50',
    glow: 'shadow-[0_0_45px_rgba(168,85,247,0.16)]',
    header: 'from-purple-950/70 via-purple-950/35 to-obsidian-900/90',
    badge: 'bg-purple-900/60 text-purple-200 border-purple-500/40',
    label: 'text-purple-300',
  },
  slate: {
    border: 'border-slate-700/50',
    glow: 'shadow-[0_0_35px_rgba(148,163,184,0.12)]',
    header: 'from-slate-950/70 via-slate-950/35 to-obsidian-900/90',
    badge: 'bg-slate-900/60 text-slate-200 border-slate-500/40',
    label: 'text-slate-300',
  },
};

export interface InteractionDockProps {
  title: string;
  subtitle?: string;
  badge?: string;
  tone?: DockTone;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const InteractionDock: React.FC<InteractionDockProps> = ({
  title,
  subtitle,
  badge,
  tone = 'slate',
  footer,
  children,
}) => {
  const palette = PANEL_TONE[tone];

  return (
    <div className="fixed right-3 top-[76px] bottom-[138px] z-[110] pointer-events-none flex justify-end items-start sm:right-4 sm:top-[84px] sm:bottom-[148px] 2xl:right-6 2xl:top-[92px] 2xl:bottom-[168px]">
      <section
        className={`pointer-events-auto w-[min(420px,calc(100vw-1rem))] max-h-full overflow-hidden rounded-[28px] border bg-obsidian-950/90 backdrop-blur-2xl ${palette.border} ${palette.glow}`}
      >
        <header className={`border-b border-white/10 bg-gradient-to-r px-5 py-4 ${palette.header}`}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black uppercase tracking-[0.28em] text-white sm:text-lg">{title}</h3>
              {subtitle && (
                <p className="mt-1 text-[11px] leading-5 text-slate-400 sm:text-xs">
                  {subtitle}
                </p>
              )}
            </div>
            {badge && (
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] ${palette.badge}`}>
                {badge}
              </span>
            )}
          </div>
        </header>

        <div className="max-h-[calc(100vh-18rem)] overflow-y-auto px-4 py-4 sm:px-5">
          {children}
        </div>

        {footer && (
          <footer className="border-t border-white/5 bg-obsidian-950/80 px-4 py-3 sm:px-5">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
};

export interface InteractionNoticeProps {
  title: string;
  detail?: string;
  tone?: DockTone;
}

export const InteractionNotice: React.FC<InteractionNoticeProps> = ({
  title,
  detail,
  tone = 'slate',
}) => {
  const palette = PANEL_TONE[tone];

  return (
    <div className="fixed right-3 top-[92px] z-[108] pointer-events-none sm:right-4 sm:top-[100px] 2xl:right-6">
      <div className={`rounded-2xl border bg-obsidian-950/88 px-4 py-3 backdrop-blur-xl ${palette.border} ${palette.glow}`}>
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full animate-pulse ${tone === 'blood' ? 'bg-blood-500' : tone === 'loop' ? 'bg-loop-400' : tone === 'gold' ? 'bg-gold-400' : tone === 'violet' ? 'bg-purple-400' : 'bg-slate-300'}`} />
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-200">{title}</div>
            {detail && <div className={`mt-1 text-[11px] ${palette.label}`}>{detail}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
