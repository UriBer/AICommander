
import React from 'react';
import { FileItem, FileType } from '../types';

interface PanelProps {
  title: string;
  items: FileItem[];
  selectedIndex: number;
  isActive: boolean;
  onSelect: (index: number) => void;
  pluginName: string;
}

const Panel: React.FC<PanelProps> = ({ title, items, selectedIndex, isActive, onSelect, pluginName }) => {
  const formatSize = (size: number) => {
    if (size === 0) return 'UP-DIR';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`flex flex-col h-full tui-border tui-bg-panel overflow-hidden ${isActive ? 'tui-active-panel' : ''}`}>
      <div className="bg-gray-300 text-black px-2 flex justify-between font-bold text-xs">
        <span>{pluginName}::{title}</span>
        <span className="bg-yellow-400 px-1">L--</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-white border-opacity-20 text-yellow-400">
              <th className="p-1 pl-2">Name</th>
              <th className="p-1 text-right">Size</th>
              <th className="p-1 text-right pr-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr 
                key={item.id}
                onClick={() => onSelect(idx)}
                className={`cursor-pointer ${idx === selectedIndex ? 'tui-selected font-bold' : 'text-white'}`}
              >
                <td className="p-1 pl-2 flex items-center gap-1">
                  <span>{item.type === FileType.DIRECTORY || item.type === FileType.BUCKET ? '📁' : '📄'}</span>
                  <span className="truncate max-w-[150px]">{item.name}</span>
                </td>
                <td className="p-1 text-right">{item.type === FileType.DIRECTORY ? 'UP-DIR' : formatSize(item.size)}</td>
                <td className="p-1 text-right pr-2 text-gray-400">{item.modified}</td>
              </tr>
            ))}
            {/* Fill remaining space */}
            {Array.from({ length: Math.max(0, 25 - items.length) }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="p-1">&nbsp;</td>
                <td className="p-1">&nbsp;</td>
                <td className="p-1">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-gray-300 text-black px-2 text-[10px] uppercase font-bold">
        {items.length} files | {items[selectedIndex]?.name || 'No selection'}
      </div>
    </div>
  );
};

export default Panel;
