import { MessageSquare, Code } from 'lucide-react';

export type DeviceTab = 'chat' | 'code';

interface DeviceTabBarProps {
  activeTab: DeviceTab;
  onTabChange: (tab: DeviceTab) => void;
}

const TABS: { id: DeviceTab; label: string; icon: typeof MessageSquare }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'code', label: 'Code', icon: Code },
];

export function DeviceTabBar({ activeTab, onTabChange }: DeviceTabBarProps) {
  return (
    <div className="flex border-b border-stone-200 bg-surface">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors relative ${
              active ? 'text-accent' : 'text-ink-muted hover:text-ink-secondary'
            }`}
          >
            <Icon size={14} />
            {tab.label}
            {active && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
            )}
          </button>
        );
      })}
    </div>
  );
}
