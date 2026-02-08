import { useState, useEffect } from 'react';
import { Plus, Trash2, Server } from 'lucide-react';
import { API_BASE_URL } from '../../lib/config';

interface McpServer {
  name: string;
  type: 'stdio' | 'http' | 'sse';
  command?: string;
  url?: string;
}

/** Fetch the server list from the API */
async function fetchServers(): Promise<McpServer[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/mcp/servers`);
    const json = await res.json();
    if (!json.success || !json.data) return [];

    return Object.entries(json.data).map(([name, cfg]) => {
      const c = cfg as Record<string, unknown>;
      return {
        name,
        type: (c.type as McpServer['type']) || (c.url ? 'http' : 'stdio'),
        command: c.command as string | undefined,
        url: c.url as string | undefined,
      };
    });
  } catch {
    return [];
  }
}

export function MCPConfig() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'stdio' as McpServer['type'], value: '' });

  const reload = () => { fetchServers().then(setServers); };
  useEffect(() => { reload(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.value) return;

    const body: Record<string, unknown> = { name: form.name };
    if (form.type === 'stdio') {
      body.command = form.value;
    } else {
      body.type = form.type;
      body.url = form.value;
    }

    await fetch(`${API_BASE_URL}/mcp/servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setForm({ name: '', type: 'stdio', value: '' });
    setAdding(false);
    reload();
  };

  const handleRemove = async (name: string) => {
    await fetch(`${API_BASE_URL}/mcp/servers/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
    reload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wide flex items-center gap-2">
          <Server size={14} />
          MCP Servers
        </h3>
        <button
          onClick={() => setAdding(!adding)}
          className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      {/* Server list */}
      {servers.length === 0 && !adding && (
        <p className="text-xs text-ink-muted">No MCP servers configured.</p>
      )}

      <div className="space-y-2">
        {servers.map((s) => (
          <div
            key={s.name}
            className="flex items-center justify-between bg-surface
              border border-stone-200 rounded-lg px-3 py-2"
          >
            <div className="min-w-0">
              <span className="text-sm text-ink font-medium">
                {s.name}
              </span>
              <span className="ml-2 text-xs text-ink-muted">{s.type}</span>
              <p className="text-xs text-ink-muted truncate">
                {s.command || s.url}
              </p>
            </div>
            <button
              onClick={() => handleRemove(s.name)}
              className="ml-2 text-ink-muted hover:text-red-500 shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <AddServerForm
          form={form}
          setForm={setForm}
          onAdd={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  );
}

// ── Add Server Form ──

interface AddFormProps {
  form: { name: string; type: McpServer['type']; value: string };
  setForm: (f: AddFormProps['form']) => void;
  onAdd: () => void;
  onCancel: () => void;
}

function AddServerForm({ form, setForm, onAdd, onCancel }: AddFormProps) {
  const valuePlaceholder =
    form.type === 'stdio'
      ? 'e.g. npx -y @modelcontextprotocol/server-fs'
      : 'e.g. https://mcp.example.com/sse';

  return (
    <div className="mt-3 bg-surface border border-stone-200 rounded-lg p-3 space-y-2">
      <input
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Server name"
        className="w-full bg-page border border-stone-300 rounded px-2 py-1.5
          text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-accent"
      />

      <select
        value={form.type}
        onChange={(e) =>
          setForm({ ...form, type: e.target.value as McpServer['type'] })
        }
        className="w-full bg-page border border-stone-300 rounded px-2 py-1.5
          text-sm text-ink focus:outline-none focus:border-accent"
      >
        <option value="stdio">stdio (command)</option>
        <option value="http">http (URL)</option>
        <option value="sse">sse (URL)</option>
      </select>

      <input
        value={form.value}
        onChange={(e) => setForm({ ...form, value: e.target.value })}
        placeholder={valuePlaceholder}
        className="w-full bg-page border border-stone-300 rounded px-2 py-1.5
          text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-accent"
      />

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-xs rounded text-ink-secondary hover:text-ink
            border border-stone-300 hover:border-stone-400"
        >
          Cancel
        </button>
        <button
          onClick={onAdd}
          disabled={!form.name || !form.value}
          className="px-3 py-1 text-xs rounded bg-accent hover:bg-accent-hover
            text-white disabled:opacity-40"
        >
          Add Server
        </button>
      </div>
    </div>
  );
}
