import { useState, type ReactNode } from 'react';
import {
  Layers, Github, Zap, Store, Play,
  CheckCircle2, AlertCircle, Box, Palette, Code2
} from 'lucide-react';
import { ThemeSwitcher } from './components/ThemeSwitcher';

const InsomniacApp = () => {
  const [activeTab, setActiveTab] = useState('admin');

  return (
    <div className="flex h-screen w-full bg-bg-default text-text-default font-sans selection:bg-accent-primary/30">

      {/* 1. LEFT TOOLBAR (Integrations) */}
      <aside className="w-16 flex flex-col items-center py-4 bg-bg-base border-r border-border-default gap-6">
        <div className="text-accent-primary mb-4"><Zap size={28} fill="currentColor" /></div>
        <ToolbarIcon icon={<Layers size={20} />} label="Projects" active />
        <ToolbarIcon icon={<Github size={20} />} label="GitHub" />
        <ToolbarIcon icon={<Zap size={20} />} label="Abilities" />
        <ToolbarIcon icon={<Store size={20} />} label="Marketplace" />
        <div className="mt-auto">
          <ThemeSwitcher />
        </div>
      </aside>

      {/* 2. LEFT SIDEBAR (Parallel Projects) */}
      <aside className="w-64 bg-bg-default border-r border-border-default flex flex-col">
        <div className="p-4 text-xs font-bold uppercase tracking-widest text-text-muted">Projects</div>
        <ProjectItem name="Aether-OS" status="building" active />
        <ProjectItem name="Nova-Protocol" status="idle" />
        <ProjectItem name="Lumina-API" status="error" />
        <ProjectItem name="Void-Shell" status="completed" />
      </aside>

      {/* 3. MAIN VIEW */}
      <main className="flex-1 flex flex-col overflow-hidden bg-bg-default">
        {/* Project Header & Docs */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <header>
            <h1 className="text-2xl font-bold text-text-primary mb-2">Project: Aether-OS</h1>
            <p className="text-text-secondary max-w-2xl leading-relaxed">
              A decentralized operating system kernel designed for edge-computing nodes.
              The orchestrator is currently optimizing the memory management layer to
              reduce latency in high-concurrency environments.
            </p>
          </header>

          <div className="grid grid-cols-3 gap-4">
            {/* Build Doc */}
            <DocCard title="Build Doc" icon={<Code2 size={16}/>}>
              <ul className="text-xs space-y-1">
                <li className="flex justify-between"><span>Language</span> <span className="text-accent-secondary">Rust 1.75</span></li>
                <li className="flex justify-between"><span>Frameworks</span> <span className="text-accent-secondary">Tokio, Axum</span></li>
                <li className="flex justify-between"><span>Packages</span> <span className="text-accent-secondary">Serde, Diesel</span></li>
              </ul>
            </DocCard>

            {/* Design Doc */}
            <DocCard title="Design Doc" icon={<Palette size={16}/>}>
              <ul className="text-xs space-y-1">
                <li className="flex justify-between"><span>Pallet</span> <span className="text-accent-secondary">Cyberpunk/Slate</span></li>
                <li className="flex justify-between"><span>Icon Lib</span> <span className="text-accent-secondary">Lucide-Solid</span></li>
                <li className="flex justify-between"><span>Tone</span> <span className="text-accent-secondary">Brutalist/Async</span></li>
              </ul>
            </DocCard>

            {/* Progress Doc */}
            <DocCard title="Progress Doc" icon={<Box size={16}/>}>
              <div className="space-y-2">
                <ActionButton label="Playwright Test" />
                <ActionButton label="Security Audit" color="border-status-warning/50" />
                <ActionButton label="Feature: Auth" color="border-accent-primary/50" />
              </div>
            </DocCard>
          </div>
        </div>

        {/* 4. TERMINAL SPACE (Bottom Half) */}
        <div className="h-1/2 bg-bg-base border-t border-border-default flex flex-col">
          <div className="flex border-b border-border-default text-xs">
            <Tab label="Admin Terminal" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
            <Tab label="Usage Graphs" active={activeTab === 'usage'} onClick={() => setActiveTab('usage')} />
            <Tab label="Project Health" active={activeTab === 'health'} onClick={() => setActiveTab('health')} />
          </div>
          <div className="flex-1 p-4 font-mono text-sm overflow-y-auto">
            {activeTab === 'admin' && (
              <div className="space-y-1">
                <div className="text-accent-secondary">[Orchestrator]: Analyzing memory leaks in module 'aether_mem'...</div>
                <div className="text-text-muted underline cursor-pointer hover:text-text-primary">@user: Proceed with garbage collection optimization?</div>
                <div className="text-status-success">SYSTEM: Security Audit 94% complete. No high-vulnerability findings.</div>
                <div className="flex items-center gap-2 mt-4 text-text-muted italic">
                  <span>&gt;</span>
                  <input className="bg-transparent border-none outline-none text-text-primary flex-1" placeholder="Chat with Orchestrator..." />
                </div>
              </div>
            )}
            {activeTab === 'usage' && <div className="text-accent-primary">Visualizing Token consumption & GPU load... [Chart Component]</div>}
            {activeTab === 'health' && <div className="text-status-success">All Agents Online. Latency: 42ms. Stability: 99.9%</div>}
          </div>
        </div>
      </main>

      {/* 5. RIGHT SIDEBAR (Timeline & Human Input) */}
      <aside className="w-80 bg-bg-default border-l border-border-default flex flex-col">
        {/* Timeline Top Half */}
        <div className="flex-1 p-4 border-b border-border-default">
          <h3 className="text-xs font-bold uppercase text-text-muted mb-4">Project Timeline</h3>
          <ul className="space-y-3 text-sm">
            <TimelineItem label="Initialize Repo" completed />
            <TimelineItem label="Architecture Draft" completed />
            <TimelineItem label="Core Logic Sync" current />
            <TimelineItem label="Load Balancing" todo />
            <TimelineItem label="Final Security Audit" todo />
          </ul>
        </div>

        {/* Your Input Bottom Half */}
        <div className="p-4 bg-accent-primary/5 space-y-4">
          <div className="flex items-center gap-2 text-status-warning font-bold text-xs uppercase">
            <AlertCircle size={14} />
            <span>Your Input Required</span>
          </div>
          <div className="text-sm text-text-default">
            "The security audit flagged a potential collision in the hash algorithm. Should I switch to SHA-256 or implement a custom salt?"
          </div>
          <div className="space-y-2">
            <ChoiceButton label="Switch to SHA-256" />
            <ChoiceButton label="Use Custom Salt" />
            <ChoiceButton label="Ignore (Low Risk)" />
          </div>
        </div>
      </aside>
    </div>
  );
};

// UI SUB-COMPONENTS
const ToolbarIcon = ({ icon, label, active }: { icon: ReactNode; label: string; active?: boolean }) => (
  <div className={`p-2 rounded-lg cursor-pointer transition ${active ? 'bg-accent-primary/10 text-accent-primary' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'}`} title={label}>
    {icon}
  </div>
);

const ProjectItem = ({ name, status, active }: { name: string; status: string; active?: boolean }) => (
  <div className={`px-4 py-3 flex items-center justify-between border-l-2 cursor-pointer transition ${active ? 'bg-accent-primary/5 border-accent-primary text-text-primary' : 'border-transparent hover:bg-bg-hover'}`}>
    <span className="text-sm font-medium">{name}</span>
    <div className={`w-2 h-2 rounded-full ${status === 'building' ? 'bg-accent-primary animate-pulse' : status === 'error' ? 'bg-status-error' : status === 'completed' ? 'bg-status-success' : 'bg-text-faint'}`} />
  </div>
);

const DocCard = ({ title, children, icon }: { title: string; children: ReactNode; icon: ReactNode }) => (
  <div className="bg-bg-surface border border-border-default p-4 rounded-xl space-y-3">
    <div className="flex items-center gap-2 text-text-secondary text-xs font-bold uppercase tracking-wider">
      {icon} <span>{title}</span>
    </div>
    {children}
  </div>
);

const ActionButton = ({ label, color = "border-border-muted" }: { label: string; color?: string }) => (
  <button className={`w-full py-2 px-3 flex items-center justify-between border rounded-lg text-xs hover:bg-bg-hover transition ${color}`}>
    <span>{label}</span>
    <Play size={12} className="text-accent-secondary" />
  </button>
);

const TimelineItem = ({ label, completed, todo }: { label: string; completed?: boolean; current?: boolean; todo?: boolean }) => (
  <li className="flex items-center gap-3">
    {completed ? <CheckCircle2 size={16} className="text-status-success" /> : <div className="w-4 h-4 rounded-full border border-border-subtle" />}
    <span className={`${completed ? 'line-through text-text-muted' : todo ? 'text-text-faint' : 'text-text-primary font-bold'}`}>
      {label}
    </span>
  </li>
);

const ChoiceButton = ({ label }: { label: string }) => (
  <button className="w-full text-left p-3 text-xs bg-bg-surface border border-border-default rounded-lg hover:border-accent-primary hover:bg-accent-primary/10 transition">
    {label}
  </button>
);

const Tab = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <div onClick={onClick} className={`px-4 py-2 cursor-pointer border-r border-border-default ${active ? 'bg-bg-default text-text-primary border-t-2 border-t-accent-primary' : 'text-text-muted hover:text-text-primary'}`}>
    {label}
  </div>
);

export default InsomniacApp;
