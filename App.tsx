
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, FileItem, FileType, SourceProfile } from './types';
import Panel from './components/Panel';
import Editor from './components/Editor';
import { pluginManager } from './services/pluginManager';
import { runAgentTask } from './services/geminiService';

const DEFAULT_PROFILES: SourceProfile[] = [
  { id: 'p1', name: 'C: (Local)', pluginId: 'local-fs', config: { rootPath: '/' } },
  { id: 'p2', name: 'S: (S3 Bucket)', pluginId: 's3', config: { bucket: 'my-backups' } },
  { id: 'p3', name: 'B: (BigQuery)', pluginId: 'bigquery', config: { dataset: 'analytics' } },
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    leftPanel: { profileId: 'p1', path: '/', items: [], selectedIndex: 0, selection: [] },
    rightPanel: { profileId: 'p2', path: '/', items: [], selectedIndex: 0, selection: [] },
    activeSide: 'left',
    logs: ['AICommander initialized.', 'F5=Copy F6=Move Ctrl+Click=Select'],
    profiles: DEFAULT_PROFILES,
    viewingFile: null,
    operation: null,
    showSourceConfig: false,
    showDriveMenu: null,
    shellMode: false,
    helpVisible: false,
  });

  const [cliInput, setCliInput] = useState('');
  const [agentInput, setAgentInput] = useState('');
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const cliInputRef = useRef<HTMLInputElement>(null);

  const refreshPanel = useCallback(async (side: 'left' | 'right', overridePath?: string, overrideProfileId?: string) => {
    setState(prev => {
      const panel = prev[`${side}Panel`];
      const pId = overrideProfileId || panel.profileId;
      const profile = prev.profiles.find(p => p.id === pId);
      if (!profile) return prev;

      const plugin = pluginManager.getPlugin(profile.pluginId);
      if (!plugin) return prev;

      const currentPath = overridePath !== undefined ? overridePath : panel.path;

      plugin.list(profile, currentPath).then(items => {
        setState(s => ({
          ...s,
          [`${side}Panel`]: { ...s[`${side}Panel`], items, path: currentPath, profileId: pId, selectedIndex: 0, selection: [] }
        }));
      });

      return prev;
    });
  }, []);

  useEffect(() => {
    refreshPanel('left');
    refreshPanel('right');
  }, [refreshPanel]);

  const handleEnter = async () => {
    const side = state.activeSide;
    const panel = state[`${side}Panel`];
    const item = panel.items[panel.selectedIndex];
    if (!item) return;

    if ([FileType.DIRECTORY, FileType.BUCKET, FileType.DATASET].includes(item.type)) {
      let nextPath = panel.path;
      if (item.name === '..') {
        const parts = panel.path.split('/').filter(p => p);
        parts.pop();
        nextPath = '/' + parts.join('/');
      } else {
        nextPath = panel.path === '/' ? `/${item.name}` : `${panel.path}/${item.name}`;
      }
      refreshPanel(side, nextPath);
    } else {
      handleView(false);
    }
  };

  const handleView = async (isEditing: boolean) => {
    const side = state.activeSide;
    const panel = state[`${side}Panel`];
    const item = panel.items[panel.selectedIndex];
    if (!item || item.name === '..') return;

    const profile = state.profiles.find(p => p.id === panel.profileId);
    if (!profile) return;
    const plugin = pluginManager.getPlugin(profile.pluginId);
    if (!plugin) return;

    const content = await plugin.read(profile, item.id);
    const textContent = typeof content === 'string' ? content : 'Binary Content';

    const isTable = item.type === FileType.TABLE || ['csv', 'tsv', 'json', 'parquet', 'bson'].includes(item.extension || '');
    const mode = isTable ? 'table' : 'text';

    setState(prev => ({ ...prev, viewingFile: { item, content: textContent, mode, isEditing } }));
  };

  const initOperation = (type: 'copy' | 'move' | 'delete') => {
    const active = state.activeSide;
    const passive = active === 'left' ? 'right' : 'left';
    const activePanel = state[`${active}Panel`];
    const passivePanel = state[`${passive}Panel`];
    
    // Determine items: either selection or current focused item
    let itemsToProcess: FileItem[] = [];
    if (activePanel.selection.length > 0) {
      itemsToProcess = activePanel.items.filter(i => activePanel.selection.includes(i.id));
    } else {
      const current = activePanel.items[activePanel.selectedIndex];
      if (current && current.name !== '..') {
        itemsToProcess = [current];
      }
    }

    if (itemsToProcess.length === 0) return;

    setState(prev => ({
      ...prev,
      operation: {
        type,
        items: itemsToProcess,
        sourceProfileId: activePanel.profileId,
        targetPath: passivePanel.path,
        targetProfileId: passivePanel.profileId
      }
    }));
  };

  const confirmOperation = async () => {
    const op = state.operation;
    if (!op) return;

    const opName = op.type.toUpperCase();
    const itemNames = op.items.map(i => i.name).join(', ');
    const targetProfileName = state.profiles.find(p => p.id === op.targetProfileId)?.name || op.targetProfileId;
    
    setState(prev => ({
      ...prev,
      operation: null,
      logs: [...prev.logs, `${opName} ${op.items.length} items (${itemNames}) to [${targetProfileName}] ${op.targetPath} [MOCK]`],
      // Clear selection after op
      [`${state.activeSide}Panel`]: { ...prev[`${state.activeSide}Panel`], selection: [] }
    }));
    
    // In real app, await plugin.copy/move calls here
    setTimeout(() => {
      refreshPanel(state.activeSide);
      refreshPanel(state.activeSide === 'left' ? 'right' : 'left');
    }, 500);
  };

  const toggleSelection = (index: number, modifiers: { ctrl: boolean, shift: boolean }) => {
    const side = state.activeSide;
    setState(prev => {
      const panel = prev[`${side}Panel`];
      const item = panel.items[index];
      if (!item || item.name === '..') return prev;

      let newSelection = [...panel.selection];
      
      if (modifiers.shift && panel.selectedIndex !== -1) {
        // Range select
        const start = Math.min(panel.selectedIndex, index);
        const end = Math.max(panel.selectedIndex, index);
        for (let i = start; i <= end; i++) {
          const id = panel.items[i].id;
          if (panel.items[i].name !== '..' && !newSelection.includes(id)) {
            newSelection.push(id);
          }
        }
      } else if (modifiers.ctrl) {
        // Toggle
        if (newSelection.includes(item.id)) {
          newSelection = newSelection.filter(id => id !== item.id);
        } else {
          newSelection.push(item.id);
        }
      } else {
        // Single selection via click usually resets unless using ctrl
        newSelection = [];
      }

      return {
        ...prev,
        [`${side}Panel`]: { ...panel, selectedIndex: index, selection: newSelection }
      };
    });
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (state.viewingFile || state.showSourceConfig || state.showDriveMenu || state.helpVisible || state.operation) {
      if (e.key === 'Escape') setState(prev => ({ 
        ...prev, 
        viewingFile: null, 
        showSourceConfig: false, 
        showDriveMenu: null,
        helpVisible: false,
        operation: null
      }));
      if (state.operation && e.key === 'Enter') confirmOperation();
      return;
    }

    if (e.ctrlKey && e.key === 'o') {
      e.preventDefault();
      setState(prev => ({ ...prev, shellMode: !prev.shellMode }));
      return;
    }

    if (e.key === 'F1') { e.preventDefault(); setState(prev => ({ ...prev, helpVisible: true })); return; }
    if (e.key === 'F5') { e.preventDefault(); initOperation('copy'); return; }
    if (e.key === 'F6') { e.preventDefault(); initOperation('move'); return; }
    if (e.key === 'F8') { e.preventDefault(); initOperation('delete'); return; }

    if (document.activeElement?.tagName === 'INPUT') return;

    if (e.altKey && e.key === 'F1') { e.preventDefault(); setState(prev => ({ ...prev, showDriveMenu: 'left' })); }
    if (e.altKey && e.key === 'F2') { e.preventDefault(); setState(prev => ({ ...prev, showDriveMenu: 'right' })); }

    if (!state.shellMode) {
      if (e.key === 'Tab') {
        e.preventDefault();
        setState(prev => ({ ...prev, activeSide: prev.activeSide === 'left' ? 'right' : 'left' }));
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setState(prev => {
          const p = prev[`${prev.activeSide}Panel`];
          return { ...prev, [`${prev.activeSide}Panel`]: { ...p, selectedIndex: Math.min(p.items.length - 1, p.selectedIndex + 1) } };
        });
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setState(prev => {
          const p = prev[`${prev.activeSide}Panel`];
          return { ...prev, [`${prev.activeSide}Panel`]: { ...p, selectedIndex: Math.max(0, p.selectedIndex - 1) } };
        });
      }

      if (e.key === 'Insert' || e.code === 'Space') {
        e.preventDefault();
        setState(prev => {
          const side = prev.activeSide;
          const panel = prev[`${side}Panel`];
          const item = panel.items[panel.selectedIndex];
          if (!item || item.name === '..') return prev;
          
          const newSelection = panel.selection.includes(item.id) 
            ? panel.selection.filter(id => id !== item.id)
            : [...panel.selection, item.id];
            
          return {
            ...prev,
            [`${side}Panel`]: { 
              ...panel, 
              selection: newSelection,
              selectedIndex: Math.min(panel.items.length - 1, panel.selectedIndex + 1) 
            }
          };
        });
      }

      if (e.key === 'Enter') handleEnter();
      if (e.key === 'F3') handleView(false);
      if (e.key === 'F4') handleView(true);
      if (e.key === 'F9') setState(prev => ({ ...prev, showSourceConfig: true }));
    } else {
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        cliInputRef.current?.focus();
      }
    }
  }, [state, handleEnter]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const selectDrive = (side: 'left' | 'right', profileId: string) => {
    setState(prev => ({ ...prev, showDriveMenu: null }));
    refreshPanel(side, '/', profileId);
  };

  const onCliSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;
    setState(prev => ({ ...prev, logs: [...prev.logs, `$ ${cliInput}`] }));
    setCliInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white p-2 gap-2 select-none overflow-hidden font-mono text-sm">
      {state.viewingFile && (
        <Editor 
          item={state.viewingFile.item} 
          initialContent={state.viewingFile.content} 
          isEditing={state.viewingFile.isEditing} 
          mode={state.viewingFile.mode} 
          onClose={() => setState(prev => ({ ...prev, viewingFile: null }))}
          onSave={() => setState(prev => ({ ...prev, logs: [...prev.logs, "Save successful"], viewingFile: null }))} 
        />
      )}

      {/* Operation Confirm Dialog */}
      {state.operation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-80">
          <div className="tui-border tui-bg-panel w-[500px] p-4 shadow-2xl">
            <div className="bg-gray-300 text-black px-2 py-1 font-bold mb-4 uppercase text-center">
              {state.operation.type} {state.operation.items.length} Items
            </div>
            <div className="space-y-4">
              <div className="text-xs text-gray-300">
                {state.operation.type === 'delete' ? 'Are you sure you want to delete:' : 
                  `Destination [${state.profiles.find(p => p.id === state.operation!.targetProfileId)?.name || 'Target'}]:`
                }
              </div>
              
              {state.operation.type !== 'delete' ? (
                <input 
                  className="w-full bg-black border border-gray-600 text-white p-2 outline-none focus:border-cyan-500"
                  value={state.operation.targetPath}
                  onChange={(e) => setState(prev => prev.operation ? ({ ...prev, operation: { ...prev.operation, targetPath: e.target.value } }) : prev)}
                  autoFocus
                  onFocus={(e) => e.target.select()}
                />
              ) : (
                <div className="bg-black border border-gray-600 p-2 max-h-32 overflow-y-auto text-red-400">
                  {state.operation.items.map(i => <div key={i.id}>{i.name}</div>)}
                </div>
              )}

              <div className="flex justify-center gap-4 pt-2">
                <button 
                  onClick={confirmOperation} 
                  className="bg-green-700 hover:bg-green-600 text-white px-6 py-1 font-bold border border-green-500"
                >
                  OK (Enter)
                </button>
                <button 
                  onClick={() => setState(prev => ({ ...prev, operation: null }))} 
                  className="bg-red-700 hover:bg-red-600 text-white px-6 py-1 font-bold border border-red-500"
                >
                  Cancel (Esc)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Overlay */}
      {state.helpVisible && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-80">
          <div className="tui-border tui-bg-panel w-[600px] p-6 shadow-2xl space-y-4">
            <div className="bg-gray-300 text-black px-2 py-1 font-bold text-center uppercase">AICommander Help</div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
              <div className="flex justify-between border-b border-gray-600"><span>F1</span><span className="text-cyan-400">Toggle Help</span></div>
              <div className="flex justify-between border-b border-gray-600"><span>F3 / F4</span><span className="text-cyan-400">View / Edit</span></div>
              <div className="flex justify-between border-b border-gray-600"><span>F5 / F6</span><span className="text-cyan-400">Copy / Move</span></div>
              <div className="flex justify-between border-b border-gray-600"><span>F8</span><span className="text-cyan-400">Delete</span></div>
              <div className="flex justify-between border-b border-gray-600"><span>Ins / Space</span><span className="text-cyan-400">Select Item</span></div>
              <div className="flex justify-between border-b border-gray-600"><span>Ctrl+Click</span><span className="text-cyan-400">Multi Select</span></div>
              <div className="flex justify-between border-b border-gray-600"><span>Double Click</span><span className="text-cyan-400">Open Item</span></div>
              <div className="flex justify-between border-b border-gray-600"><span>Alt+F1/F2</span><span className="text-cyan-400">Drives</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Drive Menu Dialog */}
      {state.showDriveMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="tui-border tui-bg-panel w-64 p-2 shadow-2xl">
            <div className="bg-gray-300 text-black px-2 py-0.5 font-bold mb-2">SELECT DRIVE ({state.showDriveMenu.toUpperCase()})</div>
            <div className="flex flex-col gap-1">
              {state.profiles.map((p, i) => (
                <button 
                  key={p.id}
                  onClick={() => selectDrive(state.showDriveMenu!, p.id)}
                  className="text-left px-2 py-1 hover:tui-selected focus:tui-selected outline-none flex justify-between group"
                >
                  <span>{p.name}</span>
                  <span className="text-gray-400 group-hover:text-black">Alt+{i+1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Source Config Dialog */}
      {state.showSourceConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="tui-border tui-bg-panel w-[500px] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-gray-300 text-black px-2 py-1 font-bold flex justify-between">
              <span>SOURCE MANAGER</span>
              <button onClick={() => setState(prev => ({...prev, showSourceConfig: false}))}>X</button>
            </div>
            <div className="flex-1 p-4 bg-gray-900 overflow-y-auto">
              {state.profiles.map(p => (
                <div key={p.id} className="border border-gray-700 p-2 mb-2 rounded bg-black">
                  <div className="flex justify-between font-bold text-cyan-400">
                    <span>{p.name}</span>
                    <span className="text-gray-600 text-[10px]">{p.pluginId}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {Object.entries(p.config).map(([k, v]) => `${k}=${v}`).join(', ')}
                  </div>
                </div>
              ))}
              <div className="p-2 border border-dashed border-gray-600 text-gray-400 text-xs text-center mt-4">
                Example: Add specific bucket or dataset config here.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center text-xs font-bold px-2 py-1 bg-gray-800 border border-gray-600 shrink-0">
        <div className="flex gap-4">
          <span className="text-yellow-400">AICommander [v2.1]</span>
          {!state.shellMode && (
            <>
              <span>L: <span className="text-cyan-400">{state.profiles.find(p => p.id === state.leftPanel.profileId)?.name}</span></span>
              <span>R: <span className="text-cyan-400">{state.profiles.find(p => p.id === state.rightPanel.profileId)?.name}</span></span>
            </>
          )}
          {state.shellMode && <span className="text-green-400">[SHELL MODE ACTIVE]</span>}
        </div>
        <span>{new Date().toLocaleTimeString()}</span>
      </div>

      <div className="flex-1 flex gap-2 overflow-hidden">
        {!state.shellMode ? (
          <>
            <div className="flex-1">
              <Panel 
                title={state.leftPanel.path} 
                items={state.leftPanel.items} 
                selectedIndex={state.leftPanel.selectedIndex} 
                selection={state.leftPanel.selection}
                isActive={state.activeSide === 'left'}
                onSelect={(idx, mods) => {
                  setState(prev => ({ ...prev, activeSide: 'left' }));
                  toggleSelection(idx, mods);
                }}
                onOpen={handleEnter}
                pluginName={state.profiles.find(p => p.id === state.leftPanel.profileId)?.name || ''}
              />
            </div>
            <div className="flex-1">
              <Panel 
                title={state.rightPanel.path} 
                items={state.rightPanel.items} 
                selectedIndex={state.rightPanel.selectedIndex}
                selection={state.rightPanel.selection}
                isActive={state.activeSide === 'right'}
                onSelect={(idx, mods) => {
                  setState(prev => ({ ...prev, activeSide: 'right' }));
                  toggleSelection(idx, mods);
                }}
                onOpen={handleEnter}
                pluginName={state.profiles.find(p => p.id === state.rightPanel.profileId)?.name || ''}
              />
            </div>
            
            {/* Agent Sidebar */}
            <div className="w-80 tui-border bg-gray-900 flex flex-col overflow-hidden">
              <div className="bg-blue-800 text-white px-2 py-1 text-xs font-bold border-b border-gray-600">🤖 AGENT OPS</div>
              <div className="flex-1 p-2 overflow-y-auto text-[10px] space-y-1">
                {state.logs.filter(l => !l.startsWith('$')).map((log, i) => (
                  <div key={i} className={log.startsWith('Agent:') ? 'text-cyan-400' : 'text-gray-400'}>{log}</div>
                ))}
              </div>
              <div className="p-2 border-t border-gray-700">
                <input 
                  className="w-full bg-black text-green-400 border border-gray-600 p-1 text-xs outline-none focus:border-green-500"
                  placeholder="Ask AI agent..."
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (setIsAgentThinking(true), runAgentTask(agentInput, m => setState(s => ({ ...s, logs: [...s.logs, `Agent: ${m}`]}))), setAgentInput(''), setIsAgentThinking(false))}
                />
              </div>
            </div>
          </>
        ) : (
          /* Shell View */
          <div className="flex-1 tui-border bg-black p-4 overflow-y-auto font-mono text-green-400 relative">
            <div className="mb-4 text-xs text-gray-500 border-b border-gray-800 pb-2">
              AICommander Shell v2.1
              <br />Panels hidden. Ctrl+O to return.
            </div>
            <div className="space-y-1">
              {state.logs.map((log, i) => (
                <div key={i} className={log.startsWith('$') ? 'text-yellow-400' : 'text-green-300'}>{log}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Command Entry */}
      <div className="bg-black border border-gray-600 p-1 flex gap-2 items-center text-xs shrink-0">
        <span className="text-green-500 font-bold whitespace-nowrap">
          {state.activeSide === 'left' ? state.leftPanel.path : state.rightPanel.path} &gt;
        </span>
        <form onSubmit={onCliSubmit} className="flex-1">
          <input 
            ref={cliInputRef}
            className="w-full bg-transparent outline-none text-white" 
            placeholder="Type command..." 
            value={cliInput}
            onChange={(e) => setCliInput(e.target.value)}
          />
        </form>
      </div>

      {/* Function Keys Bar */}
      <div className="flex justify-between text-[10px] font-bold shrink-0">
        {[
          { k: 'F1', l: 'Help' }, { k: 'F2', l: 'Save' }, { k: 'F3', l: 'View' }, 
          { k: 'F4', l: 'Edit' }, { k: 'F5', l: 'Copy' }, { k: 'F6', l: 'Move' }, 
          { k: 'F7', l: 'MkDir' }, { k: 'F8', l: 'Del' }, { k: 'F9', l: 'Cfg' }, { k: 'F10', l: 'Quit' }
        ].map((item, i) => (
          <div key={i} className="flex-1 flex border-r border-gray-700 last:border-r-0 cursor-pointer" onClick={() => {
            if (item.k === 'F1') setState(prev => ({...prev, helpVisible: true}));
            if (item.k === 'F3') handleView(false);
            if (item.k === 'F4') handleView(true);
            if (item.k === 'F5') initOperation('copy');
            if (item.k === 'F6') initOperation('move');
            if (item.k === 'F8') initOperation('delete');
            if (item.k === 'F9') setState(prev => ({...prev, showSourceConfig: true}));
          }}>
            <span className="bg-gray-400 text-black px-1.5">{i + 1}</span>
            <span className="flex-1 bg-gray-800 text-center px-1 py-0.5 hover:bg-gray-700 transition-colors">{item.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
