'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface CanvasProps {
  socket: Socket;
  isDrawing: boolean;
  selectedColor: string;
  brushSize: number;
  roomId: string;
}

export default function Canvas({ 
  socket, 
  isDrawing, 
  selectedColor, 
  brushSize,
  roomId
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('draw', (data: DrawData) => {
      if (!canvasRef.current) return;
      const context = canvasRef.current.getContext('2d');
      if (!context) return;

      draw(context, data);
    });

    return () => {
      socket.off('draw');
    };
  }, [socket]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(true);
    const { offsetX, offsetY } = e.nativeEvent;
    const drawData = {
      x: offsetX,
      y: offsetY,
      color: selectedColor,
      brushSize,
      roomId
    };
    socket.emit('draw', drawData);
    draw(context!, drawData);
  };

  const draw = ({ nativeEvent }: React.MouseEvent) => {
    if (!drawing || !isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    
    socket.emit('draw', {
      x: offsetX,
      y: offsetY,
      drawing: true,
      color: selectedColor,
      size: brushSize,
      lastPosition: lastPositionRef.current
    });

    if (contextRef.current && lastPositionRef.current) {
      contextRef.current.strokeStyle = selectedColor;
      contextRef.current.lineWidth = brushSize;
      contextRef.current.beginPath();
      contextRef.current.moveTo(lastPositionRef.current.x, lastPositionRef.current.y);
      contextRef.current.lineTo(offsetX, offsetY);
      contextRef.current.stroke();
    }

    lastPositionRef.current = { x: offsetX, y: offsetY };
  };

  const stopDrawing = () => {
    setDrawing(false);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        className="w-full border border-gray-700 rounded-lg bg-white"
        style={{ aspectRatio: '4/3' }}
      />
      {!isDrawing && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
          <p className="text-white text-xl font-bold">Waiting for your turn...</p>
        </div>
      )}
    </div>
  );
} 