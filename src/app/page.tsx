import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Welcome to Our Games
        </h1>
        <div className="flex flex-col items-center gap-8 mt-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
            <Link href="/create-room" 
              className="group bg-gray-800 p-8 rounded-xl shadow-lg hover:bg-gray-700 transition-all duration-300"
            >
              <h2 className="text-2xl font-bold mb-4 text-purple-400 group-hover:text-purple-300">
                Create Game Room 🎨
              </h2>
              <p className="text-gray-400">
                Create a new room and invite your friends to play Pictionary together.
              </p>
            </Link>
            <Link href="/join-room"
              className="group bg-gray-800 p-8 rounded-xl shadow-lg hover:bg-gray-700 transition-all duration-300"
            >
              <h2 className="text-2xl font-bold mb-4 text-pink-400 group-hover:text-pink-300">
                Join Game Room 🎮
              </h2>
              <p className="text-gray-400">
                Join an existing room using a room code from your friends.
              </p>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full mt-8">
            <Link href="/draw-together/create" 
              className="group bg-gray-800 p-8 rounded-xl shadow-lg hover:bg-gray-700 transition-all duration-300"
            >
              <h2 className="text-2xl font-bold mb-4 text-blue-400 group-hover:text-blue-300">
                Create Drawing Room 🎨
              </h2>
              <p className="text-gray-400">
                Create a collaborative drawing room and invite others to draw together in real-time.
              </p>
            </Link>
            <Link href="/draw-together/join"
              className="group bg-gray-800 p-8 rounded-xl shadow-lg hover:bg-gray-700 transition-all duration-300"
            >
              <h2 className="text-2xl font-bold mb-4 text-green-400 group-hover:text-green-300">
                Join Drawing Room ✏️
              </h2>
              <p className="text-gray-400">
                Join an existing drawing room to collaborate on artwork with others.
              </p>
            </Link>
          </div>

          <div className="mt-8 text-center">
            <h3 className="text-xl font-semibold mb-4">Available Games</h3>
            <ul className="text-gray-400 space-y-2">
              <li>🎨 Pictionary - Draw and guess with friends</li>
              <li>✏️ Collaborative Drawing - Create artwork together</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
