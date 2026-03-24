import { Loader2, Play } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  useExecBash,
  useExecPowershell,
  useShellStatus,
} from '../../api/shell';
import { useWsEvent } from '../../hooks/useWebSocket';
import { useProjectsStore } from '../../stores/projects';

interface ShellEntry {
  id: string;
  type: 'command' | 'output' | 'error' | 'agent';
  shell: 'bash' | 'powershell';
  content: string;
  timestamp: string;
  exitCode?: number;
}

export function ShellPanel() {
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const { data: shellStatus } = useShellStatus();
  const execBash = useExecBash();
  const execPowershell = useExecPowershell();

  const [command, setCommand] = useState('');
  const [activeShell, setActiveShell] = useState<'bash' | 'powershell'>('bash');
  const [history, setHistory] = useState<ShellEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isExecuting = execBash.isPending || execPowershell.isPending;

  // Listen for shell:agent-action via global WS connection
  useWsEvent(
    'shell:agent-action',
    useCallback((data: unknown) => {
      const d = data as {
        id: string;
        action: string;
        status: string;
        timestamp: string;
      };
      setHistory((prev) => [
        ...prev,
        {
          id: d.id,
          type: 'agent' as const,
          shell: d.action?.startsWith('powershell')
            ? ('powershell' as const)
            : ('bash' as const),
          content: `[Agent] ${d.action} (${d.status})`,
          timestamp: d.timestamp,
        },
      ]);
    }, []),
  );

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleExecute = useCallback(async () => {
    if (!command.trim() || !activeProjectId || isExecuting) return;

    const timestamp = new Date().toISOString();
    const id = `cmd-${Date.now()}`;

    // Add command to history
    setHistory((prev) => [
      ...prev,
      {
        id,
        type: 'command',
        shell: activeShell,
        content: command,
        timestamp,
      },
    ]);
    setCommandHistory((prev) => [...prev, command]);
    setHistoryIndex(-1);

    const exec = activeShell === 'bash' ? execBash : execPowershell;

    try {
      const result = await exec.mutateAsync({
        projectId: activeProjectId,
        command,
      });

      const outputId = `out-${Date.now()}`;
      if (result.data) {
        const { stdout, stderr, exitCode } = result.data;
        if (stdout) {
          setHistory((prev) => [
            ...prev,
            {
              id: outputId,
              type: 'output',
              shell: activeShell,
              content: stdout,
              timestamp: new Date().toISOString(),
              exitCode,
            },
          ]);
        }
        if (stderr) {
          setHistory((prev) => [
            ...prev,
            {
              id: `${outputId}-err`,
              type: 'error',
              shell: activeShell,
              content: stderr,
              timestamp: new Date().toISOString(),
              exitCode,
            },
          ]);
        }
      } else if (result.error) {
        setHistory((prev) => [
          ...prev,
          {
            id: outputId,
            type: 'error',
            shell: activeShell,
            content: result.error ?? 'Unknown error',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: 'error',
          shell: activeShell,
          content: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    setCommand('');
    inputRef.current?.focus();
  }, [
    command,
    activeProjectId,
    activeShell,
    isExecuting,
    execBash,
    execPowershell,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0) {
          const newIndex =
            historyIndex === -1
              ? commandHistory.length - 1
              : Math.max(0, historyIndex - 1);
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex !== -1) {
          const newIndex = historyIndex + 1;
          if (newIndex >= commandHistory.length) {
            setHistoryIndex(-1);
            setCommand('');
          } else {
            setHistoryIndex(newIndex);
            setCommand(commandHistory[newIndex]);
          }
        }
      }
    },
    [handleExecute, commandHistory, historyIndex],
  );

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center h-full text-text-faint">
        Select a project to use the shell
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Shell selector + command input */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border-default shrink-0">
        <div className="flex items-center gap-1 text-[10px]">
          <button
            className={cn(
              'px-2 py-0.5 rounded transition',
              activeShell === 'bash'
                ? 'bg-accent-primary text-white'
                : 'text-text-muted hover:text-text-default',
            )}
            onClick={() => setActiveShell('bash')}
          >
            bash
          </button>
          {shellStatus?.powershellEnabled && (
            <button
              className={cn(
                'px-2 py-0.5 rounded transition',
                activeShell === 'powershell'
                  ? 'bg-accent-primary text-white'
                  : 'text-text-muted hover:text-text-default',
              )}
              onClick={() => setActiveShell('powershell')}
            >
              powershell
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center gap-1">
          <span className="text-[10px] text-accent-primary shrink-0">
            {activeShell === 'bash' ? '$' : 'PS>'}
          </span>
          <Input
            ref={inputRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Enter ${activeShell} command…`}
            className="h-6 text-[11px] font-mono flex-1 bg-bg-base placeholder-text-faint border-none"
            disabled={isExecuting}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleExecute}
            disabled={isExecuting || !command.trim()}
            className="h-6 w-6"
          >
            {isExecuting ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Play size={11} />
            )}
          </Button>
        </div>
      </div>

      {/* Output log */}
      <div className="flex-1 overflow-y-auto bg-[#0d1117] p-3 font-mono text-[11px]">
        {history.length === 0 ? (
          <div className="text-gray-500">
            Ready. Type a command and press Enter.
          </div>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className="mb-1">
              {entry.type === 'command' && (
                <div className="text-gray-400">
                  <span className="text-green-400">
                    {entry.shell === 'bash' ? '$ ' : 'PS> '}
                  </span>
                  {entry.content}
                </div>
              )}
              {entry.type === 'output' && (
                <pre className="text-gray-300 whitespace-pre-wrap break-all">
                  {entry.content}
                </pre>
              )}
              {entry.type === 'error' && (
                <pre className="text-red-400 whitespace-pre-wrap break-all">
                  {entry.content}
                </pre>
              )}
              {entry.type === 'agent' && (
                <div className="text-blue-400 italic">{entry.content}</div>
              )}
            </div>
          ))
        )}
        <div ref={outputEndRef} />
      </div>
    </div>
  );
}
