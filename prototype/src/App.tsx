import { useState, type ReactNode } from 'react';
import {
  Layers, Github, Zap, Store, Play,
  CheckCircle2, AlertCircle, Box, Palette, Code2
} from 'lucide-react';

const InsomniacApp = () => {
  const [activeTab, setActiveTab] = useState('admin');

  return (
    <div className="flex h-screen w-full bg-[#0d1117] text-slate-300 font-sans selection:bg-indigo-500/30">
      
      {/* 1. LEFT TOOLBAR (Integrations) */}
      <aside className="w-16 flex flex-col items-center py-4 bg-[#010409] border-r border-slate-800 gap-6">
        <div className="text-indigo-500 mb-4"><Zap size={28} fill="currentColor" /></div>
        <ToolbarIcon icon={<Layers size={20} />} label="Projects" active />
        <ToolbarIcon icon={<Github size={20} />} label="GitHub" />
        <ToolbarIcon icon={<Zap size={20} />} label="Abilities" />
        <ToolbarIcon icon={<Store size={20} />} label="Marketplace" />
      </aside>

      {/* 2. LEFT SIDEBAR (Parallel Projects) */}
      <aside className="w-64 bg-[#0d1117] border-r border-slate-800 flex flex-col">
        <div className="p-4 text-xs font-bold uppercase tracking-widest text-slate-500">Active Orchestrations</div>
        <ProjectItem name="Aether-OS" status="building" active />
        <ProjectItem name="Nova-Protocol" status="idle" />
        <ProjectItem name="Lumina-API" status="error" />
        <ProjectItem name="Void-Shell" status="completed" />
      </aside>

      {/* 3. MAIN VIEW */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0d1117]">
        {/* Project Header & Docs */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <header>
            <h1 className="text-2xl font-bold text-white mb-2">Project: Aether-OS</h1>
            <p className="text-slate-400 max-w-2xl leading-relaxed">
              A decentralized operating system kernel designed for edge-computing nodes. 
              The orchestrator is currently optimizing the memory management layer to 
              reduce latency in high-concurrency environments.
            </p>
          </header>

          <div className="grid grid-cols-3 gap-4">
            {/* Build Doc */}
            <DocCard title="Build Doc" icon={<Code2 size={16}/>}>
              <ul className="text-xs space-y-1">
                <li className="flex justify-between"><span>Language</span> <span className="text-indigo-400">Rust 1.75</span></li>
                <li className="flex justify-between"><span>Frameworks</span> <span className="text-indigo-400">Tokio, Axum</span></li>
                <li className="flex justify-between"><span>Packages</span> <span className="text-indigo-400">Serde, Diesel</span></li>
              </ul>
            </DocCard>

            {/* Design Doc */}
            <DocCard title="Design Doc" icon={<Palette size={16}/>}>
              <ul className="text-xs space-y-1">
                <li className="flex justify-between"><span>Pallet</span> <span className="text-indigo-400">Cyberpunk/Slate</span></li>
                <li className="flex justify-between"><span>Icon Lib</span> <span className="text-indigo-400">Lucide-Solid</span></li>
                <li className="flex justify-between"><span>Tone</span> <span className="text-indigo-400">Brutalist/Async</span></li>
              </ul>
            </DocCard>

            {/* Progress Doc */}
            <DocCard title="Progress Doc" icon={<Box size={16}/>}>
              <div className="space-y-2">
                <ActionButton label="Playwright Test" />
                <ActionButton label="Security Audit" color="border-amber-500/50" />
                <ActionButton label="Feature: Auth" color="border-indigo-500/50" />
              </div>
            </DocCard>
          </div>
        </div>

        {/* 4. TERMINAL SPACE (Bottom Half) */}
        <div className="h-1/2 bg-[#010409] border-t border-slate-800 flex flex-col">
          <div className="flex border-b border-slate-800 text-xs">
            <Tab label="Admin Terminal" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />
            <Tab label="Usage Graphs" active={activeTab === 'usage'} onClick={() => setActiveTab('usage')} />
            <Tab label="Project Health" active={activeTab === 'health'} onClick={() => setActiveTab('health')} />
          </div>
          <div className="flex-1 p-4 font-mono text-sm overflow-y-auto">
            {activeTab === 'admin' && (
              <div className="space-y-1">
                <div className="text-indigo-400">[Orchestrator]: Analyzing memory leaks in module 'aether_mem'...</div>
                <div className="text-slate-500 underline cursor-pointer hover:text-white">@user: Proceed with garbage collection optimization?</div>
                <div className="text-green-500">SYSTEM: Security Audit 94% complete. No high-vulnerability findings.</div>
                <div className="flex items-center gap-2 mt-4 text-slate-500 italic">
                  <span>&gt;</span>
                  <input className="bg-transparent border-none outline-none text-white flex-1" placeholder="Chat with Orchestrator..." />
                </div>
              </div>
            )}
            {activeTab === 'usage' && <div className="text-indigo-500">Visualizing Token consumption & GPU load... [Chart Component]</div>}
            {activeTab === 'health' && <div className="text-green-500">All Agents Online. Latency: 42ms. Stability: 99.9%</div>}
          </div>
        </div>
      </main>

      {/* 5. RIGHT SIDEBAR (Timeline & Human Input) */}
      <aside className="w-80 bg-[#0d1117] border-l border-slate-800 flex flex-col">
        {/* Timeline Top Half */}
        <div className="flex-1 p-4 border-b border-slate-800">
          <h3 className="text-xs font-bold uppercase text-slate-500 mb-4">Project Timeline</h3>
          <ul className="space-y-3 text-sm">
            <TimelineItem label="Initialize Repo" completed />
            <TimelineItem label="Architecture Draft" completed />
            <TimelineItem label="Core Logic Sync" current />
            <TimelineItem label="Load Balancing" todo />
            <TimelineItem label="Final Security Audit" todo />
          </ul>
        </div>

        {/* Your Input Bottom Half */}
        <div className="p-4 bg-indigo-500/5 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase">
            <AlertCircle size={14} />
            <span>Your Input Required</span>
          </div>
          <div className="text-sm text-slate-300">
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
  <div className={`p-2 rounded-lg cursor-pointer transition ${active ? 'bg-indigo-500/10 text-indigo-500' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`} title={label}>
    {icon}
  </div>
);

const ProjectItem = ({ name, status, active }: { name: string; status: string; active?: boolean }) => (
  <div className={`px-4 py-3 flex items-center justify-between border-l-2 cursor-pointer transition ${active ? 'bg-indigo-500/5 border-indigo-500 text-white' : 'border-transparent hover:bg-slate-800'}`}>
    <span className="text-sm font-medium">{name}</span>
    <div className={`w-2 h-2 rounded-full ${status === 'building' ? 'bg-indigo-500 animate-pulse' : status === 'error' ? 'bg-red-500' : status === 'completed' ? 'bg-green-500' : 'bg-slate-600'}`} />
  </div>
);

const DocCard = ({ title, children, icon }: { title: string; children: ReactNode; icon: ReactNode }) => (
  <div className="bg-[#161b22] border border-slate-800 p-4 rounded-xl space-y-3">
    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
      {icon} <span>{title}</span>
    </div>
    {children}
  </div>
);

const ActionButton = ({ label, color = "border-slate-700" }: { label: string; color?: string }) => (
  <button className={`w-full py-2 px-3 flex items-center justify-between border rounded-lg text-xs hover:bg-slate-800 transition ${color}`}>
    <span>{label}</span>
    <Play size={12} className="text-indigo-400" />
  </button>
);

const TimelineItem = ({ label, completed, todo }: { label: string; completed?: boolean; current?: boolean; todo?: boolean }) => (
  <li className="flex items-center gap-3">
    {completed ? <CheckCircle2 size={16} className="text-green-500" /> : <div className="w-4 h-4 rounded-full border border-slate-600" />}
    <span className={`${completed ? 'line-through text-slate-500' : todo ? 'text-slate-600' : 'text-white font-bold'}`}>
      {label}
    </span>
  </li>
);

const ChoiceButton = ({ label }: { label: string }) => (
  <button className="w-full text-left p-3 text-xs bg-[#161b22] border border-slate-800 rounded-lg hover:border-indigo-500 hover:bg-indigo-500/10 transition">
    {label}
  </button>
);

const Tab = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <div onClick={onClick} className={`px-4 py-2 cursor-pointer border-r border-slate-800 ${active ? 'bg-[#0d1117] text-white border-t-2 border-t-indigo-500' : 'text-slate-500 hover:text-white'}`}>
    {label}
  </div>
);

export default InsomniacApp;