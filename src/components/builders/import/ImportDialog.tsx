import { FileUp, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useImportAbility } from '../../../api/abilities';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const importAbility = useImportAbility();

  const handleImport = useCallback(() => {
    if (!content.trim()) return;
    setError(null);

    importAbility.mutate(content, {
      onSuccess: () => {
        setContent('');
        onOpenChange(false);
      },
      onError: (err) => {
        setError(err.message);
      },
    });
  }, [content, importAbility, onOpenChange]);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        setContent(reader.result as string);
      };
      reader.readAsText(file);
    },
    [],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        setContent(reader.result as string);
      };
      reader.readAsText(file);
    },
    [],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Ability</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-[11px] text-text-muted">
            Paste content or drop a file. Auto-detects format: Ability YAML,
            SKILL.md, bash script, or MCP JSON config.
          </p>

          {/* Drop zone / file input */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-border-muted rounded-lg p-4 text-center hover:border-accent-primary/30 transition cursor-pointer"
          >
            <FileUp size={20} className="mx-auto mb-2 text-text-faint" />
            <p className="text-[10px] text-text-faint mb-2">
              Drop a file here or click to browse
            </p>
            <input
              type="file"
              accept=".yaml,.yml,.md,.sh,.json,.txt"
              onChange={handleFileSelect}
              className="hidden"
              id="import-file-input"
            />
            <label htmlFor="import-file-input">
              <Button variant="ghost" size="xs" asChild>
                <span>Choose File</span>
              </Button>
            </label>
          </div>

          {/* Text area */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Or paste content here..."
            className="w-full text-[11px] font-mono px-3 py-2 bg-bg-base border border-border-muted rounded resize-y h-48 focus:outline-none focus:border-accent-primary/50 text-text-default placeholder:text-text-faint"
          />

          {/* Error */}
          {error && (
            <div className="text-[11px] text-status-error bg-status-error/10 px-3 py-2 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="xs"
              onClick={handleImport}
              disabled={!content.trim() || importAbility.isPending}
              className="bg-accent-primary text-white hover:bg-accent-primary/80"
            >
              {importAbility.isPending ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Importing...
                </>
              ) : (
                'Import'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
