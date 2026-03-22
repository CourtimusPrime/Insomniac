import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal, BarChart2, Heart, ChevronRight, ChevronUp, ChevronDown, Globe, Play, Square, RefreshCw, X, Camera, Copy, Download, Info, AlertTriangle, AlertCircle, Trash2
} from 'lucide-react';
import { useLayoutStore } from '../../stores/layout';
import { useProjectsStore } from '../../stores/projects';
import { useDevServerStatus, useStartDevServer, useStopDevServer } from '../../api/localhost';
import { useBrowserStatus, useLaunchBrowser, useNavigate, useScreenshot, useCloseBrowser } from '../../api/browser';

export function BottomPanel() {
  const activeTab = useLayoutStore((s) => s.activeTab);
  const setActiveTab = useLayoutStore((s) => s.setActiveTab);
  const collapsed = useLayoutStore((s) => s.collapsedPanels.bottomPanel);
  const togglePanel = useLayoutStore((s) => s.togglePanel);

  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const { data: devStatus } = useDevServerStatus(activeProjectId);
  const startServer = useStartDevServer();
  const stopServer = useStopDevServer();

  const { data: browserStatus } = useBrowserStatus();
  const launchBrowser = useLaunchBrowser();
  const navigateBrowser = useNavigate();
  const screenshot = useScreenshot();
  const closeBrowser = useCloseBrowser();

  const [browserUrl, setBrowserUrl] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const handleNavigate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (browserUrl.trim()) {
      navigateBrowser.mutate({ url: browserUrl.trim() });
    }
  }, [browserUrl, navigateBrowser]);

  const handleRefresh = useCallback(() => {
    setIframeKey((k) => k + 1);
  }, []);

  const handleScreenshot = useCallback(() => {
    screenshot.mutate(undefined, {
      onSuccess: (data) => {
        if (data.image) setScreenshotPreview(data.image);
      },
    });
  }, [screenshot]);

  const handleCopyScreenshot = useCallback(async () => {
    if (!screenshotPreview) return;
    const blob = await fetch(`data:image/png;base64,${screenshotPreview}`).then((r) => r.blob());
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  }, [screenshotPreview]);

  const handleSaveScreenshot = useCallback(() => {
    if (!screenshotPreview) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${screenshotPreview}`;
    link.download = `screenshot-${Date.now()}.png`;
    link.click();
  }, [screenshotPreview]);

  // Browser console entries from WebSocket
  const [consoleEntries, setConsoleEntries] = useState<{ level: 'info' | 'warn' | 'error'; timestamp: string; message: string }[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Listen for browser:console WebSocket events
  useEffect(() => {
    function onConsoleMessage(evt: MessageEvent) {
      try {
        const msg = JSON.parse(evt.data) as { event: string; data?: { level?: string; timestamp?: string; message?: string } };
        if (msg.event === 'browser:console' && msg.data) {
          const level = msg.data.level === 'warn' ? 'warn' : msg.data.level === 'error' ? 'error' : 'info';
          setConsoleEntries((prev) => [...prev.slice(-199), {
            level: level as 'info' | 'warn' | 'error',
            timestamp: msg.data!.timestamp ?? new Date().toISOString(),
            message: msg.data!.message ?? '',
          }]);
        }
      } catch { /* ignore */ }
    }

    const ws = new WebSocket('ws://localhost:4321/ws');
    ws.addEventListener('message', onConsoleMessage);
    return () => { ws.close(); };
  }, []);

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleEntries]);

  const handleClearConsole = useCallback(() => {
    setConsoleEntries([]);
  }, []);

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
          <div className="flex flex-col h-full gap-2">
            {!activeProjectId ? (
              <div className="text-text-faint italic">Select a project to use the dev browser.</div>
            ) : !devStatus?.running ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Globe size={24} className="text-text-faint" />
                <div className="text-text-faint text-sm">Dev server not running</div>
                <button
                  onClick={() => startServer.mutate(activeProjectId)}
                  disabled={startServer.isPending}
                  className="flex items-center gap-1 text-[10px] px-3 py-1.5 bg-status-success/15 text-status-success border border-status-success/30 rounded hover:bg-status-success/25 transition disabled:opacity-50"
                >
                  <Play size={9} /> Start Dev Server
                </button>
              </div>
            ) : (
              <>
                {/* Toolbar: URL bar + actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${browserStatus?.running ? 'bg-status-success' : 'bg-text-faint'}`} />
                  <form onSubmit={handleNavigate} className="flex-1 flex items-center gap-1">
                    <input
                      value={browserUrl}
                      onChange={(e) => setBrowserUrl(e.target.value)}
                      placeholder={`http://localhost:${devStatus.port ?? 3000}`}
                      className="flex-1 bg-bg-base border border-border-default rounded px-2 py-1 text-[11px] text-text-default placeholder-text-faint outline-none focus:border-accent-primary"
                    />
                  </form>
                  <button
                    onClick={handleRefresh}
                    className="p-1 rounded text-text-faint hover:text-text-default hover:bg-bg-hover transition"
                    title="Refresh"
                  >
                    <RefreshCw size={12} />
                  </button>
                  <button
                    onClick={handleScreenshot}
                    disabled={screenshot.isPending || !browserStatus?.running}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 bg-accent-primary/10 text-accent-primary border border-accent-primary/30 rounded hover:bg-accent-primary/20 transition disabled:opacity-50"
                    title="Capture screenshot"
                  >
                    <Camera size={10} /> {screenshot.isPending ? 'Capturing…' : 'Screenshot'}
                  </button>
                  {!browserStatus?.running ? (
                    <button
                      onClick={() => launchBrowser.mutate()}
                      disabled={launchBrowser.isPending}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 bg-status-success/15 text-status-success border border-status-success/30 rounded hover:bg-status-success/25 transition disabled:opacity-50"
                    >
                      <Play size={9} /> Launch
                    </button>
                  ) : (
                    <button
                      onClick={() => closeBrowser.mutate()}
                      disabled={closeBrowser.isPending}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 bg-status-error/15 text-status-error border border-status-error/30 rounded hover:bg-status-error/25 transition disabled:opacity-50"
                    >
                      <X size={9} /> Close
                    </button>
                  )}
                </div>
                {/* iframe preview + console split */}
                <div className="flex-1 min-h-0 flex flex-col">
                  {/* iframe preview */}
                  <div className="flex-[2] min-h-0 border border-border-default rounded overflow-hidden bg-white relative">
                    <iframe
                      key={iframeKey}
                      src={`http://localhost:4321/api/browser/proxy/?projectId=${activeProjectId}`}
                      className="w-full h-full border-0"
                      title="Dev Browser Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                    {/* Screenshot preview overlay */}
                    {screenshotPreview && (
                      <div className="absolute inset-0 bg-bg-base/95 flex flex-col items-center justify-center gap-3 z-10">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCopyScreenshot}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 bg-accent-primary/10 text-accent-primary border border-accent-primary/30 rounded hover:bg-accent-primary/20 transition"
                            title="Copy to clipboard"
                          >
                            <Copy size={10} /> Copy
                          </button>
                          <button
                            onClick={handleSaveScreenshot}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 bg-status-success/15 text-status-success border border-status-success/30 rounded hover:bg-status-success/25 transition"
                            title="Save as PNG"
                          >
                            <Download size={10} /> Save
                          </button>
                          <button
                            onClick={() => setScreenshotPreview(null)}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 bg-bg-hover text-text-muted border border-border-default rounded hover:bg-bg-base transition"
                            title="Close preview"
                          >
                            <X size={10} /> Close
                          </button>
                        </div>
                        <img
                          src={`data:image/png;base64,${screenshotPreview}`}
                          alt="Screenshot"
                          className="max-w-full max-h-[calc(100%-40px)] object-contain rounded border border-border-default"
                        />
                      </div>
                    )}
                  </div>
                  {/* Console sub-panel */}
                  <div className="flex-1 min-h-0 border border-border-default rounded mt-1 flex flex-col bg-bg-base">
                    <div className="flex items-center justify-between px-2 py-1 border-b border-border-default shrink-0">
                      <span className="text-[10px] text-text-muted font-medium">Console</span>
                      <button
                        onClick={handleClearConsole}
                        className="p-0.5 rounded text-text-faint hover:text-text-default hover:bg-bg-hover transition"
                        title="Clear console"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-2 py-1 font-mono text-[10px] space-y-0.5">
                      {consoleEntries.length === 0 ? (
                        <div className="text-text-faint italic py-1">No console output</div>
                      ) : (
                        consoleEntries.map((entry, i) => (
                          <div key={i} className={`flex items-start gap-1.5 ${
                            entry.level === 'error' ? 'text-status-error' : entry.level === 'warn' ? 'text-amber-400' : 'text-text-muted'
                          }`}>
                            {entry.level === 'error' ? <AlertCircle size={10} className="shrink-0 mt-px" /> :
                             entry.level === 'warn' ? <AlertTriangle size={10} className="shrink-0 mt-px" /> :
                             <Info size={10} className="shrink-0 mt-px" />}
                            <span className="text-text-faint shrink-0">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                            <span className="whitespace-pre-wrap break-all">{entry.message}</span>
                          </div>
                        ))
                      )}
                      <div ref={consoleEndRef} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
