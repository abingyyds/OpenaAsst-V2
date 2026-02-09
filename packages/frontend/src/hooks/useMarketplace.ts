import { useState, useCallback } from 'react';
import { apiFetch } from '../lib/api';

export interface MarketScript {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  commands: any[];
  author: string;
  usageCount: number;
  likeCount?: number;
  rating: number;
  documentContent?: string;
  createdAt: string;
}

export function useMarketplace() {
  const [scripts, setScripts] = useState<MarketScript[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchScripts = useCallback(async (category?: string, sort?: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (sort) params.set('sort', sort);
      const res = await apiFetch(`/marketplace/scripts?${params}`);
      const data = await res.json();
      setScripts(data.scripts || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  const searchScripts = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/marketplace/scripts/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setScripts(data.scripts || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  const createScript = useCallback(async (scriptData: Partial<MarketScript>) => {
    const res = await apiFetch('/marketplace/scripts', {
      method: 'POST',
      body: JSON.stringify(scriptData),
    });
    return res.json();
  }, []);

  const deleteScript = useCallback(async (id: string) => {
    await apiFetch(`/marketplace/scripts/${id}`, { method: 'DELETE' });
  }, []);

  const likeScript = useCallback(async (id: string) => {
    await apiFetch(`/marketplace/scripts/${id}/like`, { method: 'POST' });
  }, []);

  const unlikeScript = useCallback(async (id: string) => {
    await apiFetch(`/marketplace/scripts/${id}/like`, { method: 'DELETE' });
  }, []);

  const favoriteScript = useCallback(async (id: string) => {
    await apiFetch(`/marketplace/scripts/${id}/favorite`, { method: 'POST' });
  }, []);

  const unfavoriteScript = useCallback(async (id: string) => {
    await apiFetch(`/marketplace/scripts/${id}/favorite`, { method: 'DELETE' });
  }, []);

  const rateScript = useCallback(async (id: string, rating: number) => {
    await apiFetch(`/marketplace/scripts/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    });
  }, []);

  return {
    scripts, loading, error,
    fetchScripts, searchScripts, createScript, deleteScript,
    likeScript, unlikeScript, favoriteScript, unfavoriteScript, rateScript,
  };
}
