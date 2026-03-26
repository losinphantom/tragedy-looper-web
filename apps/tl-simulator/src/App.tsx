import { Suspense, lazy } from 'react';
import { Lobby } from './components/Lobby';
const GameClientShell = lazy(() => import('./GameClientShell'));

function App() {
  return (
    <div className="bg-slate-900 min-h-screen">
      <Lobby
        onEnter={(matchID: string, playerID: string, credentials?: string) => (
          <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200 tracking-[0.2em] uppercase">Loading Match...</div>}>
            <GameClientShell matchID={matchID} playerID={playerID} credentials={credentials} />
          </Suspense>
        )}
      />
    </div>
  );
}

export default App;
