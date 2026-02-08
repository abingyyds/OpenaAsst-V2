import { MessageSquare, Server, Settings, FileText, Code, Globe, FolderOpen, Network, BookOpen } from 'lucide-react';

export type ViewType = 'chat' | 'servers' | 'cluster' | 'documents' | 'code' | 'websites' | 'files' | 'knowledge' | 'settings';

interface SidebarProps {
  activeView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const navItems: { view: ViewType; icon: typeof MessageSquare; label: string; highlight?: boolean }[] = [
  { view: 'chat', icon: MessageSquare, label: 'Chat' },
  { view: 'servers', icon: Server, label: 'Servers' },
  { view: 'cluster', icon: Network, label: 'Cluster', highlight: true },
  { view: 'documents', icon: FileText, label: 'Documents' },
  { view: 'code', icon: Code, label: 'Code' },
  { view: 'websites', icon: Globe, label: 'Websites' },
  { view: 'files', icon: FolderOpen, label: 'Files' },
  { view: 'knowledge', icon: BookOpen, label: 'Knowledge' },
  { view: 'settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <div className="w-[68px] h-full flex flex-col items-center py-3 gap-0.5 bg-sidebar border-r border-stone-700">
      {navItems.map(({ view, icon: Icon, label, highlight }) => {
        const active = activeView === view;
        return (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            title={label}
            className={`w-[58px] flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors ${
              active
                ? 'bg-accent text-white'
                : highlight
                  ? 'text-accent hover:text-white hover:bg-stone-700'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-700'
            }`}
          >
            <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
            <span className="text-[9px] leading-tight font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
