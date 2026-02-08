import { useState } from 'react';
import { API_BASE_URL } from '../../lib/config';
import { Play, Square } from 'lucide-react';

interface WebPreviewProps {
  taskId: string;
  workDir: string;
}

export function WebPreview({ taskId, workDir }: WebPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/preview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, workDir }),
      });
      const data = await res.json();
      if (data.url) setUrl(data.url);
    } finally {
      setLoading(false);
    }
  };

  const stop = async () => {
    await fetch(`${API_BASE_URL}/preview/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    });
    setUrl(null);
  };

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <button
          onClick={start}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg
            bg-accent hover:bg-accent-hover text-white text-sm"
        >
          <Play size={14} />
          {loading ? 'Starting...' : 'Start Preview'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-2 py-1 border-b border-stone-200">
        <span className="text-xs text-ink-muted flex-1 truncate">{url}</span>
        <button onClick={stop} className="text-red-400 hover:text-red-300">
          <Square size={12} />
        </button>
      </div>
      <iframe src={url} className="flex-1 bg-white" />
    </div>
  );
}
