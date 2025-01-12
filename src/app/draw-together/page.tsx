'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CollaborativeCanvas from '@/components/CollaborativeCanvas';
import AdvancedToolBar from '@/components/AdvancedToolBar';
import { useRouter } from 'next/navigation';

function DrawTogetherContent() {
  const searchParams = useSearchParams();
  const [selectedTool, setSelectedTool] = useState<string>('brush');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [roomId, setRoomId] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    // Get room code from URL or generate a new one
    const urlRoom = searchParams.get('room');
    if (urlRoom) {
      setRoomCode(urlRoom);
      setRoomId(`draw-${urlRoom}`);
    } else {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomCode(code);
      setRoomId(`draw-${code}`);
    }
  }, [searchParams]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Draw Together
          </h1>
          <div className="flex items-center gap-4">
            <div className="bg-gray-800 px-4 py-2 rounded-lg">
              Room Code: <span className="font-mono font-bold">{roomCode}</span>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-semibold transition-colors"
            >
              Exit Room
            </button>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <AdvancedToolBar
            selectedTool={selectedTool}
            setSelectedTool={setSelectedTool}
            selectedColor={selectedColor}
            setSelectedColor={setSelectedColor}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < canvasHistory.length - 1}
            onUndo={() => {/* Implement undo */}}
            onRedo={() => {/* Implement redo */}}
          />
          {roomCode && roomId && (
            <CollaborativeCanvas
              selectedTool={selectedTool}
              selectedColor={selectedColor}
              brushSize={brushSize}
              roomId={roomId}
              roomCode={roomCode}
              onHistoryUpdate={(history, index) => {
                setCanvasHistory(history);
                setHistoryIndex(index);
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function LoadingComponent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4 flex items-center justify-center">
      <div className="text-2xl font-semibold">Loading...</div>
    </div>
  );
}

export default function DrawTogether() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <DrawTogetherContent />
    </Suspense>
  );
} 