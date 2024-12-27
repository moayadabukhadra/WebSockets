'use client';

import { forwardRef, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { fabric } from 'fabric-pure-browser';

interface CanvasProps {
  socket: Socket | null;
  isDrawer: boolean;
}

const Canvas = forwardRef<fabric.Canvas, CanvasProps>(({ socket, isDrawer }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = ref as React.MutableRefObject<fabric.Canvas | null>;

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: isDrawer,
      width: 800,
      height: 600,
      backgroundColor: 'white',
    });

    fabricRef.current = canvas;

    const handleResize = () => {
      const container = canvas.getElement().parentElement;
      if (!container) return;

      const { width } = container.getBoundingClientRect();
      const scale = width / 800;
      
      canvas.setDimensions({
        width: width,
        height: 600 * scale
      });
      canvas.setZoom(scale);
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricRef.current || !socket) return;

    const canvas = fabricRef.current;
    canvas.isDrawingMode = isDrawer;

    socket.on('canvas-data', (data: any) => {
      if (data.clear) {
        canvas.clear();
        canvas.setBackgroundColor('white', canvas.renderAll.bind(canvas));
      } else if (data.json) {
        canvas.loadFromJSON(data.json, canvas.renderAll.bind(canvas));
      }
    });

    const throttledEmit = throttle((json: string) => {
      socket.emit('canvas-data', { json });
    }, 100);

    canvas.on('object:added', () => {
      if (!isDrawer) return;
      throttledEmit(JSON.stringify(canvas.toJSON()));
    });

    canvas.on('object:modified', () => {
      if (!isDrawer) return;
      throttledEmit(JSON.stringify(canvas.toJSON()));
    });

    return () => {
      socket.off('canvas-data');
      canvas.off('object:added');
      canvas.off('object:modified');
    };
  }, [socket, isDrawer]);

  return (
    <div className="relative w-full">
      <canvas ref={canvasRef} className="w-full" />
    </div>
  );
});

Canvas.displayName = 'Canvas';

function throttle(func: Function, limit: number) {
  let inThrottle: boolean;
  return function (...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export default Canvas; 