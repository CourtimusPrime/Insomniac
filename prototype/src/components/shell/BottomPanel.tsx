import { useState, useEffect, useRef } from 'react';
import {
  Terminal, BarChart2, Heart, ChevronRight, ChevronUp, ChevronDown, Globe, Play, Square
} from 'lucide-react';
import { useLayoutStore } from '../../stores/layout';
import { useProjectsStore } from '../../stores/projects';
import { useDevServerStatus, useStartDevServer, useStopDevServer } from '../../api/localhost';

export function BottomPanel() {
  const activeTab = useLayoutStore((s) => s.activeTab);
  const setActiveTab = useLayoutStore((s) => s.setActiveTab);
  const collapsed = useLayoutStore((s) => s.collapsedPanels.bottomPanel);
  const togglePanel = useLayoutStore((s) => s.togglePanel);

  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const { data: devStatus } = useDevServerStatus(activeProjectId);
  const startServer = useStartDevServer();
  const stopServer = useStopDevServer();

  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Listen for devserver:log WebSocket events
  useEffect(() => {
    function onMessage(evt: MessageEvent) {
      try {
        const msg = JSON.parse(evt.data) as { event: string; data?: { projectId?: string; line?: string } };
        if (msg.event === 'devserver:log' && msg.data?.projectId === activeProjectId && msg.data.line) {
          setLogs((prev) => [...prev.slice(-199), msg.data!.line!]);
        }
      } catch { /* ignore */ }
    }

    const ws = new WebSocket('ws://localhost:4321/ws');
    ws.addEventListener('message', onMessage);
    return () => { ws.close(); };
  }, [activeProjectId]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Clear logs when project changes
  useEffect(() => { setLogs([]); }, [activeProjectId]);

  return (
    <div className={`border-t border-border-default flex flex-col shrink-0 transition-[height] duration-200 ease-in-out ${
      collapsed ? 'h-9' : 'h-52'
    }`}>
      <div className="flex border-b border-border-default text-[11px] shrink-0">
        {([
          { id: 'terminal' as const, icon: <Terminal size={11} />, label: 'Admin Terminal' },
          { id: 'usage' as const, icon: <BarChart2 size={11} />, label: 'Usage Graphs' },
          { id: 'health' as const, icon: <Heart size={11} />, label: 'Project Health' },
          { id: 'browser' as const, icon: <Globe size={11} />, label: 'Browser' },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 flex items-center gap-1.5 border-r border-border-default transition ${
              activeTab === tab.id
                ? 'bg-bg-base text-text-primary border-t-2 border-t-accent-primary'
                : 'text-text-muted hover:text-text-default hover:bg-bg-hover'
            }`}>
            {tab.icon}{tab.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 px-4">
          <span className="text-[10px] text-text-faint">Session:</span>
          <span className="text-[10px] text-text-secondary">128k tokens</span>
          <span className="text-[10px] text-accent-primary">~$0.42</span>
          <button
            onClick={() => togglePanel('bottomPanel')}
            className="p-0.5 rounded text-text-faint hover:text-text-default hover:bg-bg-hover transition"
            title={collapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px]">
        {activeTab === 'terminal' && (
          <div className="space-y-1">
            <div className="text-accent-secondary">[Orchestrator] Analyzing memory management module in aether_mem…</div>
            <div className="text-text-muted">[Claude Code] Reading src/mem/gc.rs (line 142)…</div>
            <div className="text-status-success">[System] Security pre-audit complete. No critical findings in 847 files.</div>
            <div className="text-status-warning">[Auditor] Hash collision risk detected. Decision surfaced to queue.</div>
            <div className="text-text-muted">[Claude Code] Writing implementation for sync_gc_cycle() — 67% complete.</div>
            <div className="flex items-center gap-2 mt-3 text-text-faint">
              <ChevronRight size={12} />
              <input
                className="bg-transparent outline-none text-text-default placeholder-text-faint flex-1"
                placeholder="Chat with Orchestrator…"
              />
            </div>
          </div>
        )}
        {activeTab === 'usage' && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Total tokens', value: '128,441' },
                { label: 'Est. cost', value: '$0.42' },
                { label: 'Tool calls', value: '89' },
                { label: 'Top agent', value: 'Claude Code' },
              ].map(s => (
                <div key={s.label} className="bg-bg-base border border-border-default rounded-lg p-3">
                  <div className="text-[10px] text-text-faint mb-1">{s.label}</div>
                  <div className="text-sm font-bold text-text-primary">{s.value}</div>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-text-faint italic">Timeline and bar chart views — component renders here</div>
          </div>
        )}
        {activeTab === 'health' && (
          <div className="space-y-3">
            {!activeProjectId ? (
              <div className="text-text-faint italic">Select a project to view dev server status.</div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className={`inline-block w-2 h-2 rounded-full ${devStatus?.running ? 'bg-status-success' : 'bg-text-faint'}`} />
                  <span className="text-text-secondary">
                    Dev server: <span className={devStatus?.running ? 'text-status-success' : 'text-text-faint'}>
                      {devStatus?.running ? `Running on port ${devStatus.port}` : 'Stopped'}
                    </span>
                    {devStatus?.pid && <span className="text-text-faint ml-2">(PID {devStatus.pid})</span>}
                  </span>
                  {devStatus?.running ? (
                    <button
                      onClick={() => stopServer.mutate(activeProjectId)}
                      disabled={stopServer.isPending}
                      className="ml-auto flex items-center gap-1 text-[10px] px-2 py-1 bg-status-error/15 text-status-error border border-status-error/30 rounded hover:bg-status-error/25 transition disabled:opacity-50"
                    >
                      <Square size={9} /> Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => startServer.mutate(activeProjectId)}
                      disabled={startServer.isPending}
                      className="ml-auto flex items-center gap-1 text-[10px] px-2 py-1 bg-status-success/15 text-status-success border border-status-success/30 rounded hover:bg-status-success/25 transition disabled:opacity-50"
                    >
                      <Play size={9} /> Start
                    </button>
                  )}
                </div>
                {(startServer.isError || stopServer.isError) && (
                  <div className="text-status-error text-[10px]">
                    {(startServer.error ?? stopServer.error)?.message}
                  </div>
                )}
                {logs.length > 0 && (
                  <div className="bg-bg-base border border-border-default rounded p-2 max-h-24 overflow-y-auto">
                    {logs.map((line, i) => (
                      <div key={i} className="text-text-muted whitespace-pre">{line}</div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {activeTab === 'browser' && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Globe size={11} className="text-accent-primary" />
              <span className="text-text-secondary">localhost:3000 · Playwright Chromium</span>
              <button className="ml-auto text-[10px] px-2 py-1 bg-status-success/15 text-status-success border border-status-success/30 rounded">
                Launch
              </button>
            </div>
            <div className="text-text-faint italic">Live screenshot feed from autonomous browser agent renders here.</div>
          </div>
        )}
      </div>
    </div>
  );
}
