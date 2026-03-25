import { ArrowLeft, Minus, Plus, Save, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { stringify } from 'yaml';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  type ExecutorType,
  type InterfaceField,
  useAbility,
  useCreateAbility,
  useUpdateAbility,
} from '../../../api/abilities';
import { useLayoutStore } from '../../../stores/layout';
import { useAgentBuilderForm } from './useAgentBuilderForm';

const EXECUTOR_OPTIONS: { value: ExecutorType; label: string }[] = [
  { value: 'skill', label: 'Skill (LLM)' },
  { value: 'command', label: 'Command (Shell)' },
  { value: 'mcp', label: 'MCP Server' },
  { value: 'workflow', label: 'Workflow' },
];

export function AgentBuilder() {
  const setActiveMain = useLayoutStore((s) => s.setActiveMain);
  const editingAbilityId = useLayoutStore((s) => s.editingAbilityId);
  const setEditingAbilityId = useLayoutStore((s) => s.setEditingAbilityId);

  const { data: existingAbility } = useAbility(editingAbilityId);
  const createAbility = useCreateAbility();
  const updateAbility = useUpdateAbility();

  const { formState, setField, resetForm, loadFromAbility, toAbilityDocument } =
    useAgentBuilderForm();

  const [tagInput, setTagInput] = useState('');

  const isEdit = !!editingAbilityId;

  // Load existing ability into form
  useEffect(() => {
    if (existingAbility?.document) {
      loadFromAbility(existingAbility.document);
    }
  }, [existingAbility, loadFromAbility]);

  // Live YAML preview (debounced via useMemo)
  const yamlPreview = useMemo(() => {
    try {
      const doc = toAbilityDocument();
      return stringify(doc, { lineWidth: 0 });
    } catch {
      return '# Error generating preview';
    }
  }, [toAbilityDocument]);

  const handleSave = () => {
    const doc = toAbilityDocument();
    if (isEdit) {
      updateAbility.mutate(
        { id: editingAbilityId, ...doc },
        {
          onSuccess: () => {
            setEditingAbilityId(null);
            setActiveMain('ability-detail');
          },
        },
      );
    } else {
      createAbility.mutate(doc, {
        onSuccess: () => {
          resetForm();
          setActiveMain('pipeline');
        },
      });
    }
  };

  const handleCancel = () => {
    resetForm();
    setEditingAbilityId(null);
    setActiveMain(isEdit ? 'ability-detail' : 'pipeline');
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formState.tags.includes(tag)) {
      setField('tags', [...formState.tags, tag]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setField(
      'tags',
      formState.tags.filter((t) => t !== tag),
    );
  };

  const addInterfaceField = (direction: 'inputFields' | 'outputFields') => {
    setField(direction, [
      ...formState[direction],
      { field: '', type: 'string', required: false, description: '' },
    ]);
  };

  const updateInterfaceField = (
    direction: 'inputFields' | 'outputFields',
    index: number,
    updates: Partial<InterfaceField>,
  ) => {
    const fields = [...formState[direction]];
    fields[index] = { ...fields[index], ...updates };
    setField(direction, fields);
  };

  const removeInterfaceField = (
    direction: 'inputFields' | 'outputFields',
    index: number,
  ) => {
    setField(
      direction,
      formState[direction].filter((_, i) => i !== index),
    );
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — Form (60%) */}
      <div className="w-[60%] overflow-y-auto border-r border-border-default">
        <div className="p-5 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="xs" onClick={handleCancel}>
              <ArrowLeft size={12} />
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="xs" onClick={handleCancel}>
                <X size={12} />
                Cancel
              </Button>
              <Button
                size="xs"
                onClick={handleSave}
                disabled={
                  !formState.name ||
                  createAbility.isPending ||
                  updateAbility.isPending
                }
                className="bg-accent-primary text-white hover:bg-accent-primary/80"
              >
                <Save size={12} />
                {isEdit ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>

          <h2 className="text-sm font-bold text-text-primary font-heading">
            {isEdit ? 'Edit Ability' : 'New Ability'}
          </h2>

          {/* ── Frontmatter ── */}
          <section className="space-y-3">
            <div className="text-[10px] uppercase tracking-widest text-text-faint">
              Identity
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] text-text-muted">Name</Label>
                <Input
                  value={formState.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="My Ability"
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-[10px] text-text-muted">ID (slug)</Label>
                <Input
                  value={formState.id}
                  onChange={(e) => setField('id', e.target.value)}
                  placeholder="my-ability"
                  className="text-xs h-8 font-mono"
                  disabled={isEdit}
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] text-text-muted">Description</Label>
              <textarea
                value={formState.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="What does this ability do?"
                className="w-full text-xs px-3 py-2 bg-bg-base border border-border-muted rounded resize-none h-16 focus:outline-none focus:border-accent-primary/50 text-text-default"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[10px] text-text-muted">Version</Label>
                <Input
                  value={formState.version}
                  onChange={(e) => setField('version', e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-[10px] text-text-muted">Author</Label>
                <Input
                  value={formState.author}
                  onChange={(e) => setField('author', e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-[10px] text-text-muted">Icon</Label>
                <Input
                  value={formState.icon}
                  onChange={(e) => setField('icon', e.target.value)}
                  placeholder="code"
                  className="text-xs h-8"
                />
              </div>
            </div>
            {/* Tags */}
            <div>
              <Label className="text-[10px] text-text-muted">Tags</Label>
              <div className="flex gap-1.5 flex-wrap mb-1.5">
                {formState.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] bg-bg-base border-border-muted text-text-muted gap-1"
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)}>
                      <X size={8} />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-1">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), addTag())
                  }
                  placeholder="Add tag..."
                  className="text-xs h-7 flex-1"
                />
                <Button variant="ghost" size="xs" onClick={addTag}>
                  <Plus size={10} />
                </Button>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Trigger ── */}
          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-text-faint">
              Trigger
            </div>
            <textarea
              value={formState.trigger}
              onChange={(e) => setField('trigger', e.target.value)}
              placeholder="When should this ability be invoked?"
              className="w-full text-xs px-3 py-2 bg-bg-base border border-border-muted rounded resize-none h-16 focus:outline-none focus:border-accent-primary/50 text-text-default"
            />
          </section>

          <Separator />

          {/* ── Interface ── */}
          <section className="space-y-3">
            <div className="text-[10px] uppercase tracking-widest text-text-faint">
              Interface
            </div>
            {(['inputFields', 'outputFields'] as const).map((dir) => (
              <div key={dir}>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-[10px] text-text-muted">
                    {dir === 'inputFields' ? 'Input' : 'Output'}
                  </Label>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => addInterfaceField(dir)}
                  >
                    <Plus size={10} />
                    Add
                  </Button>
                </div>
                {formState[dir].map((field, i) => (
                  <div key={i} className="flex gap-1.5 mb-1.5">
                    <Input
                      value={field.field}
                      onChange={(e) =>
                        updateInterfaceField(dir, i, { field: e.target.value })
                      }
                      placeholder="field"
                      className="text-xs h-7 w-24 font-mono"
                    />
                    <Input
                      value={field.type}
                      onChange={(e) =>
                        updateInterfaceField(dir, i, { type: e.target.value })
                      }
                      placeholder="type"
                      className="text-xs h-7 w-20 font-mono"
                    />
                    <Input
                      value={field.description ?? ''}
                      onChange={(e) =>
                        updateInterfaceField(dir, i, {
                          description: e.target.value,
                        })
                      }
                      placeholder="description"
                      className="text-xs h-7 flex-1"
                    />
                    <label className="flex items-center gap-1 text-[9px] text-text-faint">
                      <input
                        type="checkbox"
                        checked={field.required ?? false}
                        onChange={(e) =>
                          updateInterfaceField(dir, i, {
                            required: e.target.checked,
                          })
                        }
                        className="w-3 h-3"
                      />
                      req
                    </label>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => removeInterfaceField(dir, i)}
                    >
                      <Minus size={10} />
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </section>

          <Separator />

          {/* ── Config ── */}
          <section className="space-y-3">
            <div className="text-[10px] uppercase tracking-widest text-text-faint">
              Config
            </div>
            <div>
              <Label className="text-[10px] text-text-muted">Executor</Label>
              <div className="flex gap-1.5 mt-1">
                {EXECUTOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setField('executor', opt.value)}
                    className={`text-[10px] px-2.5 py-1 rounded border transition ${
                      formState.executor === opt.value
                        ? 'bg-accent-primary/15 border-accent-primary/30 text-accent-primary'
                        : 'bg-transparent border-border-muted text-text-faint hover:text-text-muted'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Skill config */}
            {formState.executor === 'skill' && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-[10px] text-text-muted">Model</Label>
                  <Input
                    value={formState.model}
                    onChange={(e) => setField('model', e.target.value)}
                    placeholder="claude-sonnet-4"
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-text-muted">
                    Max Tokens
                  </Label>
                  <Input
                    type="number"
                    value={formState.maxTokens}
                    onChange={(e) =>
                      setField('maxTokens', Number(e.target.value))
                    }
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-text-muted">
                    Temperature
                  </Label>
                  <Input
                    type="number"
                    step={0.1}
                    min={0}
                    max={2}
                    value={formState.temperature}
                    onChange={(e) =>
                      setField('temperature', Number(e.target.value))
                    }
                    className="text-xs h-8"
                  />
                </div>
              </div>
            )}

            {/* Command config */}
            {formState.executor === 'command' && (
              <div className="space-y-2">
                <div>
                  <Label className="text-[10px] text-text-muted">
                    Entrypoint
                  </Label>
                  <textarea
                    value={formState.entrypoint}
                    onChange={(e) => setField('entrypoint', e.target.value)}
                    placeholder="npx eslint --format json ..."
                    className="w-full text-xs font-mono px-3 py-2 bg-bg-base border border-border-muted rounded resize-none h-20 focus:outline-none focus:border-accent-primary/50 text-text-default"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-text-muted">
                      Working Directory
                    </Label>
                    <Input
                      value={formState.workingDirectory}
                      onChange={(e) =>
                        setField('workingDirectory', e.target.value)
                      }
                      placeholder="project_root"
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-text-muted">
                      Parse Output
                    </Label>
                    <select
                      value={formState.parseOutput}
                      onChange={(e) => setField('parseOutput', e.target.value)}
                      className="w-full text-xs h-8 px-2 bg-bg-base border border-border-muted rounded focus:outline-none focus:border-accent-primary/50 text-text-default"
                    >
                      <option value="text">Text</option>
                      <option value="json">JSON</option>
                      <option value="lines">Lines</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* MCP config */}
            {formState.executor === 'mcp' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-text-muted">
                      Transport
                    </Label>
                    <select
                      value={formState.transport}
                      onChange={(e) => setField('transport', e.target.value)}
                      className="w-full text-xs h-8 px-2 bg-bg-base border border-border-muted rounded focus:outline-none focus:border-accent-primary/50 text-text-default"
                    >
                      <option value="stdio">stdio</option>
                      <option value="sse">SSE</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-text-muted">URL</Label>
                    <Input
                      value={formState.mcpUrl}
                      onChange={(e) => setField('mcpUrl', e.target.value)}
                      placeholder="https://..."
                      className="text-xs h-8"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-text-muted">
                      Command
                    </Label>
                    <Input
                      value={formState.mcpCommand}
                      onChange={(e) => setField('mcpCommand', e.target.value)}
                      placeholder="npx -y @mcp/server"
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-text-muted">Args</Label>
                    <Input
                      value={formState.mcpArgs}
                      onChange={(e) => setField('mcpArgs', e.target.value)}
                      placeholder="--flag value"
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Agent-specific: tools, memory */}
            {formState.executor === 'skill' && (
              <>
                <div>
                  <Label className="text-[10px] text-text-muted">
                    Tools (comma-separated ability IDs)
                  </Label>
                  <Input
                    value={formState.tools.join(', ')}
                    onChange={(e) =>
                      setField(
                        'tools',
                        e.target.value
                          .split(',')
                          .map((t) => t.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="github, summarize-code"
                    className="text-xs h-8"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-text-muted">Memory</Label>
                  <select
                    value={formState.memory}
                    onChange={(e) => setField('memory', e.target.value)}
                    className="w-full text-xs h-8 px-2 bg-bg-base border border-border-muted rounded focus:outline-none focus:border-accent-primary/50 text-text-default"
                  >
                    <option value="none">None</option>
                    <option value="session">Session</option>
                    <option value="persistent">Persistent</option>
                  </select>
                </div>
              </>
            )}

            {/* General config */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[10px] text-text-muted">
                  Max Retries
                </Label>
                <Input
                  type="number"
                  value={formState.maxRetries}
                  onChange={(e) =>
                    setField('maxRetries', Number(e.target.value))
                  }
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-[10px] text-text-muted">
                  Timeout (sec)
                </Label>
                <Input
                  type="number"
                  value={formState.timeoutSeconds}
                  onChange={(e) =>
                    setField('timeoutSeconds', Number(e.target.value))
                  }
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-[10px] text-text-muted">On Error</Label>
                <select
                  value={formState.onError}
                  onChange={(e) => setField('onError', e.target.value)}
                  className="w-full text-xs h-8 px-2 bg-bg-base border border-border-muted rounded focus:outline-none focus:border-accent-primary/50 text-text-default"
                >
                  <option value="stop">Stop</option>
                  <option value="continue">Continue</option>
                </select>
              </div>
            </div>
          </section>

          <Separator />

          {/* ── Instructions ── */}
          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-text-faint">
              Instructions
            </div>
            <textarea
              value={formState.instructions}
              onChange={(e) => setField('instructions', e.target.value)}
              placeholder="System prompt / instructions for this ability..."
              className="w-full text-xs font-mono px-3 py-2 bg-bg-base border border-border-muted rounded resize-y min-h-32 focus:outline-none focus:border-accent-primary/50 text-text-default"
            />
          </section>

          <Separator />

          {/* ── Examples ── */}
          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-text-faint">
              Examples
            </div>
            <textarea
              value={formState.examples}
              onChange={(e) => setField('examples', e.target.value)}
              placeholder="Example input/output pairs..."
              className="w-full text-xs font-mono px-3 py-2 bg-bg-base border border-border-muted rounded resize-y min-h-20 focus:outline-none focus:border-accent-primary/50 text-text-default"
            />
          </section>

          <Separator />

          {/* ── Dependencies ── */}
          <section className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-text-faint">
              Dependencies
            </div>
            <Input
              value={formState.dependencies.join(', ')}
              onChange={(e) =>
                setField(
                  'dependencies',
                  e.target.value
                    .split(',')
                    .map((d) => d.trim())
                    .filter(Boolean),
                )
              }
              placeholder="ability-id-1, ability-id-2"
              className="text-xs h-8"
            />
          </section>
        </div>
      </div>

      {/* Right panel — YAML Preview (40%) */}
      <div className="w-[40%] flex flex-col overflow-hidden bg-bg-base">
        <div className="px-4 py-3 border-b border-border-default">
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
            YAML Preview
          </span>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-[11px] font-mono text-text-muted whitespace-pre-wrap">
          {yamlPreview}
        </pre>
      </div>
    </div>
  );
}
