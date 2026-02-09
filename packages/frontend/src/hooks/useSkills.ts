import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../lib/config';

export interface SkillParam {
  name: string;
  description: string;
  required: boolean;
  default?: string;
}

export interface SkillCommand {
  name: string;
  description: string;
  action: string;
  params?: SkillParam[];
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  commands: SkillCommand[];
  dependencies?: string[];
  installedAt?: string;
}

export interface DeployResult {
  [deviceId: string]: {
    success: boolean;
    outputs: { command: string; stdout: string; stderr: string; exitCode: number }[];
  };
}

export function useSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [builtinSkills, setBuiltinSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/skills`);
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchBuiltinSkills = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/skills/builtin`);
      if (res.ok) {
        const data = await res.json();
        setBuiltinSkills(data.skills || []);
      }
    } catch { /* ignore */ }
  }, []);

  const installSkill = useCallback(async (skill: Skill) => {
    const res = await fetch(`${API_BASE_URL}/skills/install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skill),
    });
    return res.ok;
  }, []);

  const uninstallSkill = useCallback(async (id: string) => {
    const res = await fetch(`${API_BASE_URL}/skills/${id}`, { method: 'DELETE' });
    return res.ok;
  }, []);

  const executeSkill = useCallback(async (id: string, command: string, params?: Record<string, string>) => {
    const res = await fetch(`${API_BASE_URL}/skills/${id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, params }),
    });
    if (!res.ok) return { success: false, output: 'Request failed' };
    return res.json();
  }, []);

  const deploySkill = useCallback(async (
    id: string, deviceIds: string[], command?: string, params?: Record<string, string>,
  ): Promise<DeployResult> => {
    const res = await fetch(`${API_BASE_URL}/skills/${id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceIds, command, params }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.results || {};
  }, []);

  return {
    skills, builtinSkills, loading,
    fetchSkills, fetchBuiltinSkills,
    installSkill, uninstallSkill,
    executeSkill, deploySkill,
  };
}
