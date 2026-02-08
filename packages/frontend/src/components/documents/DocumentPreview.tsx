import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Presentation, Table, File, RefreshCw, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../lib/config';

interface DocumentPreviewProps {
  filePath: string | null;
  sessionId: string | null;
  streaming?: boolean;
}

export function DocumentPreview({ filePath, sessionId, streaming }: DocumentPreviewProps) {
  const ext = filePath ? filePath.split('.').pop()?.toLowerCase() : null;
  const isHtml = ext === 'html' || ext === 'htm';
  const isMd = ext === 'md';

  return (
    <div className="flex flex-col h-full border-l border-stone-200">
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200">
        <span className="text-xs font-semibold text-ink-muted">Document Preview</span>
        {streaming && filePath && (
          <span className="flex items-center gap-1 text-[10px] text-accent">
            <Loader2 size={10} className="animate-spin" />
            Live
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {!filePath ? (
          <EmptyState />
        ) : isHtml ? (
          <HtmlLivePreview filePath={filePath} streaming={streaming} />
        ) : isMd ? (
          <TextLivePreview filePath={filePath} streaming={streaming} ext="md" />
        ) : ext === 'csv' || ext === 'xlsx' || ext === 'xls' ? (
          <SpreadsheetPreview filePath={filePath} />
        ) : ext === 'pdf' ? (
          <PdfPreview filePath={filePath} />
        ) : ext === 'pptx' || ext === 'ppt' ? (
          <PptPreview filePath={filePath} />
        ) : (
          <GenericPreview filePath={filePath} ext={ext} />
        )}
      </div>
    </div>
  );
}

function HtmlLivePreview({ filePath, streaming }: { filePath: string; streaming?: boolean }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-refresh every 2s while streaming
  useEffect(() => {
    if (!streaming) return;
    const timer = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 2000);
    return () => clearInterval(timer);
  }, [streaming]);

  // Also refresh once when streaming stops (final state)
  const prevStreaming = useRef(streaming);
  useEffect(() => {
    if (prevStreaming.current && !streaming) {
      setRefreshKey((k) => k + 1);
    }
    prevStreaming.current = streaming;
  }, [streaming]);

  const src = `${API_BASE_URL}/files/serve?path=${encodeURIComponent(filePath)}&t=${refreshKey}`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-stone-200">
        <Presentation size={14} className="text-accent" />
        <span className="text-[10px] text-ink-muted truncate flex-1">{filePath}</span>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="text-ink-muted hover:text-accent transition-colors"
          title="Refresh"
        >
          <RefreshCw size={12} />
        </button>
      </div>
      <iframe
        ref={iframeRef}
        key={refreshKey}
        src={src}
        className="flex-1 bg-white w-full"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

function TextLivePreview({ filePath, streaming, ext }: { filePath: string; streaming?: boolean; ext: string }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/files/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
      const data = await res.json();
      if (data.content != null) setContent(data.content);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filePath]);

  // Initial load
  useEffect(() => { setLoading(true); fetchContent(); }, [fetchContent]);

  // Poll while streaming
  useEffect(() => {
    if (!streaming) return;
    const timer = setInterval(fetchContent, 2000);
    return () => clearInterval(timer);
  }, [streaming, fetchContent]);

  // Final refresh when streaming stops
  const prevStreaming = useRef(streaming);
  useEffect(() => {
    if (prevStreaming.current && !streaming) fetchContent();
    prevStreaming.current = streaming;
  }, [streaming, fetchContent]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-stone-200">
        <FileText size={14} className="text-accent" />
        <span className="text-[10px] text-ink-muted truncate flex-1">{filePath}</span>
        <button
          onClick={fetchContent}
          className="text-ink-muted hover:text-accent transition-colors"
          title="Refresh"
        >
          <RefreshCw size={12} />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center gap-2 text-ink-muted text-sm">
            <Loader2 size={14} className="animate-spin" />
            Loading...
          </div>
        ) : (
          <pre className="text-xs font-mono text-ink whitespace-pre-wrap break-words">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <FileText size={36} className="text-stone-300 mb-3" />
      <p className="text-sm text-ink-muted">
        Generated documents will preview here.
      </p>
      <div className="mt-3 flex gap-3 text-ink-muted">
        <div className="flex flex-col items-center gap-1">
          <Presentation size={20} />
          <span className="text-[10px]">PPT</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <FileText size={20} />
          <span className="text-[10px]">DOC</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Table size={20} />
          <span className="text-[10px]">XLS</span>
        </div>
      </div>
    </div>
  );
}

function PptPreview({ filePath }: { filePath: string }) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Presentation size={16} className="text-accent" />
        <span className="text-xs text-ink-secondary truncate">{filePath}</span>
      </div>
      <div className="bg-surface rounded-lg border border-stone-200 aspect-[16/9] flex items-center justify-center">
        <span className="text-sm text-ink-muted">PPT Preview</span>
      </div>
    </div>
  );
}

function SpreadsheetPreview({ filePath }: { filePath: string }) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Table size={16} className="text-green-600" />
        <span className="text-xs text-ink-secondary truncate">{filePath}</span>
      </div>
      <div className="bg-surface rounded-lg border border-stone-200 p-4">
        <span className="text-sm text-ink-muted">Spreadsheet Preview</span>
      </div>
    </div>
  );
}

function PdfPreview({ filePath }: { filePath: string }) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={16} className="text-red-500" />
        <span className="text-xs text-ink-secondary truncate">{filePath}</span>
      </div>
      <div className="bg-surface rounded-lg border border-stone-200 aspect-[3/4] flex items-center justify-center">
        <span className="text-sm text-ink-muted">PDF Preview</span>
      </div>
    </div>
  );
}

function GenericPreview({ filePath, ext }: { filePath: string; ext?: string | null }) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <File size={16} className="text-ink-muted" />
        <span className="text-xs text-ink-secondary truncate">{filePath}</span>
      </div>
      <div className="bg-surface rounded-lg border border-stone-200 p-4">
        <span className="text-sm text-ink-muted">.{ext} file</span>
      </div>
    </div>
  );
}
