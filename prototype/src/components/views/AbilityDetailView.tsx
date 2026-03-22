import { BookOpen } from 'lucide-react';

export function AbilityDetailView() {
  return (
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
  );
}
