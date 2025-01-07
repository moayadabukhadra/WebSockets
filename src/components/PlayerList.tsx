interface Player {
  id: string;
  name: string;
  score: number;
}

interface PlayerListProps {
  players: Player[];
  currentDrawer: string | null;
}

export default function PlayerList({ players, currentDrawer }: PlayerListProps) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Players</h2>
      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className={`flex justify-between items-center p-2 rounded ${
              player.id === currentDrawer ? 'bg-purple-900' : 'bg-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span>{player.name}</span>
              {player.id === currentDrawer && (
                <span className="text-xs bg-purple-500 px-2 py-0.5 rounded">
                  Drawing
                </span>
              )}
            </div>
            <span className="font-bold text-purple-400">{player.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
} 