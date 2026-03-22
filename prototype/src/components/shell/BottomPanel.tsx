import {
  Terminal, BarChart2, Heart, ChevronRight, ChevronUp, ChevronDown, Globe
} from 'lucide-react';
import { useLayoutStore } from '../../stores/layout';

export function BottomPanel() {
  const activeTab = useLayoutStore((s) => s.activeTab);
  const setActiveTab = useLayoutStore((s) => s.setActiveTab);
  const collapsed = useLayoutStore((s) => s.collapsedPanels.bottomPanel);
  const togglePanel = useLayoutStore((s) => s.togglePanel);

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
          <div className="space-y-1">
            <div className="text-status-success">All agents online · p50 latency: 42ms · p99: 218ms</div>
            <div className="text-text-secondary">Pipeline completion rate (last 24h): 91.3%</div>
            <div className="text-text-secondary">Active worktrees: 3 · Disk: 1.2GB used</div>
            <div className="text-status-warning">1 decision pending · 0 errors</div>
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
