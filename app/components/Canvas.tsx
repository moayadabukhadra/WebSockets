import React, { useEffect, useRef, useState } from "react";
import useCanvas from "../hooks/useCanvas";
import { socket } from "../socket";

const Canvas = ({ styles }) => {
    const canvasRef = React.useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastCursorPosition, setLastCursorPosition] = useState({ x: 0, y: 0 });


    const { canvas, initializeCanvas, emitCanvasData } = useCanvas();

   


    useEffect(() => {
        if (typeof window !== 'undefined') {
            const cleanup = initializeCanvas();
            if (cleanup) {
                return cleanup;
            }
        }
    }, [initializeCanvas]);

    useEffect(() => {
        if (!canvas || !socket) return;

        canvas.on('object:modified', emitCanvasData);
        canvas.on('object:moving', emitCanvasData);
        canvas.on('object:scaling', emitCanvasData);
        canvas.on('object:rotating', emitCanvasData);
        canvas.on('path:created', emitCanvasData);

        const handleMouseMove = (e) => {
            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (Math.abs(x - lastCursorPosition.x) > 1 || Math.abs(y - lastCursorPosition.y) > 1) {
                socket.emit('cursor-move', { x: Math.round(x), y: Math.round(y) });
                setLastCursorPosition({ x, y });
            }
        };

        const setupSocketListeners = () => {
            socket.on('canvas-data', (data) => {
                console.log(data,'canvas-data');
                
                if (data.clear) {
                    canvas.clear();
                    canvas.setBackgroundColor('white', canvas.renderAll.bind(canvas));
                } else if (data.json) {
                    const zoom = canvas.getZoom();
                    const viewportTransform = [...canvas.viewportTransform];
                    const isDrawingMode = canvas.isDrawingMode;

                    canvas.renderOnAddRemove = false;

                    canvas.loadFromJSON(data.json, () => {
                        canvas.renderOnAddRemove = true;
                        canvas.isDrawingMode = isDrawingMode;
                        canvas.setZoom(zoom);
                        canvas.setViewportTransform(viewportTransform);
                        canvas.renderAll();
                    });
                }
            });
        };

        canvasRef.current?.addEventListener('mousemove', handleMouseMove);
        setupSocketListeners();

        return () => {
            // Add cleanup for the new event listeners
            canvas.off('object:modified', emitCanvasData);
            canvas.off('object:moving', emitCanvasData);
            canvas.off('object:scaling', emitCanvasData);
            canvas.off('object:rotating', emitCanvasData);
            canvas.off('path:created', emitCanvasData);

            canvasRef.current?.removeEventListener('mousemove', handleMouseMove);
            socket.off('cursor-move');
            socket.off('canvas-data');
            socket.off('userList');
            socket.off('userJoined');
            socket.off('userLeft');
        };
    }, [canvas, socket, lastCursorPosition]);

    return (
        <div id="canvas-container" className={styles.canvasContainer}>
            <div id="canvas-wrapper" ref={canvasRef} className={styles.canvasWrapper}>
                <canvas id="canvas" className={styles.canvasElement}></canvas>
            </div>
        </div>
    );
};

export default Canvas;