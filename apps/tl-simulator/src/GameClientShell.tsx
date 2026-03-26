import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';

import { TragedyLooper } from './game/game';
import { TragedyBoard } from './components/Board';
import { SERVER_URL } from './config';

const TragedyClient = Client({
  game: TragedyLooper,
  board: TragedyBoard,
  numPlayers: 4,
  multiplayer: SocketIO({ server: SERVER_URL }),
});

type GameClientShellProps = {
  matchID: string;
  playerID: string;
  credentials?: string;
};

export default function GameClientShell({ matchID, playerID, credentials }: GameClientShellProps) {
  return (
    <div className="flex flex-col h-screen">
      <TragedyClient matchID={matchID} playerID={playerID} credentials={credentials} />
    </div>
  );
}
