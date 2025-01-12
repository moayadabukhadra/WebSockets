'use client';

interface AdvancedToolBarProps {
  selectedTool: string;
  setSelectedTool: (tool: string) => void;
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const tools = [
  { id: 'brush', icon: '🖌️', label: 'Brush' },
  { id: 'eraser', icon: '🧹', label: 'Eraser' },
  { id: 'rectangle', icon: '⬜', label: 'Rectangle' },
  { id: 'circle', icon: '⭕', label: 'Circle' },
  { id: 'line', icon: '📏', label: 'Line' },
  { id: 'text', icon: '📝', label: 'Text' }
];

const colors = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#008080', '#800000', '#008000', '#000080', '#FFC0CB'
];

const brushSizes = [2, 4, 6, 8, 10, 12, 16, 20];

export default function AdvancedToolBar({
  selectedTool,
  setSelectedTool,
  selectedColor,
  setSelectedColor,
  brushSize,
  setBrushSize,
  canUndo,
  canRedo,
  onUndo,
  onRedo
}: AdvancedToolBarProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-700 rounded-lg">
      <div className="flex gap-2 items-center">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`p-2 rounded-lg ${
              selectedTool === tool.id ? 'bg-purple-500' : 'bg-gray-600'
            } hover:bg-purple-600 transition-colors`}
            onClick={() => setSelectedTool(tool.id)}
            title={tool.label}
          >
            <span className="text-xl">{tool.icon}</span>
          </button>
        ))}
      </div>

      <div className="h-8 w-px bg-gray-600" />

      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={color}
            className={`w-8 h-8 rounded-full border-2 ${
              selectedColor === color ? 'border-white' : 'border-transparent'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => setSelectedColor(color)}
          />
        ))}
      </div>

      <div className="h-8 w-px bg-gray-600" />

      <div className="flex gap-2">
        {brushSizes.map((size) => (
          <button
            key={size}
            className={`w-8 h-8 rounded flex items-center justify-center ${
              brushSize === size ? 'bg-purple-500' : 'bg-gray-600'
            }`}
            onClick={() => setBrushSize(size)}
          >
            <div
              className="rounded-full bg-white"
              style={{ width: size, height: size }}
            />
          </button>
        ))}
      </div>

      <div className="h-8 w-px bg-gray-600" />

      <div className="flex gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-lg bg-gray-600 hover:bg-gray-500 disabled:opacity-50"
          title="Undo"
        >
          ↩️
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-lg bg-gray-600 hover:bg-gray-500 disabled:opacity-50"
          title="Redo"
        >
          ↪️
        </button>
      </div>
    </div>
  );
} 