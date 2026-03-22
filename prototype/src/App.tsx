import {
  Play, CheckCircle2, AlertCircle,
  Terminal, BarChart2, Heart, ChevronRight,
  Cpu, Globe, Sparkles,
  ArrowRight, Circle, BookOpen
} from 'lucide-react';
import { LeftToolbar } from './components/shell/LeftToolbar';
import { LeftSidebar } from './components/shell/LeftSidebar';
import { useLayoutStore } from './stores/layout';
import { useProjectsStore } from './stores/projects';

// --- DATA ---

const PIPELINE_STAGES = [
  { name: 'Scaffold architecture', agent: 'Prototyper', model: 'Gemini Flash', status: 'done', note: 'Component tree and data models generated.' },
  { name: 'Implement core logic', agent: 'Claude Code', model: 'Claude Sonnet 4', status: 'running', note: 'Building memory management module. 67% complete.' },
  { name: 'Write test suite', agent: 'Claude Code', model: 'Claude Sonnet 4', status: 'queued', note: 'Waiting for implementation to complete.' },
  { name: 'Security audit', agent: 'Auditor', model: 'Claude Sonnet 4', status: 'needs-you', note: 'Hash algorithm collision flagged. Decision required.' },
  { name: 'Deploy preview', agent: 'Vercel MCP', model: '—', status: 'queued', note: 'Will deploy to preview URL on test pass.' },
];

const BACKSEAT = [
  { type: 'security', severity: 'critical', file: 'src/auth/hash.rs', msg: 'SHA-1 collision risk in password hashing. Recommend SHA-256 or Argon2.' },
  { type: 'performance', severity: 'warning', file: 'src/mem/gc.rs', msg: 'Garbage collector called synchronously in hot path. Consider async scheduling.' },
  { type: 'coverage', severity: 'info', file: 'src/net/socket.rs', msg: '4 exported functions have no test coverage.' },
];

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

// --- HELPERS ---

const stageColor = (s: string) => ({
  done: 'border-status-success/30 bg-status-success/5',
  running: 'border-accent-primary/50 bg-accent-primary/8',
  queued: 'border-border-muted bg-transparent opacity-50',
  'needs-you': 'border-status-warning/60 bg-status-warning/8',
}[s]);

const stageIcon = (s: string) => {
  if (s === 'done') return <CheckCircle2 size={14} className="text-status-success shrink-0" />;
  if (s === 'running') return <Circle size={14} className="text-accent-primary shrink-0 animate-pulse fill-accent-primary" />;
  if (s === 'needs-you') return <AlertCircle size={14} className="text-status-warning shrink-0" />;
  return <Circle size={14} className="text-text-faint shrink-0" />;
};

const severityColor = (s: string) => ({
  critical: 'text-status-error bg-status-error/10 border-status-error/30',
  warning: 'text-status-warning bg-status-warning/10 border-status-warning/30',
  info: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
}[s]);

// --- APP ---

