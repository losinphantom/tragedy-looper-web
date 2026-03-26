import { getSeatAvatarUrl, getSeatDisplayName } from './board/boardHelpers';
import type { CharacterState } from '@tragedy/game-logic';

const LOCATION_LABELS: Record<string, string> = {
  hospital: '医院',
  shrine: '神社',
  city: '都市',
  school: '学校',
};

const LOCATION_ICONS: Record<string, string> = {
  hospital: '🏥',
  shrine: '⛩️',
  city: '🏙️',
  school: '🏫',
};

interface LobbyWaitScreenProps {
  isMastermind: boolean;
  playerID: string | null;
  readyPlayers: Record<string, boolean>;
  joinedProtagonists: Record<string, boolean>;
  scriptOpen: any;
  roomPlayers: { id: number; name?: string; isConnected?: boolean }[];
  settings: { leaderMode: boolean; autoResolve: boolean; [key: string]: any };
  autoResolveAvailable?: boolean;
  characters: Record<string, CharacterState>;
  onToggleReady: () => void;
  onStartGame: () => void;
  onUpdateSettings: (key: string, value: any) => void;
  onSetTerritory: (characterId: string, locationId: string) => void;
}

export function LobbyWaitScreen({
  isMastermind,
  playerID,
  readyPlayers,
  joinedProtagonists,
  scriptOpen,
  roomPlayers,
  settings = { leaderMode: false, autoResolve: true },
  autoResolveAvailable = true,
  characters,
  onToggleReady,
  onStartGame,
  onUpdateSettings,
  onSetTerritory,
}: LobbyWaitScreenProps) {
  const joinedSeats = ['1', '2', '3'].filter(seat => joinedProtagonists[seat] === true);
  const allReady = joinedSeats.length > 0
    && joinedSeats.every(seat => readyPlayers[seat] === true);
  
  const getPlayerName = (id: number) => {
    const p = roomPlayers.find(rp => rp.id === id);
    return p?.name || `Seat ${id}`;
  };

  const amIReady = playerID ? readyPlayers[playerID] : false;

  // ── 大人物领地设置逻辑 ──
  const boss = characters?.boss;
  const needsTerritory = !!boss && !boss.territoryLocationId;
  const territorySet = !!boss?.territoryLocationId;
  const canStart = allReady && (!boss || territorySet);

  return (
    <div className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Title */}
        <div className="text-center mt-10">
          <h2 className="text-4xl font-black text-white font-serif tracking-widest mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            {scriptOpen?.title || '未知剧本'}
          </h2>
          <div className="flex items-center justify-center gap-6 text-sm font-bold text-slate-400 tracking-widest uppercase mb-8">
            <span className="bg-slate-900/80 px-4 py-2 rounded-full border border-white/10 shadow-inner">
              轮回数 {scriptOpen?.loops || 0}
            </span>
            <span className="bg-slate-900/80 px-4 py-2 rounded-full border border-white/10 shadow-inner">
              每天 {scriptOpen?.daysPerLoop || 0} 日
            </span>
          </div>
        </div>

        {/* Player Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
          
          {/* Mastermind Card */}
          <div className="bg-obsidian-950/80 border border-blood-900/50 rounded-2xl p-6 shadow-[0_0_30px_rgba(225,29,72,0.15)] flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-blood-600/5 mix-blend-overlay group-hover:bg-blood-600/10 transition-colors"></div>
            <img src={getSeatAvatarUrl('0')} alt="" className="w-16 h-16 rounded-full border-2 border-blood-500 object-cover shadow-glow-red z-10 mb-4" />
            <div className="text-white font-black tracking-widest uppercase text-xl z-10 mb-1">
              {getSeatDisplayName('0')} Mastermind
            </div>
            <div className="text-slate-400 text-sm font-mono z-10 h-6">
              {getPlayerName(0)}
            </div>
            {isMastermind && (
              <div className="mt-8 z-10 w-full flex flex-col gap-3">
                {/* ── 大人物领地设置 ── */}
                {boss && (
                  <div className="bg-obsidian-900/80 border border-gold-700/50 rounded-xl p-4 shadow-inner">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1.5 h-4 bg-gold-500 rounded-full shadow-glow-gold"></span>
                      <span className="text-[11px] text-gold-400 font-black tracking-widest uppercase">
                        大人物领地设置
                      </span>
                      <span className="text-[10px] text-blood-400 font-bold ml-auto">必须</span>
                    </div>
                    {territorySet ? (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald-950/40 border border-emerald-700/50">
                        <span className="text-emerald-400 text-lg">{LOCATION_ICONS[boss.territoryLocationId!] || '📍'}</span>
                        <div>
                          <div className="text-emerald-300 font-bold tracking-widest text-sm">
                            {LOCATION_LABELS[boss.territoryLocationId!] || boss.territoryLocationId}
                          </div>
                          <div className="text-[10px] text-emerald-500/80 tracking-wider">领地已设定 ✓</div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(LOCATION_LABELS).map(([locId, label]) => (
                          <button
                            key={locId}
                            onClick={() => onSetTerritory('boss', locId)}
                            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-obsidian-800 hover:bg-gold-900/40 border border-white/10 hover:border-gold-500/50 text-slate-300 hover:text-gold-300 transition-all duration-200 group/loc"
                          >
                            <span className="text-xl group-hover/loc:scale-110 transition-transform">{LOCATION_ICONS[locId]}</span>
                            <span className="font-bold tracking-widest text-sm">{label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 mt-2 tracking-wide">
                      大人物的领地决定其能力生效范围（设定后不可更改）
                    </p>
                  </div>
                )}
                <button
                  onClick={onStartGame}
                  disabled={!canStart}
                  className={`w-full py-4 rounded-xl font-black text-white uppercase tracking-widest transition-all duration-300 ${
                    canStart
                      ? 'bg-blood-700 hover:bg-blood-600 border border-blood-400 shadow-[0_0_20px_rgba(225,29,72,0.6)] cursor-pointer'
                      : 'bg-obsidian-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  {!canStart && needsTerritory
                    ? '请先设置大人物领地 ▲'
                    : canStart
                      ? '开始游戏 START GAME'
                      : '等待主角准备 WAITING...'}
                </button>
                <label className="flex items-center gap-3 text-sm text-slate-300 font-bold tracking-widest bg-obsidian-900 border border-slate-700/50 p-3 rounded-xl cursor-pointer hover:bg-obsidian-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.leaderMode}
                    onChange={(e) => onUpdateSettings('leaderMode', e.target.checked)}
                    className="w-5 h-5 rounded appearance-none border border-slate-600 bg-obsidian-950 checked:bg-gold-500 checked:border-gold-400 focus:ring-0 relative after:content-['✓'] after:absolute after:text-[14px] after:text-obsidian-900 after:font-black after:inset-0 after:flex after:items-center after:justify-center after:opacity-0 checked:after:opacity-100 transition-colors cursor-pointer"
                  />
                  开启队长机制 (LEADER MODE)
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-300 font-bold tracking-widest bg-obsidian-900 border border-slate-700/50 p-3 rounded-xl cursor-pointer hover:bg-obsidian-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.autoResolve}
                    disabled={!autoResolveAvailable}
                    onChange={(e) => onUpdateSettings('autoResolve', e.target.checked)}
                    className="w-5 h-5 rounded appearance-none border border-slate-600 bg-obsidian-950 checked:bg-loop-500 checked:border-loop-400 focus:ring-0 relative after:content-['✓'] after:absolute after:text-[14px] after:text-obsidian-900 after:font-black after:inset-0 after:flex after:items-center after:justify-center after:opacity-0 checked:after:opacity-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <span className="flex items-center gap-2">
                    {!autoResolveAvailable ? '🏖️ 仅手动模式' : settings.autoResolve ? '⚡ 结算模式' : '🏖️ 沙盒模式'}
                    <span className="text-[10px] text-slate-500 font-normal tracking-normal normal-case">
                      {!autoResolveAvailable ? '当前剧本缺少自动结算处理器' : settings.autoResolve ? '行动卡自动结算' : '手动管理棋盘'}
                    </span>
                  </span>
                </label>
              </div>
            )}
            {!isMastermind && (
              <div className="mt-8 z-10 text-blood-400 font-bold tracking-widest text-sm text-center">
                HOST
              </div>
            )}
          </div>

          {/* Protagonists Container */}
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((seatId) => {
              const colors = [
                'border-orange-500/50 bg-orange-950/20 shadow-[0_0_15px_rgba(249,115,22,0.1)] text-orange-400',
                'border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] text-emerald-400',
                'border-blue-500/50 bg-blue-950/20 shadow-[0_0_15px_rgba(59,130,246,0.1)] text-blue-400'
              ];
              const colorClass = colors[seatId - 1];
              const isMe = playerID === seatId.toString();
              const isReady = readyPlayers[seatId.toString()] === true;
              const hasPlayer = joinedProtagonists[seatId.toString()] === true
                || roomPlayers.some(p => p.id === seatId && p.name);

              return (
                <div key={seatId} className={`border rounded-xl p-4 flex items-center justify-between relative overflow-hidden transition-all duration-300 ${hasPlayer ? colorClass : 'border-slate-700/30 bg-obsidian-900/20 text-slate-600'} ${isReady ? 'bg-opacity-40 border-opacity-100' : hasPlayer ? 'opacity-80' : 'opacity-50'}`}>
                  {/* Readiness background glow */}
                  {isReady && <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 pointer-events-none"></div>}
                  
                  <div className="flex items-center gap-4 z-10">
                    <img src={getSeatAvatarUrl(seatId.toString())} alt="" className={`w-10 h-10 rounded-full border-2 object-cover transition-all ${isReady ? 'border-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : hasPlayer ? 'border-current opacity-60' : 'border-slate-700 opacity-30 grayscale'}`} />
                    <div>
                      <div className="font-bold tracking-widest uppercase">{getSeatDisplayName(seatId.toString())} Protagonist {seatId}</div>
                      <div className="text-xs font-mono opacity-70">{hasPlayer ? getPlayerName(seatId) : '空位'}</div>
                    </div>
                  </div>

                  <div className="z-10 flex items-center">
                    {isMe ? (
                      <button
                        onClick={onToggleReady}
                        className={`px-6 py-2 rounded font-black tracking-widest uppercase transition-all shadow-lg ${
                          amIReady 
                            ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-500'
                            : 'bg-loop-600 hover:bg-loop-500 text-white border-loop-400 shadow-glow-cyan'
                        } border`}
                      >
                        {amIReady ? '取消 READY' : '准备 READY'}
                      </button>
                    ) : hasPlayer ? (
                      <div className={`font-bold tracking-widest px-4 py-2 rounded bg-obsidian-900 border ${isReady ? 'border-emerald-500/50 text-emerald-400' : 'border-slate-700/50 text-slate-500'}`}>
                        {isReady ? '已准备 PREPARED' : '未准备 WAITING'}
                      </div>
                    ) : (
                      <div className="font-bold tracking-widest px-4 py-2 rounded bg-obsidian-900/30 border border-slate-800/30 text-slate-600 text-xs">
                        空位
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
