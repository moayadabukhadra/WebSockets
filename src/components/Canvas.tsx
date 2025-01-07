'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface CanvasProps {
  socket: Socket;
  isDrawing: boolean;
  selectedColor: string;
  brushSize: number;
}

export default function Canvas({ 
  socket, 
  isDrawing, 
  selectedColor, 
  brushSize 
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 800;
    canvas.height = 600;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = selectedColor;
    context.lineWidth = brushSize;
    contextRef.current = context;

    socket.on('draw', (data: { 
      x: number; 
      y: number; 
      drawing: boolean;
      color: string;
      size: number;
      lastPosition: { x: number; y: number } | null;
    }) => {
      const context = contextRef.current;
      if (!context) return;

      context.strokeStyle = data.color;
      context.lineWidth = data.size;
      
      if (data.lastPosition && data.drawing) {
        context.beginPath();
        context.moveTo(data.lastPosition.x, data.lastPosition.y);
        context.lineTo(data.x, data.y);
        context.stroke();
      }
    });

    return () => {
      socket.off('draw');
    };
  }, [socket, selectedColor, brushSize]);

  const startDrawing = ({ nativeEvent }: React.MouseEvent) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    lastPositionRef.current = { x: offsetX, y: offsetY };
    setDrawing(true);
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
        onMouseDown={startDrawing}
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