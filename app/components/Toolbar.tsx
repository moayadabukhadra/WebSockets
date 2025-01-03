import { useState, useEffect } from "react";
import useCanvas from "../hooks/useCanvas";
import { fabric } from "fabric";
import { socket } from "../socket";

const Toolbar = ({ styles }) => {
    const { 
        canvas, 
        emitCanvasData, 
        clearCanvas, 
        deleteSelectedObjects, 
        setColor, 
        setBrushSize, 
        color, 
        brushSize, 
        addText,
        setTool,
        activeTool
    } = useCanvas();

    const addShape = (type) => {
        if (!canvas) return;

        let shape;
        if (type === "rect") {
            shape = new fabric.Rect({
                left: 100,
                top: 100,
                width: 100,
                height: 100,
                fill: color,
            });
        } else if (type === "circle") {
            shape = new fabric.Circle({
                left: 100,
                top: 100,
                radius: 50,
                fill: color,
            });
        }

        if (shape) {
            canvas.add(shape);
            canvas.setActiveObject(shape);
            emitCanvasData();
        }
    };

    const handleToolClick = (toolName: string) => {
        console.log(toolName,'toolNametoolNametoolName');
        
        socket.emit('tool', toolName);
        const tools = document.querySelectorAll(`.${styles.toolBtn}`);
        tools.forEach((tool) => tool.classList.remove(styles.active));
        document.querySelector(`[data-tool="${toolName}"]`)?.classList.add(styles.active);

        setTool(toolName);
 
        if (toolName === "rect" || toolName === "circle") {
            addShape(toolName);
        } else if (toolName === "text") {
            addText();
        }
    };

    return (
        <div className={styles.tools}>
            <button 
                className={`${styles.toolBtn} ${activeTool === 'pencil' ? styles.active : ''}`} 
                data-tool="pencil" 
                onClick={() => handleToolClick("pencil")}
            >
                Pencil
            </button>
            <button 
                className={`${styles.toolBtn} ${activeTool === 'rect' ? styles.active : ''}`} 
                data-tool="rect" 
                onClick={() => handleToolClick("rect")}
            >
                Rectangle
            </button>
            <button 
                className={`${styles.toolBtn} ${activeTool === 'circle' ? styles.active : ''}`} 
                data-tool="circle" 
                onClick={() => handleToolClick("circle")}
            >
                Circle
            </button>
            <button 
                className={`${styles.toolBtn} ${activeTool === 'text' ? styles.active : ''}`} 
                data-tool="text" 
                onClick={() => handleToolClick("text")}
            >
                Text
            </button>
            <button 
                className={`${styles.toolBtn} ${activeTool === 'select' ? styles.active : ''}`} 
                data-tool="select" 
                onClick={() => handleToolClick("select")}
            >
                Select
            </button>
            <button 
                className={`${styles.toolBtn} ${activeTool === 'eraser' ? styles.active : ''}`} 
                data-tool="eraser" 
                onClick={() => handleToolClick("eraser")}
            >
                Eraser
            </button>
            <input
                type="color"
                id="colorPicker"
                value={color}
                onChange={(e) => setColor(e.target.value)}
            />
            <input
                type="range"
                id="brushSize"
                min="1"
                max="50"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
            />
            <button className={styles.toolBtn} onClick={clearCanvas}>
                Clear Canvas
            </button>
            <button className={styles.toolBtn} onClick={() => canvas && window.open(canvas.toDataURL("image/png"))}>
                Download
            </button>
            <button className={styles.toolBtn} onClick={deleteSelectedObjects}>
                Delete
            </button>
        </div>
    );
};

export default Toolbar;
