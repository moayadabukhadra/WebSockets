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

interface DrawData {
  x: number;
  y: number;
  color: string;
  brushSize: number;
  type: 'start' | 'draw' | 'end';
}

export default function Canvas({ 
  socket, 
  isDrawing, 
  selectedColor, 
  brushSize,
  roomId
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Set initial styles
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = selectedColor;
    context.lineWidth = brushSize;
    
    contextRef.current = context;

    // Listen for draw events from other players
    socket.on('draw', (data: DrawData) => {
      if (!contextRef.current) return;
      
      const ctx = contextRef.current;
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.brushSize;

      if (data.type === 'start') {
        ctx.beginPath();
        ctx.moveTo(data.x, data.y);
      } else if (data.type === 'draw') {
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
      } else if (data.type === 'end') {
        ctx.closePath();
      }
    });

    // Clean up socket listener
    return () => {
      socket.off('draw');
    };
  }, [socket, selectedColor, brushSize]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current) return;
    
    const { x, y } = getCanvasCoordinates(e);
    setIsDrawingActive(true);
    
    // Start new path
    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    lastPositionRef.current = { x, y };

    // Emit draw start event
    socket.emit('draw', {
      x,
      y,
      color: selectedColor,
      brushSize,
      type: 'start',
      roomId
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingActive || !contextRef.current || !lastPositionRef.current) return;

    const { x, y } = getCanvasCoordinates(e);
    
    // Draw line
    contextRef.current.strokeStyle = selectedColor;
    contextRef.current.lineWidth = brushSize;
    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
    
    // Emit draw event
    socket.emit('draw', {
      x,
      y,
      color: selectedColor,
      brushSize,
      type: 'draw',
      roomId
    });

    lastPositionRef.current = { x, y };
  };

  const handleDrawingEnd = () => {
    if (!isDrawingActive) return;
    
    setIsDrawingActive(false);
    if (contextRef.current) {
      contextRef.current.closePath();
    }

    // Emit draw end event
    if (lastPositionRef.current) {
      socket.emit('draw', {
        x: lastPositionRef.current.x,
        y: lastPositionRef.current.y,
        color: selectedColor,
        brushSize,
        type: 'end',
        roomId
      });
    }
    
    lastPositionRef.current = null;
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleDrawingEnd}
        onMouseOut={handleDrawingEnd}
        className="w-full border border-gray-700 rounded-lg bg-white"
        style={{ aspectRatio: '4/3' }}
      />
      {!isDrawing && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
          <p className="text-white text-xl font-bold">
            Waiting for your turn...
          </p>
        </div>
      )}
    </div>
  );
} 