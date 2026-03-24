import {
  AlertCircle,
  AlertTriangle,
  BarChart2,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Crosshair,
  Download,
  FolderOpen,
  Globe,
  Heart,
  Info,
  Loader2,
  Play,
  RefreshCw,
  Square,
  Terminal,
  TerminalSquare,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useBrowserStatus,
  useCloseBrowser,
  useInspectInAgent,
  useLaunchBrowser,
  useNavigate,
  useScreenshot,
} from '../../api/browser';
import { apiUrl, wsUrl } from '../../api/client';
import {
  useDevServerStatus,
  useStartDevServer,
  useStopDevServer,
} from '../../api/localhost';
import { type LogEntry, useLogs } from '../../api/logs';
import { useUsageBreakdown, useUsageSummary } from '../../api/usage';
import { useLayoutStore } from '../../stores/layout';
import { useProjectsStore } from '../../stores/projects';
import { FileBrowser } from '../bottom/FileBrowser';
import { ShellPanel } from '../bottom/ShellPanel';

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

  const inspectInAgent = useInspectInAgent();

  const { data: usageSummary } = useUsageSummary();
  const [breakdownGroup, setBreakdownGroup] = useState<
    'provider' | 'model' | 'agent' | 'project'
  >('provider');
  const { data: usageBreakdown } = useUsageBreakdown(breakdownGroup);

  const [browserUrl, setBrowserUrl] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(
    null,
  );
  const [showInspectDialog, setShowInspectDialog] = useState(false);
  const [inspectSelector, setInspectSelector] = useState('');
  const [inspectDescription, setInspectDescription] = useState('');
  const [inspectConfirmation, setInspectConfirmation] = useState<string | null>(
    null,
  );

  // Admin Terminal: log search/filter + real-time entries
  const [logSearch, setLogSearch] = useState('');
  const [logSourceFilter, setLogSourceFilter] = useState('');
  const [realtimeLogs, setRealtimeLogs] = useState<LogEntry[]>([]);
  const { data: apiLogs } = useLogs(
    logSearch || undefined,
    logSourceFilter || undefined,
  );
  const adminLogsEndRef = useRef<HTMLDivElement>(null);

  // Merge API logs with realtime WebSocket logs (deduplicate by id)
  const allLogs = (() => {
    const base = apiLogs ?? [];
    const ids = new Set(base.map((l) => l.id));
    const extras = realtimeLogs.filter((l) => !ids.has(l.id));
    return [...base, ...extras];
  })();

  // Listen for log:entry WebSocket events
  useEffect(() => {
    const ws = new WebSocket(wsUrl());
    function onMessage(evt: MessageEvent) {
      try {
        const msg = JSON.parse(evt.data) as { event: string; data?: LogEntry };
        if (msg.event === 'log:entry' && msg.data) {
          setRealtimeLogs((prev) => [...prev.slice(-199), msg.data!]);
        }
      } catch {
        /* ignore */
      }
    }
    ws.addEventListener('message', onMessage);
    return () => {
      ws.close();
    };
  }, []);

  // Clear realtime buffer when API data refreshes (it includes latest)
  useEffect(() => {
    if (apiLogs) setRealtimeLogs([]);
  }, [apiLogs]);

  // Auto-scroll admin logs
  useEffect(() => {
    adminLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleNavigate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (browserUrl.trim()) {
        navigateBrowser.mutate({ url: browserUrl.trim() });
      }
    },
    [browserUrl, navigateBrowser],
  );

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
    const blob = await fetch(`data:image/png;base64,${screenshotPreview}`).then(
      (r) => r.blob(),
    );
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  }, [screenshotPreview]);

  const handleSaveScreenshot = useCallback(() => {
    if (!screenshotPreview) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${screenshotPreview}`;
    link.download = `screenshot-${Date.now()}.png`;
    link.click();
  }, [screenshotPreview]);

  const handleInspectSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (
        !inspectSelector.trim() ||
        !inspectDescription.trim() ||
        !activeProjectId
      )
        return;
      inspectInAgent.mutate(
        {
          selector: inspectSelector.trim(),
          description: inspectDescription.trim(),
          projectId: activeProjectId,
        },
        {
          onSuccess: (data) => {
            setInspectConfirmation(
              `Stage created (${data.stageId.slice(0, 8)}…)`,
            );
            setInspectSelector('');
            setInspectDescription('');
            setTimeout(() => {
              setShowInspectDialog(false);
              setInspectConfirmation(null);
            }, 2000);
          },
        },
      );
    },
    [inspectSelector, inspectDescription, activeProjectId, inspectInAgent],
  );

  // Browser console entries from WebSocket
  const [consoleEntries, setConsoleEntries] = useState<
    { level: 'info' | 'warn' | 'error'; timestamp: string; message: string }[]
  >([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Agent activity entries from WebSocket
  const [agentActions, setAgentActions] = useState<
    {
      id: string;
      action: string;
      status: 'pending' | 'done' | 'error';
      timestamp: string;
      error?: string;
    }[]
  >([]);
  const actionsEndRef = useRef<HTMLDivElement>(null);

  // Listen for browser:console and browser:agent-action WebSocket events
  useEffect(() => {
    function onBrowserMessage(evt: MessageEvent) {
      try {
        const msg = JSON.parse(evt.data) as {
          event: string;
          data?: Record<string, unknown>;
        };
        if (msg.event === 'browser:console' && msg.data) {
          const level =
            msg.data.level === 'warn'
              ? 'warn'
              : msg.data.level === 'error'
                ? 'error'
                : 'info';
          setConsoleEntries((prev) => [
            ...prev.slice(-199),
            {
              level: level as 'info' | 'warn' | 'error',
              timestamp:
                (msg.data!.timestamp as string) ?? new Date().toISOString(),
              message: (msg.data!.message as string) ?? '',
            },
          ]);
        }
        if (msg.event === 'browser:agent-action' && msg.data) {
          const { id, action, status, timestamp, error } = msg.data as {
            id: string;
            action: string;
            status: 'pending' | 'done' | 'error';
            timestamp: string;
            error?: string;
          };
          setAgentActions((prev) => {
            const idx = prev.findIndex((a) => a.id === id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], status, error };
              return updated;
            }
            return [
              ...prev.slice(-99),
              { id, action, status, timestamp, error },
            ];
          });
        }
      } catch {
        /* ignore */
      }
    }

    const ws = new WebSocket(wsUrl());
    ws.addEventListener('message', onBrowserMessage);
    return () => {
      ws.close();
    };
  }, []);

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleClearConsole = useCallback(() => {
    setConsoleEntries([]);
  }, []);

  // Auto-scroll agent activity
  useEffect(() => {
    actionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleClearActions = useCallback(() => {
    setAgentActions([]);
  }, []);

  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Listen for devserver:log WebSocket events
  useEffect(() => {
    function onMessage(evt: MessageEvent) {
      try {
        const msg = JSON.parse(evt.data) as {
          event: string;
          data?: { projectId?: string; line?: string };
        };
        if (
          msg.event === 'devserver:log' &&
          msg.data?.projectId === activeProjectId &&
          msg.data.line
        ) {
          setLogs((prev) => [...prev.slice(-199), msg.data!.line!]);
        }
      } catch {
        /* ignore */
      }
    }

    const ws = new WebSocket(wsUrl());
    ws.addEventListener('message', onMessage);
    return () => {
      ws.close();
    };
  }, [activeProjectId]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Clear logs when project changes
  useEffect(() => {
    setLogs([]);
  }, []);

  return (
    <div className="border-t border-border-default flex flex-col h-full w-full overflow-hidden">
      <div className="flex border-b border-border-default text-[11px] shrink-0">
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(
              value as
                | 'terminal'
                | 'usage'
                | 'health'
                | 'browser'
                | 'files'
                | 'shell',
            )
          }
          className="flex-1"
        >
          <TabsList className="h-auto bg-transparent p-0 rounded-none gap-0 w-auto">
            {[
              {
                id: 'terminal' as const,
                icon: <Terminal size={11} />,
                label: 'Admin Terminal',
              },
              {
                id: 'usage' as const,
                icon: <BarChart2 size={11} />,
                label: 'Usage Graphs',
              },
              {
                id: 'health' as const,
                icon: <Heart size={11} />,
                label: 'Project Health',
              },
              {
                id: 'browser' as const,
                icon: <Globe size={11} />,
                label: 'Browser',
              },
              {
                id: 'files' as const,
                icon: <FolderOpen size={11} />,
                label: 'Files',
              },
              {
                id: 'shell' as const,
                icon: <TerminalSquare size={11} />,
                label: 'Shell',
              },
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  'px-4 py-2 flex items-center gap-1.5 border-r border-border-default rounded-none transition text-[11px]',
                  'data-[state=active]:bg-bg-base data-[state=active]:text-text-primary data-[state=active]:border-t-2 data-[state=active]:border-t-accent-primary data-[state=active]:shadow-none',
                  'data-[state=inactive]:text-text-muted data-[state=inactive]:hover:text-text-default data-[state=inactive]:hover:bg-bg-hover',
                )}
              >
                {tab.icon}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="ml-auto flex items-center gap-3 px-4">
          <span className="text-[10px] text-text-faint">Session:</span>
          <span className="text-[10px] text-text-secondary">
            {usageSummary
              ? `${(usageSummary.totalTokens / 1000).toFixed(1)}k tokens`
              : '—'}
          </span>
          <span className="text-[10px] text-accent-primary">
            {usageSummary ? `~$${usageSummary.estimatedCost.toFixed(2)}` : '—'}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => togglePanel('bottomPanel')}
            title={collapsed ? 'Expand panel' : 'Collapse panel'}
            className="h-6 w-6 text-text-faint hover:text-text-default"
          >
            {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px]">
        {activeTab === 'terminal' && (
          <div className="flex flex-col h-full gap-2">
            {/* Search and filter bar */}
            <div className="flex items-center gap-2 shrink-0">
              <Input
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search logs…"
                className="h-7 text-[11px] flex-1 bg-bg-base placeholder-text-faint"
              />
              <Select
                value={logSourceFilter}
                onValueChange={(value) =>
                  setLogSourceFilter(value === '_all' ? '' : value)
                }
              >
                <SelectTrigger className="h-7 w-auto min-w-[120px] text-[11px] bg-bg-base">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All sources</SelectItem>
                  <SelectItem value="orchestrator">Orchestrator</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Log entries */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5">
              {allLogs.length === 0 ? (
                <div className="text-text-faint italic">
                  No log entries yet.
                </div>
              ) : (
                allLogs.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-1.5">
                    <span className="text-text-faint shrink-0">
                      {new Date(
                        typeof entry.createdAt === 'number'
                          ? entry.createdAt * 1000
                          : entry.createdAt,
                      ).toLocaleTimeString()}
                    </span>
                    <span
                      className={`shrink-0 font-medium ${
                        entry.source === 'orchestrator'
                          ? 'text-status-success'
                          : entry.source === 'agent'
                            ? 'text-accent-primary'
                            : entry.source === 'error'
                              ? 'text-status-error'
                              : 'text-text-faint'
                      }`}
                    >
                      [{entry.source}]
                    </span>
                    <span
                      className={`whitespace-pre-wrap break-all ${
                        entry.level === 'error'
                          ? 'text-status-error'
                          : entry.level === 'warn'
                            ? 'text-status-warning'
                            : 'text-text-muted'
                      }`}
                    >
                      {entry.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={adminLogsEndRef} />
            </div>
            {/* Input */}
            <div className="flex items-center gap-2 shrink-0 text-text-faint">
              <ChevronRight size={12} />
              <Input
                className="h-7 text-[11px] bg-transparent border-none shadow-none focus-visible:ring-0 text-text-default placeholder-text-faint flex-1 px-0"
                placeholder="Chat with Orchestrator…"
              />
            </div>
          </div>
        )}
        {activeTab === 'usage' && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-3">
              {[
                {
                  label: 'Total tokens',
                  value: usageSummary
                    ? usageSummary.totalTokens.toLocaleString()
                    : '—',
                },
                {
                  label: 'Est. cost',
                  value: usageSummary
                    ? `$${usageSummary.estimatedCost.toFixed(2)}`
                    : '—',
                },
                {
                  label: 'Top agent',
                  value: usageSummary?.mostActiveAgent ?? '—',
                },
                {
                  label: 'Top model',
                  value: usageSummary?.mostUsedModel ?? '—',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-bg-base border border-border-default rounded-lg p-3"
                >
                  <div className="text-[10px] text-text-faint mb-1">
                    {s.label}
                  </div>
                  <div className="text-sm font-bold text-text-primary">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
            {/* Breakdown table */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-faint">Group by:</span>
              {(['provider', 'model', 'agent', 'project'] as const).map((g) => (
                <Button
                  key={g}
                  variant="outline"
                  size="xs"
                  onClick={() => setBreakdownGroup(g)}
                  className={cn(
                    'text-[10px] px-2 py-0.5 h-auto',
                    breakdownGroup === g
                      ? 'bg-accent-primary/15 text-accent-primary border-accent-primary/30'
                      : 'text-text-muted border-border-default hover:bg-bg-hover',
                  )}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Button>
              ))}
              <Button
                variant="outline"
                size="xs"
                className="ml-auto text-[10px] text-text-muted border-border-default hover:bg-bg-hover h-auto px-2 py-0.5"
                asChild
              >
                <a href={apiUrl('/api/usage/export?format=csv')} download>
                  <Download size={10} /> Export CSV
                </a>
              </Button>
            </div>
            {usageBreakdown && usageBreakdown.length > 0 ? (
              <div className="bg-bg-base border border-border-default rounded overflow-hidden">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="border-b border-border-default text-text-faint">
                      <th className="text-left px-3 py-1.5 font-medium">
                        {breakdownGroup.charAt(0).toUpperCase() +
                          breakdownGroup.slice(1)}
                      </th>
                      <th className="text-right px-3 py-1.5 font-medium">
                        Input
                      </th>
                      <th className="text-right px-3 py-1.5 font-medium">
                        Output
                      </th>
                      <th className="text-right px-3 py-1.5 font-medium">
                        Tool Calls
                      </th>
                      <th className="text-right px-3 py-1.5 font-medium">
                        Cost
                      </th>
                      <th className="text-right px-3 py-1.5 font-medium">
                        Requests
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageBreakdown.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-border-default last:border-0 hover:bg-bg-hover transition"
                      >
                        <td className="px-3 py-1.5 text-text-primary">
                          {row.group ?? '(none)'}
                        </td>
                        <td className="px-3 py-1.5 text-right text-text-secondary">
                          {row.inputTokens.toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 text-right text-text-secondary">
                          {row.outputTokens.toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 text-right text-text-secondary">
                          {row.toolCalls.toLocaleString()}
                        </td>
                        <td className="px-3 py-1.5 text-right text-accent-primary">
                          ${row.estimatedCost.toFixed(4)}
                        </td>
                        <td className="px-3 py-1.5 text-right text-text-muted">
                          {row.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-[10px] text-text-faint italic">
                No usage data recorded yet.
              </div>
            )}
          </div>
        )}
        {activeTab === 'health' && (
          <div className="space-y-3">
            {!activeProjectId ? (
              <div className="text-text-faint italic">
                Select a project to view dev server status.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${devStatus?.running ? 'bg-status-success' : 'bg-text-faint'}`}
                  />
                  <span className="text-text-secondary">
                    Dev server:{' '}
                    <span
                      className={
                        devStatus?.running
                          ? 'text-status-success'
                          : 'text-text-faint'
                      }
                    >
                      {devStatus?.running
                        ? `Running on port ${devStatus.port}`
                        : 'Stopped'}
                    </span>
                    {devStatus?.pid && (
                      <span className="text-text-faint ml-2">
                        (PID {devStatus.pid})
                      </span>
                    )}
                  </span>
                  {devStatus?.running ? (
                    <Button
                      variant="destructive"
                      size="xs"
                      onClick={() => stopServer.mutate(activeProjectId)}
                      disabled={stopServer.isPending}
                      className="ml-auto bg-status-error/15 text-status-error border border-status-error/30 hover:bg-status-error/25"
                    >
                      <Square size={9} /> Stop
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => startServer.mutate(activeProjectId)}
                      disabled={startServer.isPending}
                      className="ml-auto bg-status-success/15 text-status-success border border-status-success/30 hover:bg-status-success/25"
                    >
                      <Play size={9} /> Start
                    </Button>
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
                      <div key={i} className="text-text-muted whitespace-pre">
                        {line}
                      </div>
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
              <div className="text-text-faint italic">
                Select a project to use the dev browser.
              </div>
            ) : !devStatus?.running ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Globe size={24} className="text-text-faint" />
                <div className="text-text-faint text-sm">
                  Dev server not running
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => startServer.mutate(activeProjectId)}
                  disabled={startServer.isPending}
                  className="bg-status-success/15 text-status-success border border-status-success/30 hover:bg-status-success/25"
                >
                  <Play size={9} /> Start Dev Server
                </Button>
              </div>
            ) : (
              <>
                {/* Toolbar: URL bar + actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-block w-2 h-2 rounded-full shrink-0 ${browserStatus?.running ? 'bg-status-success' : 'bg-text-faint'}`}
                  />
                  <form
                    onSubmit={handleNavigate}
                    className="flex-1 flex items-center gap-1"
                  >
                    <Input
                      value={browserUrl}
                      onChange={(e) => setBrowserUrl(e.target.value)}
                      placeholder={`http://localhost:${devStatus.port ?? 3000}`}
                      className="h-7 text-[11px] flex-1 bg-bg-base placeholder-text-faint"
                    />
                  </form>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleRefresh}
                    title="Refresh"
                    className="text-text-faint hover:text-text-default"
                  >
                    <RefreshCw size={12} />
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleScreenshot}
                    disabled={screenshot.isPending || !browserStatus?.running}
                    title="Capture screenshot"
                    className="bg-accent-primary/10 text-accent-primary border-accent-primary/30 hover:bg-accent-primary/20"
                  >
                    <Camera size={10} />{' '}
                    {screenshot.isPending ? 'Capturing…' : 'Screenshot'}
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setShowInspectDialog(true)}
                    disabled={!browserStatus?.running}
                    title="Inspect in agent"
                    className="bg-accent-primary/10 text-accent-primary border-accent-primary/30 hover:bg-accent-primary/20"
                  >
                    <Crosshair size={10} /> Inspect
                  </Button>
                  {!browserStatus?.running ? (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => launchBrowser.mutate()}
                      disabled={launchBrowser.isPending}
                      className="bg-status-success/15 text-status-success border-status-success/30 hover:bg-status-success/25"
                    >
                      <Play size={9} /> Launch
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      size="xs"
                      onClick={() => closeBrowser.mutate()}
                      disabled={closeBrowser.isPending}
                      className="bg-status-error/15 text-status-error border-status-error/30 hover:bg-status-error/25"
                    >
                      <X size={9} /> Close
                    </Button>
                  )}
                </div>
                {/* iframe preview + console split */}
                <div className="flex-1 min-h-0 flex flex-col">
                  {/* iframe preview */}
                  <div className="flex-[2] min-h-0 border border-border-default rounded overflow-hidden bg-white relative">
                    <iframe
                      key={iframeKey}
                      src={apiUrl(
                        `/api/browser/proxy/?projectId=${activeProjectId}`,
                      )}
                      className="w-full h-full border-0"
                      title="Dev Browser Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                    {/* Inspect in agent dialog overlay */}
                    {showInspectDialog && (
                      <div className="absolute inset-0 bg-bg-base/95 flex flex-col items-center justify-center gap-3 z-10">
                        <div className="text-xs text-text-primary font-medium">
                          Inspect in Agent
                        </div>
                        {inspectConfirmation ? (
                          <div className="flex items-center gap-1.5 text-status-success text-[11px]">
                            <CheckCircle size={12} /> {inspectConfirmation}
                          </div>
                        ) : (
                          <form
                            onSubmit={handleInspectSubmit}
                            className="flex flex-col gap-2 w-64"
                          >
                            <Input
                              value={inspectSelector}
                              onChange={(e) =>
                                setInspectSelector(e.target.value)
                              }
                              placeholder="CSS selector (e.g. #submit-btn)"
                              className="h-7 text-[11px] bg-bg-base placeholder-text-faint"
                            />
                            <Input
                              value={inspectDescription}
                              onChange={(e) =>
                                setInspectDescription(e.target.value)
                              }
                              placeholder="What's wrong? (e.g. button is misaligned)"
                              className="h-7 text-[11px] bg-bg-base placeholder-text-faint"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                type="submit"
                                variant="outline"
                                size="xs"
                                disabled={
                                  !inspectSelector.trim() ||
                                  !inspectDescription.trim() ||
                                  inspectInAgent.isPending
                                }
                                className="flex-1 bg-accent-primary/10 text-accent-primary border-accent-primary/30 hover:bg-accent-primary/20"
                              >
                                {inspectInAgent.isPending ? (
                                  <Loader2 size={10} className="animate-spin" />
                                ) : (
                                  <Crosshair size={10} />
                                )}
                                {inspectInAgent.isPending
                                  ? 'Sending…'
                                  : 'Send to Agent'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => {
                                  setShowInspectDialog(false);
                                  setInspectConfirmation(null);
                                }}
                                className="bg-bg-hover text-text-muted border-border-default hover:bg-bg-base"
                              >
                                <X size={10} /> Cancel
                              </Button>
                            </div>
                            {inspectInAgent.isError && (
                              <div className="text-status-error text-[10px]">
                                {inspectInAgent.error?.message}
                              </div>
                            )}
                          </form>
                        )}
                      </div>
                    )}
                    {/* Screenshot preview overlay */}
                    {screenshotPreview && (
                      <div className="absolute inset-0 bg-bg-base/95 flex flex-col items-center justify-center gap-3 z-10">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={handleCopyScreenshot}
                            title="Copy to clipboard"
                            className="bg-accent-primary/10 text-accent-primary border-accent-primary/30 hover:bg-accent-primary/20"
                          >
                            <Copy size={10} /> Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={handleSaveScreenshot}
                            title="Save as PNG"
                            className="bg-status-success/15 text-status-success border-status-success/30 hover:bg-status-success/25"
                          >
                            <Download size={10} /> Save
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => setScreenshotPreview(null)}
                            title="Close preview"
                            className="bg-bg-hover text-text-muted border-border-default hover:bg-bg-base"
                          >
                            <X size={10} /> Close
                          </Button>
                        </div>
                        <img
                          src={`data:image/png;base64,${screenshotPreview}`}
                          alt="Screenshot"
                          className="max-w-full max-h-[calc(100%-40px)] object-contain rounded border border-border-default"
                        />
                      </div>
                    )}
                  </div>
                  {/* Console + Agent Activity side by side */}
                  <div className="flex-1 min-h-0 flex flex-row gap-1 mt-1">
                    {/* Console sub-panel */}
                    <div className="flex-1 min-h-0 border border-border-default rounded flex flex-col bg-bg-base">
                      <div className="flex items-center justify-between px-2 py-1 border-b border-border-default shrink-0">
                        <span className="text-[10px] text-text-muted font-medium">
                          Console
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={handleClearConsole}
                          title="Clear console"
                          className="h-5 w-5 text-text-faint hover:text-text-default"
                        >
                          <Trash2 size={10} />
                        </Button>
                      </div>
                      <div className="flex-1 overflow-y-auto px-2 py-1 font-mono text-[10px] space-y-0.5">
                        {consoleEntries.length === 0 ? (
                          <div className="text-text-faint italic py-1">
                            No console output
                          </div>
                        ) : (
                          consoleEntries.map((entry, i) => (
                            <div
                              key={i}
                              className={`flex items-start gap-1.5 ${
                                entry.level === 'error'
                                  ? 'text-status-error'
                                  : entry.level === 'warn'
                                    ? 'text-amber-400'
                                    : 'text-text-muted'
                              }`}
                            >
                              {entry.level === 'error' ? (
                                <AlertCircle
                                  size={10}
                                  className="shrink-0 mt-px"
                                />
                              ) : entry.level === 'warn' ? (
                                <AlertTriangle
                                  size={10}
                                  className="shrink-0 mt-px"
                                />
                              ) : (
                                <Info size={10} className="shrink-0 mt-px" />
                              )}
                              <span className="text-text-faint shrink-0">
                                {new Date(entry.timestamp).toLocaleTimeString()}
                              </span>
                              <span className="whitespace-pre-wrap break-all">
                                {entry.message}
                              </span>
                            </div>
                          ))
                        )}
                        <div ref={consoleEndRef} />
                      </div>
                    </div>
                    {/* Agent Activity sub-panel */}
                    <div className="flex-1 min-h-0 border border-border-default rounded flex flex-col bg-bg-base">
                      <div className="flex items-center justify-between px-2 py-1 border-b border-border-default shrink-0">
                        <span className="text-[10px] text-text-muted font-medium">
                          Agent Activity
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={handleClearActions}
                          title="Clear activity"
                          className="h-5 w-5 text-text-faint hover:text-text-default"
                        >
                          <Trash2 size={10} />
                        </Button>
                      </div>
                      <div className="flex-1 overflow-y-auto px-2 py-1 font-mono text-[10px] space-y-0.5">
                        {agentActions.length === 0 ? (
                          <div className="text-text-faint italic py-1">
                            No agent activity
                          </div>
                        ) : (
                          agentActions.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex items-start gap-1.5"
                            >
                              {entry.status === 'pending' ? (
                                <Loader2
                                  size={10}
                                  className="shrink-0 mt-px animate-spin text-accent-primary"
                                />
                              ) : entry.status === 'done' ? (
                                <CheckCircle
                                  size={10}
                                  className="shrink-0 mt-px text-status-success"
                                />
                              ) : (
                                <XCircle
                                  size={10}
                                  className="shrink-0 mt-px text-status-error"
                                />
                              )}
                              <span className="text-text-faint shrink-0">
                                {new Date(entry.timestamp).toLocaleTimeString()}
                              </span>
                              <span
                                className={`whitespace-pre-wrap break-all ${entry.status === 'error' ? 'text-status-error' : 'text-text-muted'}`}
                              >
                                {entry.action}
                              </span>
                            </div>
                          ))
                        )}
                        <div ref={actionsEndRef} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'files' && <FileBrowser />}

        {activeTab === 'shell' && <ShellPanel />}
      </div>
    </div>
  );
}
