import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface CreateScriptModalProps {
  onClose: () => void;
  onCreate: (data: any) => void;
}

const CATEGORIES = ['deployment', 'maintenance', 'monitoring', 'docker', 'custom'];

export function CreateScriptModal({ onClose, onCreate }: CreateScriptModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('custom');
  const [tags, setTags] = useState('');
  const [commands, setCommands] = useState([{ step: 1, description: '', command: '' }]);
  const [docContent, setDocContent] = useState('');

  const addCommand = () => {
    setCommands([...commands, { step: commands.length + 1, description: '', command: '' }]);
  };

  const removeCommand = (idx: number) => {
    setCommands(commands.filter((_, i) => i !== idx));
  };

  const updateCommand = (idx: number, field: string, value: string) => {
    const updated = [...commands];
    (updated[idx] as any)[field] = value;
    setCommands(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name,
      description,
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      commands,
      documentContent: docContent || undefined,
      isPublic: true,
    });
  };

  const inputClass =
    'w-full bg-surface border border-stone-300 rounded-lg px-3 py-2 text-sm text-ink ' +
    'placeholder-ink-muted focus:outline-none focus:border-accent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-page rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
          <span className="font-heading font-semibold text-sm">Create Script</span>
          <button onClick={onClose} className="text-ink-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs text-ink-muted mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Script name" className={inputClass} required />
          </div>

          <div>
            <label className="block text-xs text-ink-muted mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="What does this script do?" rows={2}
              className={inputClass + ' resize-none'} required />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-ink-muted mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className={inputClass + ' appearance-none cursor-pointer'}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-ink-muted mb-1">Tags (comma separated)</label>
              <input value={tags} onChange={e => setTags(e.target.value)}
                placeholder="nginx, deploy" className={inputClass} />
            </div>
          </div>

          {/* Commands */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-ink-muted">Commands</label>
              <button type="button" onClick={addCommand}
                className="flex items-center gap-1 text-xs text-accent hover:underline">
                <Plus size={12} /> Add Step
              </button>
            </div>
            <div className="space-y-2">
              {commands.map((cmd, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-[10px] text-ink-muted mt-2 w-4 shrink-0">
                    {i + 1}.
                  </span>
                  <div className="flex-1 space-y-1">
                    <input value={cmd.description}
                      onChange={e => updateCommand(i, 'description', e.target.value)}
                      placeholder="Step description" className={inputClass} />
                    <input value={cmd.command}
                      onChange={e => updateCommand(i, 'command', e.target.value)}
                      placeholder="Command to execute" className={inputClass + ' font-mono text-xs'} />
                  </div>
                  {commands.length > 1 && (
                    <button type="button" onClick={() => removeCommand(i)}
                      className="text-ink-muted hover:text-red-500 mt-2">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Document content */}
          <div>
            <label className="block text-xs text-ink-muted mb-1">
              Documentation (optional, Markdown)
            </label>
            <textarea value={docContent} onChange={e => setDocContent(e.target.value)}
              placeholder="Installation guide, usage notes..." rows={4}
              className={inputClass + ' resize-none font-mono text-xs'} />
          </div>

          {/* Submit */}
          <button type="submit"
            className="w-full py-2 rounded-lg bg-accent hover:bg-accent-hover
              text-white text-sm font-semibold transition-colors">
            Create Script
          </button>
        </form>
      </div>
    </div>
  );
}
