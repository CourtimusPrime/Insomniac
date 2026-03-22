import {
  CheckCircle2, AlertCircle,
  Terminal, BarChart2, Heart, ChevronRight,
  Globe, Circle
} from 'lucide-react';
import { LeftToolbar } from './components/shell/LeftToolbar';
import { LeftSidebar } from './components/shell/LeftSidebar';
import { MainView } from './components/shell/MainView';
import { useLayoutStore } from './stores/layout';

// --- DATA ---

const TIMELINE = [
  { label: 'Initialize repo', done: true },
  { label: 'Architecture draft', done: true },
  { label: 'Core logic sync', current: true },
  { label: 'Load balancing', done: false },
  { label: 'Security audit', done: false },
];

const AGENTS = [
  { name: 'Claude Code', task: 'Implementing gc.rs', pct: 67, model: 'Sonnet 4' },
  { name: 'Auditor', task: 'Awaiting decision', pct: 0, model: 'Sonnet 4', blocked: true },
];

// --- APP ---

export default function InsomniacApp() {
  const activeTab = useLayoutStore((s) => s.activeTab);
  const setActiveTab = useLayoutStore((s) => s.setActiveTab);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-default text-text-default font-sans">

      {/* LEFT TOOLBAR */}
      <LeftToolbar />

      {/* LEFT SIDEBAR */}
      <LeftSidebar />

      {/* MAIN VIEW */}
      <main className="flex-1 flex flex-col overflow-hidden">

        <div className="flex-1 flex overflow-hidden">
          {/* Main content area */}
          <MainView />

          {/* RIGHT SIDEBAR */}
          <aside className="w-72 border-l border-border-default flex flex-col shrink-0 overflow-hidden">

            {/* Decision queue */}
            <div className="p-4 border-b border-border-default">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={12} className="text-status-warning" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-status-warning/80">Decision needed</span>
              </div>
              <p className="text-[11px] text-text-default leading-relaxed mb-3">
                Hash collision detected in <span className="font-mono text-status-warning">aether_mem</span>. Switch algorithm to proceed with security audit.
              </p>
              <div className="space-y-1.5">
                {['Switch to SHA-256', 'Use Argon2 + salt', 'Defer (low risk)'].map(opt => (
                  <button key={opt} className="w-full text-left text-[11px] px-3 py-2 rounded border border-border-muted hover:border-accent-primary/50 hover:bg-accent-primary/5 text-text-default transition">
                    {opt}
                  </button>
                ))}
                <button className="w-full text-left text-[11px] px-3 py-2 rounded border border-border-muted/50 hover:border-border-default text-text-faint hover:text-text-muted transition">
                  Let agent decide
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="p-4 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">Pipeline stages</div>
              <ul className="space-y-2.5">
                {TIMELINE.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    {item.done
                      ? <CheckCircle2 size={13} className="text-status-success shrink-0" />
                      : item.current
                        ? <Circle size={13} className="text-accent-primary fill-accent-primary shrink-0 animate-pulse" />
                        : <Circle size={13} className="text-text-faint shrink-0" />
                    }
                    <span className={`text-[11px] ${item.done ? 'line-through text-text-faint' : item.current ? 'text-text-primary font-medium' : 'text-text-faint'}`}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Agent status strip */}
            <div className="p-4 border-t border-border-default space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Active agents</div>
              {AGENTS.map(agent => (
                <div key={agent.name} className="px-3 py-2 rounded-lg bg-bg-base border border-border-default">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-medium text-text-primary">{agent.name}</span>
                    <span className={`text-[10px] ${agent.blocked ? 'text-status-warning' : 'text-status-success'}`}>
                      {agent.blocked ? 'blocked' : 'running'}
                    </span>
                  </div>
                  <div className="text-[10px] text-text-faint mt-0.5">{agent.task} · {agent.model}</div>
                  {agent.pct > 0 && (
                    <div className="mt-2 h-0.5 bg-bg-hover rounded-full overflow-hidden">
                      <div className="h-full bg-accent-primary rounded-full" style={{ width: `${agent.pct}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>

        {/* BOTTOM PANEL */}
        <div className="h-52 border-t border-border-default flex flex-col shrink-0">
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
      </main>
    </div>
  );
}
