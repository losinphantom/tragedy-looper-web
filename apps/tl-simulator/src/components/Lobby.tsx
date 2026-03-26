import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { SERVER_URL } from '../config';
import { getSeatAvatarUrl, getSeatDisplayName } from './board/boardHelpers';

const EncyclopediaModal = lazy(() => import('./EncyclopediaModal').then((module) => ({ default: module.EncyclopediaModal })));
const TragedySetEncyclopediaModal = lazy(() => import('./TragedySetEncyclopediaModal').then((module) => ({ default: module.TragedySetEncyclopediaModal })));
const ScriptEncyclopediaModal = lazy(() => import('./ScriptEncyclopediaModal').then((module) => ({ default: module.ScriptEncyclopediaModal })));

// ── LocalStorage session key ─────────────────────────────────────────────────
const SESSION_KEY = 'tl_session';

interface SavedSession {
  userId: string;
  matchID: string;
  playerID: string;
  credentials?: string;
  roleName: string;
  savedAt: number;
}

function loadSession(): SavedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

function saveSession(s: SavedSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ── Types ────────────────────────────────────────────────────────────────────

type LobbyProps = {
  onEnter: (matchID: string, playerID: string, credentials?: string) => React.ReactNode;
};

type Room = {
  matchID: string;
  createdAt: number;
  players: { id: number; name?: string; isConnected?: boolean }[];
};

// ── Lobby Component ──────────────────────────────────────────────────────────

export function Lobby({ onEnter }: LobbyProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [userId, setUserId] = useState('');
  const [playerID, setPlayerID] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [joined, setJoined] = useState<{ matchID: string; playerID: string; credentials?: string } | null>(null);
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [showCharEncyclopedia, setShowCharEncyclopedia] = useState(false);
  const [showModuleEncyclopedia, setShowModuleEncyclopedia] = useState(false);
  const [showScriptEncyclopedia, setShowScriptEncyclopedia] = useState(false);
  const roomListRef = useRef<HTMLDivElement | null>(null);

  // Load saved session on mount
  useEffect(() => {
    const session = loadSession();
    if (session) {
      setSavedSession(session);
      setUserId(session.userId); // Pre-fill user ID
    }
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/games/tragedy-looper`);
      if (res.ok) {
        const data = await res.json() as any;
        setRooms(data.matches || []);
      }
    } catch (e) {
      console.warn('Could not fetch rooms', e);
    }
  };

  const handleCloseRoom = async (matchID: string) => {
    const isAdmin = userId.trim().toLowerCase() === 'admin';
    try {
      // If user is in this room, first leave properly via boardgame.io API
      if (savedSession?.matchID === matchID && savedSession.credentials) {
        await fetch(`${SERVER_URL}/games/tragedy-looper/${matchID}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerID: savedSession.playerID,
            credentials: savedSession.credentials,
          }),
        });
        clearSession();
        setSavedSession(null);
      }
      if (isAdmin) {
        // Admin: force-delete via custom server endpoint (bypasses leave check)
        await fetch(`${SERVER_URL}/admin/force-delete/${matchID}`, { method: 'DELETE' });
      } else {
        // Normal: try standard DELETE (only works if all players left)
        await fetch(`${SERVER_URL}/games/tragedy-looper/${matchID}`, { method: 'DELETE' });
      }
      fetchRooms();
    } catch (e) {
      // Even if DELETE fails, room list will refresh
      fetchRooms();
    }
  };

  // Leave my room (return to lobby without deleting the match)
  const handleLeaveRoom = async (matchID: string) => {
    if (!savedSession?.credentials) return;
    try {
      await fetch(`${SERVER_URL}/games/tragedy-looper/${matchID}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerID: savedSession.playerID,
          credentials: savedSession.credentials,
        }),
      });
    } catch { /* ignore */ }
    clearSession();
    setSavedSession(null);
    fetchRooms();
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async () => {
    if (!userId.trim()) { setErrorMsg('请先输入你的用户名'); return; }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${SERVER_URL}/games/tragedy-looper/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numPlayers: 4 })
      });
      if (!res.ok) throw new Error('Network response was not ok');
      const parsed = await res.json() as any;
      await joinSpecificRoom(parsed.matchID, playerID);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to create room');
      setIsLoading(false);
    }
  };

  const joinSpecificRoom = async (matchID: string, roleID: string) => {
    if (!userId.trim()) { setErrorMsg('请先输入你的用户名'); return; }
    setIsLoading(true);
    setErrorMsg('');
    const roleName = roleID === '0' ? '剧作家' : `主人公${roleID}`;
    try {
      const res = await fetch(`${SERVER_URL}/games/tragedy-looper/${matchID}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerID: roleID, playerName: userId.trim() })
      });
      if (!res.ok) {
        throw new Error(res.status === 409 ? 'Seat already taken' : 'Failed to join room');
      }
      const parsed = await res.json() as any;
      const session: SavedSession = {
        userId: userId.trim(),
        matchID,
        playerID: roleID,
        credentials: parsed.playerCredentials,
        roleName,
        savedAt: Date.now(),
      };
      saveSession(session);
      setJoined({ matchID, playerID: roleID, credentials: parsed.playerCredentials });
    } catch (e: any) {
      setErrorMsg(e.message);
      setIsLoading(false);
    }
  };

  // ── Reconnect: try to rejoin the saved session ──
  const handleReconnect = async () => {
    if (!savedSession) return;
    setReconnecting(true);
    setErrorMsg('');
    try {
      // Verify the room still exists
      const res = await fetch(`${SERVER_URL}/games/tragedy-looper/${savedSession.matchID}`);
      if (!res.ok) throw new Error('Room no longer exists');
      // Room exists — jump straight in
      setJoined({
        matchID: savedSession.matchID,
        playerID: savedSession.playerID,
        credentials: savedSession.credentials,
      });
    } catch {
      setErrorMsg('房间已不存在，无法重新连接。请加入或创建新房间。');
      clearSession();
      setSavedSession(null);
      setReconnecting(false);
    }
  };

  const handleAbandonSession = () => {
    clearSession();
    setSavedSession(null);
  };

  const handleRoomListWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const list = roomListRef.current;
    if (!list) return;

    const maxScrollTop = list.scrollHeight - list.clientHeight;
    if (maxScrollTop <= 0) return;

    const deltaMultiplier =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? list.clientHeight
          : 1;

    list.scrollTop += event.deltaY * deltaMultiplier;
    event.preventDefault();
  };

  if (joined) {
    return <>{onEnter(joined.matchID, joined.playerID, joined.credentials)}</>;
  }

  const isSeatTaken = (room: Room, seatID: string) =>
    room.players.find(p => p.id === parseInt(seatID, 10))?.name !== undefined;

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#050510] relative overflow-y-auto font-sans py-8">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-obsidian-900 to-black pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.16) 0, transparent 1px), radial-gradient(circle at 80% 40%, rgba(255,255,255,0.12) 0, transparent 1px), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.12) 0, transparent 1px)',
          backgroundSize: '18px 18px, 24px 24px, 22px 22px',
        }}
      />

      {/* ── Reconnect Banner ── */}
      {savedSession && (
        <div className="z-20 w-full max-w-4xl mb-4 px-8">
          <div className="bg-loop-950/60 border border-loop-500/40 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-[0_0_20px_rgba(14,165,233,0.15)] backdrop-blur-md">
            <div className="w-10 h-10 rounded-full bg-loop-900 flex items-center justify-center text-xl shrink-0">
              🔁
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-loop-300 tracking-widest uppercase mb-0.5">
                发现断线存档 · Saved Session Found
              </p>
              <p className="text-xs text-slate-400 truncate">
                <span className="text-white font-bold">{savedSession.userId}</span>
                {' · '}
                <span className="text-loop-400">{savedSession.roleName}</span>
                {' · '}
                <span className="font-mono text-slate-500">{savedSession.matchID.substring(0, 12)}…</span>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleReconnect}
                disabled={reconnecting}
                className="px-4 py-2 bg-loop-700 hover:bg-loop-600 text-white text-xs font-black tracking-widest uppercase rounded-lg border border-loop-500/50 transition-all shadow-[0_0_10px_rgba(14,165,233,0.3)]"
              >
                {reconnecting ? '连接中…' : '↩ 重新连接'}
              </button>
              <button
                onClick={handleAbandonSession}
                className="px-4 py-2 bg-obsidian-800 hover:bg-obsidian-700 text-slate-400 hover:text-white text-xs font-bold uppercase rounded-lg border border-white/10 transition-all"
              >
                × 放弃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Panel ── */}
      <div className="z-10 w-full max-w-5xl flex flex-col gap-6">
        {/* Header Title Space */}
        <div className="text-center mb-2">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-400 via-white to-slate-400 uppercase tracking-[0.3em] mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
            <span className="text-loop-500 mr-4">SYS.</span>LOBBY
          </h1>
          <p className="text-obsidian-200 text-xs md:text-sm tracking-[0.4em] uppercase font-bold opacity-80 decoration-white/20 underline underline-offset-4">
            Tragedy Looper Simulation Protocol
          </p>
        </div>

        {/* Central Core */}
        <div className="w-full bg-obsidian-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] relative flex flex-col 2xl:flex-row divide-y 2xl:divide-y-0 2xl:divide-x divide-white/10">

          {/* Left Col: Setup Protocol */}
          <div className="flex-[0.8] p-8 2xl:p-10 flex flex-col relative overflow-hidden group/left">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blood-900/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none transition-opacity duration-1000" />

          {/* ── User ID Input ── */}
          <div className="mb-5">
            <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">
              YOUR USER ID <span className="text-blood-500">*</span>
            </label>
            <input
              type="text"
              maxLength={20}
              placeholder="取一个专属名称 (e.g. Alice)"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500/60 rounded-lg px-4 py-3 text-sm text-white font-mono placeholder-slate-500 outline-none transition-colors"
            />
            <p className="text-[10px] text-slate-600 mt-1.5 tracking-wide">
              此名称用于识别你的身份，断线后可凭此重连
            </p>
          </div>

          {/* ── Identity Selection ── */}
          <div className="mb-8 relative z-10">
            <label className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-4 font-black">
              <span className="w-1 h-1 bg-loop-500 rounded-full" /> SELECT IDENTITY
            </label>
            <div className="flex flex-col gap-2 bg-obsidian-950/50 rounded-xl p-2 border border-white/5">
              <button
                onClick={() => setPlayerID('0')}
                className={`py-3 px-4 rounded-lg text-sm font-bold tracking-widest transition-all flex items-center gap-3 ${
                  playerID === '0'
                    ? 'bg-blood-900/80 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)] border border-blood-500/30'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                <img src={getSeatAvatarUrl('0')} alt="" className="w-8 h-8 rounded-full border-2 border-blood-500/60 object-cover" />
                MASTERMIND ({getSeatDisplayName('0')})
              </button>
              <div className="flex gap-2">
                {[1, 2, 3].map(pid => (
                  <button
                    key={pid}
                    onClick={() => setPlayerID(pid.toString())}
                    className={`flex-1 py-3 px-2 rounded-lg text-[11px] font-bold tracking-widest transition-all flex flex-col items-center gap-2 ${
                      playerID === pid.toString()
                        ? 'bg-loop-900/80 text-white shadow-[0_0_15px_rgba(14,165,233,0.3)] border border-loop-500/30'
                        : 'text-slate-500 hover:text-slate-300 border border-transparent'
                    }`}
                  >
                    <img src={getSeatAvatarUrl(pid.toString())} alt="" className="w-8 h-8 rounded-full border-2 border-loop-500/40 object-cover" />
                    {getSeatDisplayName(pid.toString())}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={isLoading || !userId.trim()}
            className="w-full relative overflow-hidden group px-6 py-5 rounded-xl font-black transition-all duration-300 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white border border-white/10 hover:border-white/30"
          >
            <span className="relative z-10 tracking-widest uppercase">
              {isLoading ? 'INITIALIZING...' : 'CREATE NEW SIMULATION LOOP'}
            </span>
          </button>

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-900/40 border border-red-500/50 rounded flex items-center gap-2 text-red-200 text-sm shadow-glow-red">
              <span className="text-lg">⚠️</span> {errorMsg}
            </div>
          )}
        </div>

        {/* Right Col: Server Browser */}
        <div className="flex-[1.2] p-8 2xl:p-10 flex flex-col min-h-[500px] relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-loop-900/10 rounded-full blur-[80px] -ml-32 -mb-32 pointer-events-none transition-opacity duration-1000" />
          
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5 relative z-10">
            <label className="text-xs text-white uppercase tracking-[0.2em] font-black flex items-center gap-3">
              <span className="text-slate-500 font-mono">[{rooms.length.toString().padStart(2, '0')}]</span>
              ACTIVE LOOPS
            </label>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-950/40 border border-emerald-900/50 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.1)]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
              <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold">ONLINE</span>
            </div>
          </div>

          <div
            ref={roomListRef}
            onWheel={handleRoomListWheel}
            className="flex-1 overflow-y-auto overscroll-contain pr-3 space-y-4 custom-scrollbar relative z-10"
          >
            {rooms.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 border border-dashed border-white/10 rounded-2xl bg-black/20">
                <div className="relative mb-4">
                  <div className="absolute inset-0 border border-slate-500/30 rounded-full animate-[ping_3s_ease-in-out_infinite]" />
                  <span className="text-4xl opacity-50 relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">📡</span>
                </div>
                <p className="text-xs uppercase tracking-[0.3em] font-bold">No signals detected</p>
                <p className="text-[10px] mt-2 text-slate-600 tracking-wider">AWAITING LOOP CREATION PROTOCOL</p>
              </div>
            ) : (
              rooms.map(room => {
                const mTaken  = isSeatTaken(room, '0');
                const p1Taken = isSeatTaken(room, '1');
                const p2Taken = isSeatTaken(room, '2');
                const p3Taken = isSeatTaken(room, '3');
                const isFull  = mTaken && p1Taken && p2Taken && p3Taken;
                const timeAgo = Math.floor((Date.now() - room.createdAt) / 60000);
                // Check if this is the user's saved session room, or if the user is Admin
                const isAdmin = userId.trim().toLowerCase() === 'admin';
                const isMyRoom = savedSession?.matchID === room.matchID;
                const canClose = isMyRoom || isAdmin;

                return (
                  <div
                    key={room.matchID}
                    className={`bg-obsidian-950/80 border rounded-xl p-4 flex items-center justify-between group transition-all ${
                      isMyRoom ? 'border-loop-500/40 shadow-[0_0_12px_rgba(14,165,233,0.12)]' : 'border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-white tracking-widest mb-1 flex items-center gap-2">
                        {isMyRoom && <span className="text-loop-400 text-[10px]">◆ MINE</span>}
                        ROOM: <span className="text-loop-400 font-mono">{room.matchID.substring(0, 8)}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                        {timeAgo === 0 ? '< 1 MIN AGO' : `${timeAgo} MINS AGO`}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Seat avatar indicators */}
                      <div className="flex gap-1.5" title="Seats: Mastermind | P1 P2 P3">
                        {[{ taken: mTaken, seat: '0' }, { taken: p1Taken, seat: '1' }, { taken: p2Taken, seat: '2' }, { taken: p3Taken, seat: '3' }].map(({ taken, seat }) => (
                          <img
                            key={seat}
                            src={getSeatAvatarUrl(seat)}
                            alt={getSeatDisplayName(seat)}
                            className={`w-6 h-6 rounded-full object-cover border-2 transition-all ${taken ? 'border-white/60 opacity-100 shadow-[0_0_6px_rgba(255,255,255,0.4)]' : 'border-slate-700/50 opacity-30 grayscale'}`}
                          />
                        ))}
                      </div>

                      <button
                        disabled={isLoading || isFull || isSeatTaken(room, playerID) || !userId.trim()}
                        onClick={() => joinSpecificRoom(room.matchID, playerID)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-obsidian-900 disabled:text-slate-600 disabled:border-transparent text-white text-xs font-bold tracking-widest uppercase rounded border border-white/10 transition-colors ml-4"
                      >
                        {isFull ? 'FULL' : 'JOIN LOOP ▶'}
                      </button>

                      {/* Leave button — visible for own rooms */}
                      {isMyRoom && savedSession?.credentials && (
                        <button
                          onClick={() => handleLeaveRoom(room.matchID)}
                          title="退出房间（保留房间，自己离开）"
                          className="px-3 py-2 bg-amber-950/60 hover:bg-amber-800 text-amber-400 hover:text-white text-xs font-black uppercase rounded border border-amber-700/50 hover:border-amber-500 transition-all ml-1"
                        >
                          ↩ 退出
                        </button>
                      )}

                      {/* Close button — visible for own rooms, or any room if Admin */}
                      {canClose && (
                        <button
                          onClick={() => handleCloseRoom(room.matchID)}
                          title="关闭房间（先退出再删除）"
                          className="px-3 py-2 bg-blood-950/60 hover:bg-blood-800 text-blood-400 hover:text-white text-xs font-black uppercase rounded border border-blood-700/50 hover:border-blood-500 transition-all ml-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
      </div>

      {/* ── ARHIVES: Encyclopedia Cards ── */}
      <div className="z-10 w-full max-w-4xl mt-6">
        <div className="flex items-center gap-4 mb-4 px-2">
          <div className="h-px bg-white/10 flex-1"></div>
          <span className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase">Sim Archives</span>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ArchiveCard 
            title="模组百科" 
            sub="Module DB" 
            desc="查阅各个剧本集的底层规则与特化机制"
            icon="📖"
            colorClass="from-emerald-900/40 border-emerald-500/30 hover:border-emerald-400 group-hover:text-emerald-300"
            onClick={() => setShowModuleEncyclopedia(true)}
          />
          <ArchiveCard 
            title="角色百科" 
            sub="Cast Roster"
            desc="浏览登场人物的详细属性与可用友好能力"
            icon="🎭"
            colorClass="from-loop-900/40 border-loop-500/30 hover:border-loop-400 group-hover:text-loop-300"
            onClick={() => setShowCharEncyclopedia(true)}
          />
          <ArchiveCard 
            title="剧本百科" 
            sub="Script Logs"
            desc="调取特定剧本的时间线、事件与人员分布表"
            icon="📜"
            colorClass="from-gold-900/40 border-gold-500/30 hover:border-gold-400 group-hover:text-gold-300"
            onClick={() => setShowScriptEncyclopedia(true)}
          />
        </div>
      </div>

      {/* Encyclopedia Modals */}
      <Suspense fallback={null}>
        <EncyclopediaModal isOpen={showCharEncyclopedia} onClose={() => setShowCharEncyclopedia(false)} />
        <TragedySetEncyclopediaModal isOpen={showModuleEncyclopedia} onClose={() => setShowModuleEncyclopedia(false)} />
        <ScriptEncyclopediaModal isOpen={showScriptEncyclopedia} onClose={() => setShowScriptEncyclopedia(false)} />
      </Suspense>
    </div>
  );
}

// ── Components ───────────────────────────────────────────────────────────────

function ArchiveCard({ title, sub, desc, icon, colorClass, onClick }: {
  title: string; sub: string; desc: string; icon: string; colorClass: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative group bg-obsidian-900/60 backdrop-blur-md border rounded-2xl p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] overflow-hidden ${colorClass}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity" />
      <div className="relative flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{sub}</span>
          <span className="text-lg font-black tracking-widest text-slate-200 mt-1">{title}</span>
        </div>
        <div className="text-3xl opacity-50 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500">
          {icon}
        </div>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed max-w-[90%]">
        {desc}
      </p>
    </button>
  );
}
