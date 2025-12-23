
import React, { useState, useEffect, useCallback } from 'react';
import { FileItem } from '../types';

interface HistoryEntry {
  timestamp: number;
  content: string;
}

interface EditorProps {
  item: FileItem;
  initialContent: string;
  isEditing: boolean;
  mode: 'text' | 'table';
  onClose: () => void;
  onSave: (content: string) => void;
}

const Editor: React.FC<EditorProps> = ({ item, initialContent, isEditing, mode, onClose, onSave }) => {
  const [content, setContent] = useState(initialContent);
  const [tableData, setTableData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(0);
  const [splitWidth, setSplitWidth] = useState(320);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>(mode === 'table' ? 'details' : 'history');

  // Generate a unique key for localStorage based on item identity
  const historyKey = `cmd_history_${item.id}_${item.name}`;

  // Load history from localStorage
  const loadHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem(historyKey);
      if (stored) {
        setHistory(JSON.parse(stored));
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, [historyKey]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const saveToHistory = (newContent: string) => {
    const newEntry: HistoryEntry = {
      timestamp: Date.now(),
      content: newContent
    };
    const updatedHistory = [newEntry, ...history].slice(0, 15); // Keep last 15 versions
    setHistory(updatedHistory);
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
  };

  const handleRevert = (restoredContent: string) => {
    if (confirm("Are you sure you want to revert to this version? Current unsaved changes will be lost.")) {
      setContent(restoredContent);
      // If in table mode, we need to re-parse the content
      if (mode === 'table') {
        parseTableContent(restoredContent);
      }
    }
  };

  const parseTableContent = (text: string) => {
    try {
      if (item.extension === 'csv' || item.extension === 'tsv') {
        const lines = text.split('\n');
        const sep = item.extension === 'csv' ? ',' : '\t';
        const h = lines[0].split(sep);
        const data = lines.slice(1).filter(l => l.trim()).map(l => {
          const row = l.split(sep);
          return h.reduce((acc, header, idx) => ({ ...acc, [header]: row[idx] }), {});
        });
        setHeaders(h);
        setTableData(data);
      } else {
        const parsed = JSON.parse(text);
        const data = Array.isArray(parsed) ? parsed : [parsed];
        if (data.length > 0) {
          setHeaders(Object.keys(data[0]));
          setTableData(data);
        }
      }
    } catch (e) {
      console.error("Parsing error", e);
    }
  };

  useEffect(() => {
    if (mode === 'table') {
      parseTableContent(initialContent);
    }
  }, [mode, initialContent, item.extension]);

  const handleSave = () => {
    saveToHistory(content);
    onSave(content);
  };

  const selectedRecord = selectedRowIndex !== null ? tableData[selectedRowIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-6 font-mono">
      <div className="w-full h-full tui-border tui-bg-panel flex flex-col shadow-2xl">
        <div className="bg-gray-300 text-black px-4 py-1 flex justify-between font-bold text-sm">
          <div className="flex gap-4">
            <span>{isEditing ? 'EDITING' : 'VIEWING'}: {item.name}</span>
            <span className="text-blue-800">[{mode.toUpperCase()}]</span>
          </div>
          <button onClick={onClose} className="hover:bg-red-500 hover:text-white px-2">X</button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto p-2 bg-black bg-opacity-30">
            {mode === 'text' ? (
              <textarea
                readOnly={!isEditing}
                className="w-full h-full bg-black text-green-400 border border-gray-700 p-4 outline-none resize-none focus:border-cyan-500 text-sm leading-relaxed"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-blue-900 text-yellow-400 z-10">
                  <tr>
                    {headers.map(h => <th key={h} className="p-2 border border-gray-700 whitespace-nowrap">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr 
                      key={i} 
                      onClick={() => setSelectedRowIndex(i)}
                      className={`cursor-pointer border-b border-gray-800 ${selectedRowIndex === i ? 'bg-cyan-900 text-white' : 'hover:bg-gray-900 text-cyan-300'}`}
                    >
                      {headers.map(h => <td key={h} className="p-2 border-r border-gray-800 truncate max-w-[200px]">{String(row[h])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div 
            style={{ width: splitWidth }} 
            className="border-l-4 border-gray-600 bg-gray-900 overflow-hidden flex flex-col shrink-0"
          >
            <div className="flex bg-gray-800">
              {mode === 'table' && (
                <button 
                  onClick={() => setActiveTab('details')}
                  className={`flex-1 py-1 text-[10px] font-bold uppercase transition-colors ${activeTab === 'details' ? 'bg-blue-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Details
                </button>
              )}
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-1 text-[10px] font-bold uppercase transition-colors ${activeTab === 'history' ? 'bg-blue-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                History ({history.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeTab === 'details' && mode === 'table' && (
                <div className="p-2 space-y-2">
                  <div className="text-[10px] font-bold text-yellow-400 mb-2 uppercase border-b border-gray-700 pb-1">Field Inspector</div>
                  {selectedRecord ? (
                    Object.entries(selectedRecord).map(([key, val]) => (
                      <div key={key} className="border-b border-gray-800 pb-2">
                        <div className="text-[9px] text-gray-500 font-bold uppercase">{key}</div>
                        <div className="text-xs text-green-400 break-all">{String(val)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-600 text-center mt-10 italic text-xs">Select a row</div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="p-2 flex flex-col h-full">
                  <div className="text-[10px] font-bold text-yellow-400 mb-2 uppercase border-b border-gray-700 pb-1">Version History</div>
                  {history.length === 0 ? (
                    <div className="text-gray-600 text-center mt-10 italic text-xs">No previous versions</div>
                  ) : (
                    <div className="space-y-2">
                      {history.map((entry, idx) => (
                        <div key={entry.timestamp} className="bg-black border border-gray-700 p-2 text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-gray-400">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                            {idx === 0 && <span className="text-[9px] bg-green-900 text-green-300 px-1">LATEST</span>}
                          </div>
                          <div className="text-[10px] text-gray-500 truncate mb-2">
                            {entry.content.substring(0, 50)}...
                          </div>
                          <button 
                            onClick={() => handleRevert(entry.content)}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white text-[10px] py-1 font-bold uppercase transition-colors"
                          >
                            Restore Version
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-2 border-t border-gray-700 bg-gray-800 text-[9px] text-gray-500 flex justify-between">
              <span>DRAG TO RESIZE</span>
              <span>LOCAL PERSISTENCE</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-300 text-black px-4 py-1 flex gap-4 text-xs font-bold border-t border-gray-500">
          {isEditing && (
            <button 
              onClick={handleSave} 
              className="bg-blue-700 text-white px-3 py-0.5 hover:bg-blue-600 flex items-center gap-1"
            >
              <span className="bg-white bg-opacity-20 px-1 rounded text-[10px]">F2</span> SAVE
            </button>
          )}
          <button onClick={onClose} className="bg-gray-500 text-white px-3 py-0.5 hover:bg-gray-400">ESC CLOSE</button>
          <div className="ml-auto flex gap-4 items-center">
             {mode === 'table' && <span className="text-gray-600">Rows: {tableData.length}</span>}
             <span className="text-gray-600">Size: {content.length} chars</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;
