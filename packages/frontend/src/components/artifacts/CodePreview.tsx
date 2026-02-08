import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../lib/config';

interface CodePreviewProps {
  filePath: string | null;
}

export function CodePreview({ filePath }: CodePreviewProps) {
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!filePath) {
      setContent('');
      return;
    }
    fetch(`${API_BASE_URL}/files/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath }),
    })
      .then((r) => r.json())
      .then((d) => setContent(d.content || ''))
      .catch(() => setContent('Failed to load file'));
  }, [filePath]);

  if (!filePath) {
    return (
      <div className="flex items-center justify-center h-full text-ink-muted text-sm">
        Select a file to preview
      </div>
    );
  }

  return (
    <pre className="p-3 text-xs font-mono text-ink overflow-auto h-full">
      {content}
    </pre>
  );
}