export default function InsomniacApp() {
  const activeMain = useLayoutStore((s) => s.activeMain);
  const setActiveMain = useLayoutStore((s) => s.setActiveMain);
  const activeTab = useLayoutStore((s) => s.activeTab);
  const setActiveTab = useLayoutStore((s) => s.setActiveTab);
  const activeProject = useProjectsStore((s) => s.activeProject);
  const projects = useProjectsStore((s) => s.projects);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-default text-text-default font-sans">

      {/* LEFT TOOLBAR */}
      <LeftToolbar />

      {/* LEFT SIDEBAR */}
      <LeftSidebar />

      {/* MAIN VIEW */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Project header */}
        <div className="px-6 py-3 border-b border-border-default flex items-center gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-text-primary font-heading">{activeProject}</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-accent-primary/30 bg-accent-primary/5 text-accent-primary">
                {projects.find(p => p.name === activeProject)?.status}
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">Decentralized OS kernel · Rust · 3 agents running</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {(['pipeline', 'graph', 'backseat'] as const).map(view => (
              <button
                key={view}
                onClick={() => setActiveMain(view)}
                className={`px-3 py-1.5 text-[11px] rounded transition capitalize ${
                  activeMain === view
                    ? 'bg-accent-primary/15 text-accent-primary'
                    : 'text-text-muted hover:text-text-default hover:bg-bg-hover'
                }`}>
                {view === 'backseat' ? 'Backseat Driver' : view}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main content area */}
          <div className="flex-1 overflow-y-auto">

            {/* PIPELINE VIEW */}
            {activeMain === 'pipeline' && (
              <div className="p-5 space-y-2 max-w-2xl">
                {PIPELINE_STAGES.map((stage, i) => (
                  <div key={i} className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${stageColor(stage.status)}`}>
                    <div className="mt-0.5">{stageIcon(stage.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text-primary">{stage.name}</span>
                        {stage.status === 'needs-you' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-warning/20 text-status-warning border border-status-warning/30">needs you</span>
                        )}
                        {stage.status === 'running' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-primary/20 text-accent-primary border border-accent-primary/30">running</span>
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5">{stage.agent} · {stage.model}</div>
                      <div className="text-[11px] text-text-secondary mt-1">{stage.note}</div>
                    </div>
                    {stage.status === 'needs-you' && (
                      <button className="shrink-0 px-2.5 py-1 text-[10px] bg-status-warning/20 hover:bg-status-warning/30 text-status-warning rounded border border-status-warning/30 transition">
                        Decide
                      </button>
                    )}
                  </div>
                ))}
                {/* Steering input */}
                <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-lg border border-border-muted bg-bg-base">
                  <ArrowRight size={13} className="text-accent-primary shrink-0" />
                  <input
                    className="flex-1 bg-transparent text-xs text-text-default placeholder-text-faint outline-none"
                    placeholder="Steer the pipeline — 'skip Stripe for now', 'add dark mode first'…"
                  />
                </div>
              </div>
            )}

            {/* GRAPH VIEW */}
            {activeMain === 'graph' && (
              <div className="p-5 h-full flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center mx-auto">
                    <Cpu size={20} className="text-accent-primary" />
                  </div>
                  <div className="text-sm text-text-primary font-medium font-heading">Agent Chain Editor</div>
                  <div className="text-xs text-text-muted max-w-xs">
                    Visual ReactFlow canvas for building and connecting agent pipelines. Drag agents, assign Abilities, define conditions.
                  </div>
                  <button className="px-4 py-2 text-xs bg-accent-primary/15 hover:bg-accent-primary/25 text-accent-primary border border-accent-primary/30 rounded-lg transition">
                    Open chain editor
                  </button>
                </div>
              </div>
            )}

            {/* BACKSEAT DRIVER VIEW */}
            {activeMain === 'backseat' && (
              <div className="p-5 space-y-3 max-w-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={14} className="text-accent-secondary" />
                  <span className="text-xs text-text-secondary">Monitoring <span className="text-text-primary">{activeProject}</span> · Last scan 2m ago · {BACKSEAT.length} recommendations</span>
                </div>
                {BACKSEAT.map((r, i) => (
                  <div key={i} className={`rounded-lg border px-4 py-3 ${severityColor(r.severity)}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold border ${severityColor(r.severity)}`}>{r.severity}</span>
                          <span className="text-[10px] text-text-muted">{r.type}</span>
                          <span className="text-[10px] font-mono text-text-muted">{r.file}</span>
                        </div>
                        <p className="text-xs text-text-default">{r.msg}</p>
                      </div>
                      <button className="shrink-0 px-3 py-1.5 text-[11px] bg-bg-hover hover:bg-bg-surface text-text-default rounded border border-border-muted transition flex items-center gap-1.5">
                        <Play size={10} />
                        Run this
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ABILITY DETAIL VIEW */}
            {activeMain === 'ability-detail' && (
              <div className="p-5 max-w-xl space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-border-default">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <BookOpen size={16} className="text-violet-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary font-heading">Playwright Tests</div>
                    <div className="text-[10px] text-text-muted mt-0.5">Skill · Installed · v2.1.0</div>
                  </div>
                  <div className="ml-auto">
                    <span className="text-[10px] px-2 py-1 rounded bg-status-success/15 text-status-success border border-status-success/30">Active</span>
                  </div>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">Enables agents to write and execute Playwright end-to-end tests against a running dev server. Exposes browser navigation, assertion, and screenshot tools.</p>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-text-faint mb-2">Assigned to</div>
                  <div className="flex gap-2">
                    {['Claude Code (tester)', 'Auditor'].map(a => (
                      <span key={a} className="text-[11px] px-2 py-1 rounded bg-bg-hover text-text-default border border-border-muted">{a}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-text-faint mb-2">Recent invocations</div>
                  <div className="space-y-1">
                    {['navigate("/dashboard")', 'click("#login-btn")', 'assertText("Welcome back")'].map(inv => (
                      <div key={inv} className="text-[11px] font-mono text-text-muted px-2 py-1 bg-bg-base rounded">{inv}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

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
