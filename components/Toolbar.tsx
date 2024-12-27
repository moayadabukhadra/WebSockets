'use client';

import { Socket } from 'socket.io-client';
import { fabric } from 'fabric-pure-browser';

interface ToolbarProps {
  isDrawer: boolean;
  socket: Socket | null;
  canvasRef: React.MutableRefObject<fabric.Canvas | null>;
}

export default function Toolbar({ isDrawer, socket, canvasRef }: ToolbarProps) {
  const handleStartGame = () => {
    if (socket) {
      socket.emit('startGame');
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (canvasRef.current) {
      canvasRef.current.freeDrawingBrush.color = e.target.value;
    }
  };

  const handleBrushSize = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (canvasRef.current) {
      canvasRef.current.freeDrawingBrush.width = parseInt(e.target.value);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={handleStartGame}
        className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
      >
        Start Game
      </button>
      {isDrawer && (
        <>
          <input
            type="color"
            className="h-10 w-10 cursor-pointer"
            onChange={handleColorChange}
          />
          <input
            type="range"
            min="1"
            max="20"
            defaultValue="5"
            className="w-32"
            onChange={handleBrushSize}
          />
        </>
      )}
    </div>
  );
} 