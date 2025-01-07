'use client';

interface ToolBarProps {
  selectedColor: string;
  setSelectedColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
}

const colors = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
];

const brushSizes = [2, 4, 6, 8, 10, 12];

export default function ToolBar({ 
  selectedColor, 
  setSelectedColor, 
  brushSize, 
  setBrushSize 
}: ToolBarProps) {
  return (
    <div className="flex items-center gap-4 mb-4 p-2 bg-gray-700 rounded-lg">
      <div className="flex gap-2">
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
      <div className="h-6 w-px bg-gray-600" />
      <div className="flex gap-2">
        {brushSizes.map((size) => (
          <button
            key={size}
            className={`w-8 h-8 rounded flex items-center justify-center ${
              brushSize === size ? 'bg-gray-600' : 'hover:bg-gray-600'
            }`}
            onClick={() => setBrushSize(size)}
          >
            <div
              className="rounded-full bg-white"
              style={{
                width: size,
                height: size,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
} 