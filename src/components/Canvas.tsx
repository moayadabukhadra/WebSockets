'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface CanvasProps {
  socket: Socket;
  isDrawing: boolean;
  selectedColor: string;
  brushSize: number;
  roomId: string;
  roomCode: string;
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
  roomId,
  roomCode
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2; // Double for retina displays
    canvas.height = canvas.offsetHeight * 2;
    canvas.style.width = `${canvas.offsetWidth}px`;
    canvas.style.height = `${canvas.offsetHeight}px`;
    context.scale(2, 2); // Scale for retina displays

    // Set initial styles
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = selectedColor;
    context.lineWidth = brushSize;
    
    contextRef.current = context;
  }, []); // Only run once on mount

  // Update drawing styles when they change
  useEffect(() => {
    if (!contextRef.current) return;
    contextRef.current.strokeStyle = selectedColor;
    contextRef.current.lineWidth = brushSize;
  }, [selectedColor, brushSize]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleDraw = (data: DrawData) => {
      console.log('Received draw event:', data);
      if (!contextRef.current || !canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const x = (data.x * scaleX) / 2;
      const y = (data.y * scaleY) / 2;
      
      const ctx = contextRef.current;
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.brushSize;

      if (data.type === 'start') {
        console.log('Starting new path at:', { x, y });
        ctx.beginPath();
        ctx.moveTo(x, y);
      } else if (data.type === 'draw') {
        console.log('Drawing line to:', { x, y });
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    };

    socket.on('draw', handleDraw);

    return () => {
      socket.off('draw', handleDraw);
    };
  }, [socket]);

  // Add socket listener for canvas clear
  useEffect(() => {
    if (!socket) return;

    socket.on('clearCanvas', () => {
      if (canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
          context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    });

    return () => {
      socket.off('clearCanvas');
    };
  }, [socket]);

  const startDrawing = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (nativeEvent.offsetX * scaleX) / 2;
    const y = (nativeEvent.offsetY * scaleY) / 2;

    contextRef.current.beginPath();
    contextRef.current.moveTo(x, y);
    setIsDrawingActive(true);
    lastPositionRef.current = { x, y };

    // Emit draw start event with unscaled coordinates
    socket.emit('draw', {
      x: nativeEvent.offsetX,
      y: nativeEvent.offsetY,
      color: selectedColor,
      brushSize,
      type: 'start',
      roomId,
      roomCode
    });
  };

  const draw = ({ nativeEvent }: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingActive || !isDrawing || !contextRef.current || !lastPositionRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (nativeEvent.offsetX * scaleX) / 2;
    const y = (nativeEvent.offsetY * scaleY) / 2;

    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
    lastPositionRef.current = { x, y };

    // Emit draw event with scaled coordinates
    socket.emit('draw', {
      x: nativeEvent.offsetX, // Send unscaled coordinates
      y: nativeEvent.offsetY,
      color: selectedColor,
      brushSize,
      type: 'draw',
      roomId,
      roomCode
    });
  };

  const stopDrawing = () => {
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawingActive(false);
    lastPositionRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      className={`w-full border border-gray-700 rounded-lg bg-white ${
        !isDrawing ? 'cursor-default' : 'cursor-crosshair'
      }`}
      style={{ aspectRatio: '16/9' }}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
    />
  );
} 