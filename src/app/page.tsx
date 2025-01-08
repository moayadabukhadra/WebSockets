import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Pictionary Game
        </h1>
        <div className="flex flex-col items-center gap-8 mt-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
            <Link href="/create-room" 
              className="group bg-gray-800 p-8 rounded-xl shadow-lg hover:bg-gray-700 transition-all duration-300"
            >
              <h2 className="text-2xl font-bold mb-4 text-purple-400 group-hover:text-purple-300">
                Create Room 🎨
              </h2>
              <p className="text-gray-400">
                Create a new room and invite your friends to play Pictionary together.
              </p>
            </Link>
            <Link href="/join-room"
              className="group bg-gray-800 p-8 rounded-xl shadow-lg hover:bg-gray-700 transition-all duration-300"
            >
              <h2 className="text-2xl font-bold mb-4 text-pink-400 group-hover:text-pink-300">
                Join Room 🎮
              </h2>
              <p className="text-gray-400">
                Join an existing room using a room code from your friends.
              </p>
            </Link>
          </div>
          <div className="mt-8 text-center">
            <h3 className="text-xl font-semibold mb-4">How to Play</h3>
            <ul className="text-gray-400 space-y-2">
              <li>🎨 One player draws while others guess</li>
              <li>⏰ 60 seconds per round</li>
              <li>🏆 Score points by guessing correctly</li>
              <li>🤝 Create or join a room to start playing!</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
