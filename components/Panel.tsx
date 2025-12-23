
import React from 'react';
import { FileItem, FileType } from '../types';

interface PanelProps {
  title: string;
  items: FileItem[];
  selectedIndex: number;
  selection: string[];
  isActive: boolean;
  onSelect: (index: number, modifiers: { ctrl: boolean, shift: boolean }) => void;
  onOpen: () => void;
  pluginName: string;
}

const Panel: React.FC<PanelProps> = ({ title, items, selectedIndex, selection, isActive, onSelect, onOpen, pluginName }) => {
  const getIcon = (type: FileType) => {
    switch (type) {
      case FileType.DIRECTORY: return '📁';
      case FileType.BUCKET: return '🪣';
      case FileType.TABLE: return '📊';
      case FileType.DATASET: return '📚';
      default: return '📄';
    }
  };

  const formatSize = (size: number, type: FileType) => {
    if (type !== FileType.FILE && type !== FileType.TABLE) return 'UP-DIR';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} K`;
    return `${(size / (1024 * 1024)).toFixed(1)} M`;
  };

  return (
    <div className={`flex flex-col h-full tui-border tui-bg-panel overflow-hidden transition-colors ${isActive ? 'tui-active-panel' : 'opacity-80'}`}>
      <div className="bg-gray-300 text-black px-2 flex justify-between font-bold text-xs shrink-0 cursor-default select-none">
        <span className="truncate">{pluginName.toUpperCase()} {title}</span>
        <span className="bg-yellow-400 px-1 ml-2">L--</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-xs text-left border-collapse select-none">
          <thead>
            <tr className="border-b border-white border-opacity-20 text-yellow-400 sticky top-0 bg-blue-900 z-10">
              <th className="p-1 pl-2 font-normal">Name</th>
              <th className="p-1 text-right font-normal">Size</th>
              <th className="p-1 text-right pr-2 font-normal">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isSelected = selection.includes(item.id);
              const isFocused = idx === selectedIndex;
              
              let textColor = 'text-white';
              if (isSelected) textColor = 'text-yellow-400 font-bold'; // Highlight selected items
              if (item.name === '..') textColor = 'text-gray-300';

              return (
                <tr 
                  key={item.id}
                  onMouseDown={(e) => onSelect(idx, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey })}
                  onDoubleClick={onOpen}
                  className={`cursor-pointer transition-colors ${isFocused ? 'tui-selected' : 'hover:bg-blue-800'} ${textColor}`}
                >
                  <td className="p-1 pl-2 flex items-center gap-1 overflow-hidden">
                    <span className="shrink-0 text-gray-300">{isSelected ? '[*]' : ''} {getIcon(item.type)}</span>
                    <span className="truncate">{item.name}</span>
                  </td>
                  <td className="p-1 text-right tabular-nums">{formatSize(item.size, item.type)}</td>
                  <td className="p-1 text-right pr-2 text-gray-400 tabular-nums">{item.modified}</td>
                </tr>
              );
            })}
            {/* Pad view */}
            {Array.from({ length: Math.max(0, 30 - items.length) }).map((_, i) => (
              <tr key={`empty-${i}`}><td colSpan={3} className="p-1">&nbsp;</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-300 text-black px-2 text-[10px] uppercase font-bold flex justify-between shrink-0 select-none">
        <div className="flex gap-2">
          <span>{items.length} items</span>
          {selection.length > 0 && <span className="text-blue-800">[{selection.length} SELECTED]</span>}
        </div>
        <span className="truncate">{items[selectedIndex]?.name || '---'}</span>
      </div>
    </div>
  );
};

export default Panel;
