import { MessageSquare, Server, Settings, FileText, Code, Globe, FolderOpen, Network } from 'lucide-react';

export type ViewType = 'chat' | 'servers' | 'cluster' | 'documents' | 'code' | 'websites' | 'files' | 'settings';

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
  { view: 'settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <div className="w-14 h-full flex flex-col items-center py-4 gap-1 bg-sidebar border-r border-stone-700">
      {navItems.map(({ view, icon: Icon, label, highlight }) => (
        <button
          key={view}
          onClick={() => onNavigate(view)}
          title={label}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
            activeView === view
              ? 'bg-accent text-white'
              : highlight
                ? 'text-accent hover:text-white hover:bg-stone-700'
                : 'text-stone-500 hover:text-stone-200 hover:bg-stone-700'
          }`}
        >
          <Icon size={20} />
        </button>
      ))}
    </div>
  );
}
