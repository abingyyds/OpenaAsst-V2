import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

export function AuthCallback() {
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ error: err }) => {
      if (err) setError(err.message);
    });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-2">Authentication failed</p>
          <p className="text-xs text-ink-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page">
      <div className="flex items-center gap-2 text-ink-muted">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Completing sign in...</span>
      </div>
    </div>
  );
}
