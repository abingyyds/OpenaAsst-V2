import { MessageSquare, Server, Settings, FileText, Code, Globe, FolderOpen, Network, BookOpen, Bot, ShoppingBag, Zap, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../shared/Logo';

export type ViewType = 'chat' | 'servers' | 'cluster' | 'documents' | 'code' | 'websites' | 'files' | 'knowledge' | 'robots' | 'marketplace' | 'skills' | 'settings';

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
  { view: 'skills', icon: Zap, label: 'Skills', highlight: true },
  { view: 'marketplace', icon: ShoppingBag, label: 'Market', highlight: true },
  { view: 'robots', icon: Bot, label: 'Robots', highlight: true },
  { view: 'settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const { user, signOut } = useAuth();

  return (
    <div className="w-[68px] h-full flex flex-col items-center py-3 gap-0.5 bg-sidebar border-r border-stone-700">
      {/* Brand logo */}
      <div className="mb-2 pb-2 border-b border-stone-700/50">
        <Logo size={36} />
      </div>

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

      {/* Spacer */}
      <div className="flex-1" />

      {/* User + Logout */}
      {user && (
        <button
          onClick={signOut}
          title="Sign out"
          className="w-[58px] flex flex-col items-center gap-0.5 py-1.5 rounded-xl
            text-stone-400 hover:text-red-400 hover:bg-stone-700 transition-colors"
        >
          <LogOut size={18} strokeWidth={1.8} />
          <span className="text-[9px] leading-tight font-medium">Logout</span>
        </button>
      )}
    </div>
  );
}
