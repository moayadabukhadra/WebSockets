import { useCallback, useEffect, useState } from 'react';
import { fabric } from 'fabric';
import { socket } from '../socket';

export default function useCanvas() {
  const [canvas, setCanvas] = useState(null);
  const [color, setColor] = useState<string | null>("#000000");
  const [brushSize, setBrushSize] = useState<number | null>(5);
  const [activeTool, setActiveTool] = useState<string>("pencil");

  useEffect(() => {
    if (canvas) {
      if (activeTool === "eraser") {
        canvas.freeDrawingBrush.color = "#ffffff";
        canvas.freeDrawingBrush.width = brushSize * 2;
      } else {
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = brushSize;
      }
      canvas.renderAll();
    }
  }, [color, brushSize, activeTool, canvas]);

  const throttle = (func: Function, limit: any) => {
    let inThrottle: any;
    return function (...args: any) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }

  const throttledEmit = useCallback(
    throttle((json) => {
      socket.emit('canvas-data', { json });
    }, 16),
    [socket]
  );

  const emitCanvasData = useCallback(() => {
    if (!socket || !canvas) return;
    throttledEmit(JSON.stringify(canvas.toJSON()));
  }, [socket, canvas, throttledEmit]);

  const clearCanvas = () => {
    if (canvas) {
      canvas.clear();
      canvas.setBackgroundColor('white', canvas.renderAll.bind(canvas));
      socket.emit('canvas-data', { clear: true });
    }
  };

  const deleteSelectedObjects = () => {
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      if (activeObject.type === 'activeSelection') {
        activeObject.forEachObject(obj => {
          canvas.remove(obj);
        });
        canvas.discardActiveObject();
      } else {
        canvas.remove(activeObject);
      }
      canvas.requestRenderAll();
      emitCanvasData();
    }
  };

  const addText = () => {
    if (!canvas) return;

    const text = new fabric.IText("Type here", {
      left: 100,
      top: 100,
      fontFamily: "Arial",
      fill: color,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    emitCanvasData();
  };

  const setTool = useCallback((toolName: string) => {
    if (!canvas) return;
    
    setActiveTool(toolName);
    canvas.isDrawingMode = false;
    canvas.selection = true;

    switch (toolName) {
      case "pencil":
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = brushSize;
        break;
      case "eraser":
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = "#ffffff";
        canvas.freeDrawingBrush.width = brushSize * 2;
        break;
      case "select":
        canvas.selection = true;
        break;
    }
    canvas.renderAll();
  }, [canvas, color, brushSize]);

  const initializeCanvas = useCallback(() => {
    const container = document.getElementById('canvas-container');
    const canvasElement = document.getElementById('canvas');
    if (!container || !canvasElement) {
      console.log('Container or canvas not found');
      return null;
    }

    const containerWidth = container.offsetWidth || window.innerWidth - 250;
    const containerHeight = container.offsetHeight || window.innerHeight - 100;

    console.log('Container dimensions:', containerWidth, containerHeight);

    canvasElement.style.width = `${containerWidth}px`; 
    canvasElement.style.height = `${containerHeight}px`;

    const fabricCanvas = new fabric.Canvas(canvasElement, {
      width: containerWidth,
      height: containerHeight,
      isDrawingMode: true,
      backgroundColor: 'white',
      renderOnAddRemove: true,
      selection: true
    });

    console.log('Canvas dimensions:', fabricCanvas.width, fabricCanvas.height);

    setCanvas(fabricCanvas);

    const handleResize = () => {
      const newWidth = container.offsetWidth || window.innerWidth - 250;
      const newHeight = container.offsetHeight || window.innerHeight - 100;

      console.log('Resize dimensions:', newWidth, newHeight);

      fabricCanvas.setDimensions({
        width: newWidth,
        height: newHeight
      });
      fabricCanvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
    fabricCanvas.freeDrawingBrush.width = 5;
    fabricCanvas.freeDrawingBrush.color = '#000000';

    return () => {
      window.removeEventListener('resize', handleResize);
      fabricCanvas.dispose();
    };
  }, []);

  return { 
    canvas, 
    initializeCanvas, 
    emitCanvasData, 
    clearCanvas, 
    deleteSelectedObjects, 
    brushSize, 
    setBrushSize, 
    color, 
    setColor,
    addText,
    setTool,
    activeTool 
  };
}
