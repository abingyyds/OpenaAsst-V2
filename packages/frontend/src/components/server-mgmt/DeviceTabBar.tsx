import { MessageSquare } from 'lucide-react';

export type DeviceTab = 'chat';

interface DeviceTabBarProps {
  activeTab: DeviceTab;
  onTabChange: (tab: DeviceTab) => void;
}

export function DeviceTabBar({ activeTab }: DeviceTabBarProps) {
  return (
    <div className="flex items-center border-b border-stone-200 bg-surface px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
        <MessageSquare size={14} />
        AI Chat
      </div>
    </div>
  );
}
