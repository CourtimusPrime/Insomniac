import {
  ChevronDown,
  ChevronRight,
  File,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useListDirectory, useReadFile } from '../../api/filesystem';
import { useWsEvent } from '../../hooks/useWebSocket';
import { useProjectsStore } from '../../stores/projects';

interface TreeNode {
  name: string;
  type: 'file' | 'dir';
  path: string;
  expanded?: boolean;
  children?: TreeNode[];
  loaded?: boolean;
}

export function FileBrowser() {
  const activeProjectId = useProjectsStore((s) => s.activeProjectId);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
  const [agentActions, setAgentActions] = useState<
    { id: string; action: string; status: string; timestamp: string }[]
  >([]);
  const actionsEndRef = useRef<HTMLDivElement>(null);

  const { data: rootListing, isLoading } = useListDirectory(
    activeProjectId,
    '.',
  );
  const readFile = useReadFile();

  // Build initial tree from root listing
  useEffect(() => {
    if (rootListing?.success && rootListing.data) {
      const entries =
        (
          rootListing.data as {
            entries: { name: string; type: 'file' | 'dir' }[];
          }
        ).entries ?? [];
      const nodes: TreeNode[] = entries
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .map((e) => ({
          name: e.name,
          type: e.type,
          path: e.name,
          expanded: false,
          children: e.type === 'dir' ? [] : undefined,
          loaded: false,
        }));
      setTree(nodes);
      setBreadcrumb([]);
    }
  }, [rootListing]);

  // Listen for filesystem:agent-action via global WS connection
  useWsEvent(
    'filesystem:agent-action',
    useCallback((data: unknown) => {
      const action = data as {
        id: string;
        action: string;
        status: string;
        timestamp: string;
      };
      setAgentActions((prev) => {
        const existing = prev.find((a) => a.id === action.id);
        if (existing) {
          return prev.map((a) =>
            a.id === action.id ? { ...a, ...action } : a,
          );
        }
        return [...prev.slice(-49), action];
      });
    }, []),
  );

  useEffect(() => {
    actionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentActions]);

  const handleToggleDir = useCallback((nodePath: string) => {
    setTree((prev) => toggleNode(prev, nodePath));
  }, []);

  const handleFileClick = useCallback(
    async (filePath: string) => {
      if (!activeProjectId) return;
      setSelectedFile(filePath);
      setBreadcrumb(filePath.split('/'));
      try {
        const result = await readFile.mutateAsync({
          projectId: activeProjectId,
          path: filePath,
        });
        if (result.success && result.data) {
          setFileContent((result.data as { content: string }).content ?? null);
        } else {
          setFileContent(`Error: ${result.error ?? 'Unknown error'}`);
        }
      } catch (err) {
        setFileContent(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    [activeProjectId, readFile],
  );

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center h-full text-text-faint">
        Select a project to browse files
      </div>
    );
  }

  return (
    <div className="flex h-full gap-0">
      {/* File tree */}
      <div className="w-56 border-r border-border-default overflow-y-auto shrink-0">
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 size={14} className="animate-spin text-text-faint" />
          </div>
        ) : (
          <div className="py-1">
            {tree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                depth={0}
                projectId={activeProjectId}
                onToggle={handleToggleDir}
                onFileClick={handleFileClick}
                selectedFile={selectedFile}
              />
            ))}
          </div>
        )}
      </div>

      {/* File content / agent actions */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb */}
        {breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border-default text-[10px] text-text-faint shrink-0">
            <span
              className="cursor-pointer hover:text-text-default"
              onClick={() => {
                setSelectedFile(null);
                setFileContent(null);
                setBreadcrumb([]);
              }}
            >
              root
            </span>
            {breadcrumb.map((segment, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight size={8} />
                <span
                  className={
                    i === breadcrumb.length - 1
                      ? 'text-text-default'
                      : 'cursor-pointer hover:text-text-default'
                  }
                >
                  {segment}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          {fileContent !== null ? (
            <pre className="p-3 text-[11px] text-text-default whitespace-pre-wrap break-all">
              {fileContent}
            </pre>
          ) : (
            <div className="p-3 space-y-1">
              <div className="text-[10px] text-text-faint uppercase tracking-wide mb-2">
                Agent File Activity
              </div>
              {agentActions.length === 0 ? (
                <div className="text-text-faint text-[11px]">
                  No file operations yet
                </div>
              ) : (
                agentActions.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 text-[11px]"
                  >
                    <span className="text-text-faint shrink-0">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={cn(
                        'whitespace-pre-wrap break-all',
                        entry.status === 'error'
                          ? 'text-status-error'
                          : entry.status === 'done'
                            ? 'text-text-muted'
                            : 'text-accent-primary',
                      )}
                    >
                      {entry.action}
                    </span>
                  </div>
                ))
              )}
              <div ref={actionsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

function toggleNode(nodes: TreeNode[], path: string): TreeNode[] {
  return nodes.map((node) => {
    if (node.path === path) {
      return { ...node, expanded: !node.expanded };
    }
    if (node.children) {
      return { ...node, children: toggleNode(node.children, path) };
    }
    return node;
  });
}

// ---------------------------------------------------------------------------
// FileTreeNode component (lazy-loading)
// ---------------------------------------------------------------------------

function FileTreeNode({
  node,
  depth,
  projectId,
  onToggle,
  onFileClick,
  selectedFile,
}: {
  node: TreeNode;
  depth: number;
  projectId: string;
  onToggle: (path: string) => void;
  onFileClick: (path: string) => void;
  selectedFile: string | null;
}) {
  const [children, setChildren] = useState<TreeNode[]>(node.children ?? []);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: listing } = useListDirectory(
    node.expanded && !loaded ? projectId : null,
    node.path,
  );

  useEffect(() => {
    if (listing?.success && listing.data && !loaded) {
      const entries =
        (listing.data as { entries: { name: string; type: 'file' | 'dir' }[] })
          .entries ?? [];
      const childNodes: TreeNode[] = entries
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
        .map((e) => ({
          name: e.name,
          type: e.type,
          path: `${node.path}/${e.name}`,
          expanded: false,
          children: e.type === 'dir' ? [] : undefined,
          loaded: false,
        }));
      setChildren(childNodes);
      setLoaded(true);
      setLoading(false);
    }
  }, [listing, loaded, node.path]);

  const isDir = node.type === 'dir';
  const isSelected = selectedFile === node.path;

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-0.5 cursor-pointer hover:bg-bg-hover',
          isSelected && 'bg-bg-hover text-text-primary',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          if (isDir) {
            if (!loaded && !loading) setLoading(true);
            onToggle(node.path);
          } else {
            onFileClick(node.path);
          }
        }}
      >
        {isDir ? (
          node.expanded ? (
            <ChevronDown size={10} className="shrink-0 text-text-faint" />
          ) : (
            <ChevronRight size={10} className="shrink-0 text-text-faint" />
          )
        ) : (
          <span className="w-[10px]" />
        )}
        {isDir ? (
          <FolderOpen size={11} className="shrink-0 text-accent-primary" />
        ) : (
          <File size={11} className="shrink-0 text-text-faint" />
        )}
        <span className="truncate text-[11px]">{node.name}</span>
        {loading && (
          <Loader2 size={9} className="animate-spin text-text-faint" />
        )}
      </div>
      {isDir && node.expanded && (
        <>
          {children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              projectId={projectId}
              onToggle={onToggle}
              onFileClick={onFileClick}
              selectedFile={selectedFile}
            />
          ))}
        </>
      )}
    </>
  );
}
