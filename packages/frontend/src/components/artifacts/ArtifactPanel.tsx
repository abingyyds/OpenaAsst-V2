import { useState } from 'react';
import { CodePreview } from './CodePreview';
import { WebPreview } from './WebPreview';
import { FileTree } from './FileTree';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';

interface ArtifactPanelProps {
  workDir: string;
  taskId: string;
  files: FileEntry[];
}

export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

export function ArtifactPanel({ workDir, taskId, files }: ArtifactPanelProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'code' | 'web'>('code');

  return (
    <div className="flex flex-col h-full border-l border-stone-200">
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200">
        <span className="text-xs font-semibold text-ink-muted">Files</span>
        <div className="flex gap-1">
          <TabButton
            active={previewMode === 'code'}
            onClick={() => setPreviewMode('code')}
            label="Code"
          />
          <TabButton
            active={previewMode === 'web'}
            onClick={() => setPreviewMode('web')}
            label="Preview"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <FileTree
          files={files}
          selected={selectedFile}
          onSelect={setSelectedFile}
        />
        <div className="flex-1 overflow-auto">
          {previewMode === 'web' ? (
            <WebPreview taskId={taskId} workDir={workDir} />
          ) : (
            <CodePreview filePath={selectedFile} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded ${
        active
          ? 'bg-accent text-white'
          : 'text-ink-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}
