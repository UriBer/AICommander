
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, FileItem, FileType } from './types';
import Panel from './components/Panel';
import { pluginManager } from './services/pluginManager';
import { runAgentTask } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    leftPanel: { pluginId: 'local-fs', path: '/', items: [], selectedIndex: 0 },
    rightPanel: { pluginId: 'cloud-storage', path: '/', items: [], selectedIndex: 0 },
    activeSide: 'left',
    logs: ['System initialized.', 'Plugins loaded: Local-FS, S3-Buckets.']
  });

  const [agentInput, setAgentInput] = useState('');
  const [isAgentThinking, setIsAgentThinking] = useState(false);

  const refreshPanel = useCallback(async (side: 'left' | 'right') => {
    const panelConfig = state[`${side}Panel`];
    const plugin = pluginManager.getPlugin(panelConfig.pluginId);
    if (!plugin) return;

    try {
      const items = await plugin.list(panelConfig.path);
      setState(prev => ({
        ...prev,
        [`${side}Panel`]: { ...prev[`${side}Panel`], items }
      }));
    } catch (err) {
      console.error(err);
    }
  }, [state.leftPanel.pluginId, state.leftPanel.path, state.rightPanel.pluginId, state.rightPanel.path]);

  useEffect(() => {
    refreshPanel('left');
    refreshPanel('right');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Basic navigation
    if (e.key === 'Tab') {
      e.preventDefault();
      setState(prev => ({ ...prev, activeSide: prev.activeSide === 'left' ? 'right' : 'left' }));
    }

    if (e.key === 'ArrowDown') {
      const side = state.activeSide;
      setState(prev => {
        const panel = prev[`${side}Panel`];
        return {
          ...prev,
          [`${side}Panel`]: {
            ...panel,
            selectedIndex: Math.min(panel.items.length - 1, panel.selectedIndex + 1)
          }
        };
      });
    }

    if (e.key === 'ArrowUp') {
      const side = state.activeSide;
      setState(prev => {
        const panel = prev[`${side}Panel`];
        return {
          ...prev,
          [`${side}Panel`]: {
            ...panel,
            selectedIndex: Math.max(0, panel.selectedIndex - 1)
          }
        };
      });
    }
  }, [state.activeSide]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const onRunAgent = async () => {
    if (!agentInput.trim()) return;
    setIsAgentThinking(true);
    setState(prev => ({ ...prev, logs: [...prev.logs, `User: ${agentInput}`] }));
    
    const input = agentInput;
    setAgentInput('');

    await runAgentTask(input, (msg) => {
      setState(prev => ({ ...prev, logs: [...prev.logs, `Agent: ${msg}`].slice(-20) }));
    });
    
    setIsAgentThinking(false);
  };

  const getPluginName = (id: string) => pluginManager.getPlugin(id)?.metadata.name || 'Unknown';

  return (
    <div className="flex flex-col h-screen bg-black text-white p-2 gap-2 select-none overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center text-xs font-bold px-2 py-1 bg-gray-800 border border-gray-600">
        <div className="flex gap-4">
          <span className="text-yellow-400">COMMANDER-AI v1.0</span>
          <span>LEFT: {state.leftPanel.path}</span>
          <span>RIGHT: {state.rightPanel.path}</span>
        </div>
        <div className="flex gap-4">
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Main Panels */}
      <div className="flex-1 flex gap-2 overflow-hidden">
        <div className="flex-1">
          <Panel 
            title={state.leftPanel.path}
            items={state.leftPanel.items}
            selectedIndex={state.leftPanel.selectedIndex}
            isActive={state.activeSide === 'left'}
            onSelect={(idx) => setState(prev => ({ ...prev, leftPanel: { ...prev.leftPanel, selectedIndex: idx }, activeSide: 'left' }))}
            pluginName={getPluginName(state.leftPanel.pluginId)}
          />
        </div>
        <div className="flex-1">
          <Panel 
            title={state.rightPanel.path}
            items={state.rightPanel.items}
            selectedIndex={state.rightPanel.selectedIndex}
            isActive={state.activeSide === 'right'}
            onSelect={(idx) => setState(prev => ({ ...prev, rightPanel: { ...prev.rightPanel, selectedIndex: idx }, activeSide: 'right' }))}
            pluginName={getPluginName(state.rightPanel.pluginId)}
          />
        </div>
        
        {/* Agent Side Sidebar */}
        <div className="w-80 tui-border bg-gray-900 flex flex-col overflow-hidden">
          <div className="bg-blue-800 text-white px-2 py-1 text-xs font-bold border-b border-gray-600">
            🤖 AGENT LOGS
          </div>
          <div className="flex-1 p-2 overflow-y-auto text-[10px] space-y-1 font-mono">
            {state.logs.map((log, i) => (
              <div key={i} className={log.startsWith('Agent:') ? 'text-cyan-400' : 'text-gray-400'}>
                {log}
              </div>
            ))}
            {isAgentThinking && <div className="animate-pulse text-yellow-400">Agent is thinking...</div>}
          </div>
          <div className="p-2 border-t border-gray-700">
            <input 
              className="w-full bg-black text-green-400 border border-gray-600 p-1 text-xs outline-none focus:border-green-500"
              placeholder="Ask agent to move/analyze..."
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onRunAgent()}
              disabled={isAgentThinking}
            />
          </div>
        </div>
      </div>

      {/* Bottom CLI */}
      <div className="bg-black border border-gray-600 p-1 flex gap-2 items-center text-xs">
        <span className="text-green-500 font-bold">$</span>
        <input 
          className="flex-1 bg-transparent outline-none" 
          placeholder="Command..." 
          onKeyDown={(e) => e.key === 'Enter' && setState(prev => ({ ...prev, logs: [...prev.logs, `CLI: ${e.currentTarget.value}`] }))}
        />
      </div>

      {/* Function Keys */}
      <div className="flex justify-between text-[10px] font-bold">
        {[
          'Help', 'Menu', 'View', 'Edit', 'Copy', 'RenMov', 'MkDir', 'Delete', 'Pull', 'Quit'
        ].map((label, i) => (
          <div key={i} className="flex-1 flex border-r border-gray-700 last:border-r-0">
            <span className="bg-gray-400 text-black px-1.5">{i + 1}</span>
            <span className="flex-1 bg-gray-800 text-center px-2">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
