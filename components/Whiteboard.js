import { useEffect, useState, useCallback, useRef } from 'react';
import styles from '../styles/Whiteboard.module.css';
import { fabric } from 'fabric';

export default function Whiteboard({ socket }) {
    const [username, setUsername] = useState('');
    const [canvas, setCanvas] = useState(null);
    const cursorsRef = useRef(new Map());
    const [lastCursorPosition, setLastCursorPosition] = useState({ x: 0, y: 0 });
    const canvasWrapperRef = useRef(null);

    const initializeCanvas = useCallback(() => {
        const container = document.getElementById('canvas-container');
        const canvasElement = document.getElementById('canvas');
        if (!container || !canvasElement) {
            console.log('Container or canvas not found');
            return null;
        }

        // Force minimum dimensions if container size is 0
        const containerWidth = container.offsetWidth || window.innerWidth - 250; // subtract sidebar width
        const containerHeight = container.offsetHeight || window.innerHeight - 100; // subtract toolbar height

        console.log('Container dimensions:', containerWidth, containerHeight);

        // Set initial canvas element size
        canvasElement.style.width = `${containerWidth}px`;
        canvasElement.style.height = `${containerHeight}px`;

        // Create the fabric canvas instance
        const fabricCanvas = new fabric.Canvas(canvasElement, {
            width: containerWidth,
            height: containerHeight,
            isDrawingMode: true,
            backgroundColor: 'white',
            renderOnAddRemove: true,
            selection: true
        });

        // Log canvas dimensions after creation
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

        // Initial resize
        handleResize();
        window.addEventListener('resize', handleResize);

        // Setup the drawing brush
        fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
        fabricCanvas.freeDrawingBrush.width = 5;
        fabricCanvas.freeDrawingBrush.color = '#000000';

        return () => {
            window.removeEventListener('resize', handleResize);
            fabricCanvas.dispose();
        };
    }, []);

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

        // Add these event listeners to handle object modifications
        canvas.on('object:modified', emitCanvasData);
        canvas.on('object:moving', emitCanvasData);
        canvas.on('object:scaling', emitCanvasData);
        canvas.on('object:rotating', emitCanvasData);
        canvas.on('path:created', emitCanvasData);

        const handleMouseMove = (e) => {
            if (!canvasWrapperRef.current) return;
            const rect = canvasWrapperRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (Math.abs(x - lastCursorPosition.x) > 1 || Math.abs(y - lastCursorPosition.y) > 1) {
                socket.emit('cursor-move', { x: Math.round(x), y: Math.round(y) });
                setLastCursorPosition({ x, y });
            }
        };

        const setupSocketListeners = () => {
            socket.on('cursor-move', (data) => {
                if (data.userId !== socket.id) {
                    updateCursor(data.userId, data.x, data.y, data.username);
                }
            });

            socket.on('canvas-data', (data) => {
                if (data.clear) {
                    canvas.clear();
                    canvas.setBackgroundColor('white', canvas.renderAll.bind(canvas));
                } else if (data.json) {
                    // Preserve the current state before loading
                    const zoom = canvas.getZoom();
                    const viewportTransform = [...canvas.viewportTransform];
                    const isDrawingMode = canvas.isDrawingMode;
                    
                    // Temporarily disable rendering to prevent flickering
                    canvas.renderOnAddRemove = false;
                    
                    canvas.loadFromJSON(data.json, () => {
                        // Restore the previous state
                        canvas.renderOnAddRemove = true;
                        canvas.isDrawingMode = isDrawingMode;
                        canvas.setZoom(zoom);
                        canvas.setViewportTransform(viewportTransform);
                        canvas.renderAll();
                    });
                }
            });

            socket.on('userList', updateUsersList);
            socket.on('userJoined', (data) => console.log(`${data.username} joined`));
            socket.on('userLeft', (data) => {
                const cursor = cursorsRef.current.get(data.userId);
                if (cursor) {
                    cursor.remove();
                    cursorsRef.current.delete(data.userId);
                }
                console.log(`${data.username} left`);
            });
        };

        canvasWrapperRef.current?.addEventListener('mousemove', handleMouseMove);
        setupSocketListeners();

        return () => {
            // Add cleanup for the new event listeners
            canvas.off('object:modified', emitCanvasData);
            canvas.off('object:moving', emitCanvasData);
            canvas.off('object:scaling', emitCanvasData);
            canvas.off('object:rotating', emitCanvasData);
            canvas.off('path:created', emitCanvasData);
            
            canvasWrapperRef.current?.removeEventListener('mousemove', handleMouseMove);
            socket.off('cursor-move');
            socket.off('canvas-data');
            socket.off('userList');
            socket.off('userJoined');
            socket.off('userLeft');
        };
    }, [canvas, socket, lastCursorPosition]);

    const registerUser = () => {
        const inputUsername = document.getElementById('username-input').value.trim();
        if (inputUsername) {
            setUsername(inputUsername);
            document.getElementById('login-modal').style.display = 'none';
            document.querySelector(`.${styles.container}`).style.display = 'flex';
            socket.emit('register', inputUsername);
        }
    };

    const updateCursor = (userId, x, y, username) => {
        let cursor = cursorsRef.current.get(userId);

        if (!cursor && canvasWrapperRef.current) {
            cursor = document.createElement('div');
            cursor.className = styles.cursor;
            cursor.style.background = `hsl(${Math.random() * 360}, 70%, 50%)`;
            cursor.dataset.username = username;
            canvasWrapperRef.current.appendChild(cursor);
            cursorsRef.current.set(userId, cursor);
        }

        if (cursor) {
            cursor.style.left = `${x}px`;
            cursor.style.top = `${y}px`;
        }
    };

    const updateUsersList = (users) => {
        const usersList = document.getElementById('users-list');
        if (usersList) {
            usersList.innerHTML = users
                .map(user => `<div class="${styles.userItem}">${user.username}</div>`)
                .join('');
        }
    };

    const setActiveTool = (toolName) => {
        const tools = document.querySelectorAll(`.${styles.toolBtn}`);
        tools.forEach(tool => tool.classList.remove(styles.active));
        document.querySelector(`[data-tool="${toolName}"]`)?.classList.add(styles.active);

        if (!canvas) return;

        canvas.isDrawingMode = false;
        canvas.selection = true;

        switch (toolName) {
            case 'pencil':
                canvas.isDrawingMode = true;
                canvas.freeDrawingBrush.color = document.getElementById('colorPicker').value;
                canvas.freeDrawingBrush.width = parseInt(document.getElementById('brushSize').value);
                break;
            case 'eraser':
                canvas.isDrawingMode = true;
                canvas.freeDrawingBrush.color = '#ffffff';
                canvas.freeDrawingBrush.width = parseInt(document.getElementById('brushSize').value) * 2;
                break;
            case 'rect':
                addShape('rect');
                break;
            case 'circle':
                addShape('circle');
                break;
            case 'text':
                addText();
                break;
        }
    };

    const addShape = (type) => {
        if (!canvas) return;

        let shape;
        if (type === 'rect') {
            shape = new fabric.Rect({
                left: 100,
                top: 100,
                width: 100,
                height: 100,
                fill: document.getElementById('colorPicker').value
            });
        } else if (type === 'circle') {
            shape = new fabric.Circle({
                left: 100,
                top: 100,
                radius: 50,
                fill: document.getElementById('colorPicker').value
            });
        }

        if (shape) {
            canvas.add(shape);
            canvas.setActiveObject(shape);
            emitCanvasData();
        }
    };

    const addText = () => {
        if (!canvas) return;

        const text = new fabric.IText('Type here', {
            left: 100,
            top: 100,
            fontFamily: 'Arial',
            fill: document.getElementById('colorPicker').value
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        emitCanvasData();
    };

    const throttle = (func, limit) => {
        let inThrottle;
        return function(...args) {
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

    const clearCanvas = () => {
        if (canvas) {
            canvas.clear();
            canvas.setBackgroundColor('white', canvas.renderAll.bind(canvas));
            socket.emit('canvas-data', { clear: true });
        }
    };

    return (
        <>
            <div id="login-modal" className={styles.loginModal}>
                <div className={styles.loginForm}>
                    <h2>Enter Your Name</h2>
                    <input type="text" id="username-input" placeholder="Your name" />
                    <button onClick={registerUser}>Join Whiteboard</button>
                </div>
            </div>

            <div className={styles.container} style={{ display: 'none' }}>
                <div className={styles.sidebar}>
                    <h3>Connected Users</h3>
                    <div id="users-list" className={styles.usersList}></div>
                </div>

                <div className={styles.mainContent}>
                    <div className={styles.tools}>
                        <button className={`${styles.toolBtn} ${styles.active}`} data-tool="pencil" onClick={() => setActiveTool('pencil')}>Pencil</button>
                        <button className={styles.toolBtn} data-tool="rect" onClick={() => setActiveTool('rect')}>Rectangle</button>
                        <button className={styles.toolBtn} data-tool="circle" onClick={() => setActiveTool('circle')}>Circle</button>
                        <button className={styles.toolBtn} data-tool="text" onClick={() => setActiveTool('text')}>Text</button>
                        <button className={styles.toolBtn} data-tool="select" onClick={() => setActiveTool('select')}>Select</button>
                        <button className={styles.toolBtn} data-tool="eraser" onClick={() => setActiveTool('eraser')}>Eraser</button>
                        <input type="color" id="colorPicker" defaultValue="#000000" onChange={(e) => canvas && (canvas.freeDrawingBrush.color = e.target.value)} />
                        <input type="range" id="brushSize" min="1" max="50" defaultValue="5" onChange={(e) => canvas && (canvas.freeDrawingBrush.width = parseInt(e.target.value))} />
                        <button className={styles.toolBtn} onClick={clearCanvas}>Clear Canvas</button>
                        <button className={styles.toolBtn} onClick={() => canvas && window.open(canvas.toDataURL('image/png'))}>Download</button>
                        <button className={styles.toolBtn} onClick={deleteSelectedObjects}>Delete</button>
                    </div>
                    <div id="canvas-container" className={styles.canvasContainer}>
                        <div id="canvas-wrapper" ref={canvasWrapperRef} className={styles.canvasWrapper}>
                            <canvas id="canvas" className={styles.canvasElement}></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}  