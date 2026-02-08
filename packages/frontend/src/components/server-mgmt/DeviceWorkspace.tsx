import { useState, useRef, useCallback } from 'react';
import { DeviceTabBar, type DeviceTab } from './DeviceTabBar';
import { TerminalView } from './TerminalView';
import { DeviceChatView } from './DeviceChatView';
import { CodeView } from './CodeView';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DeviceWorkspaceProps {
  deviceId: string;
}

const MIN_TERMINAL_H = 100;
const DEFAULT_TERMINAL_H = 220;

export function DeviceWorkspace({ deviceId }: DeviceWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<DeviceTab>('chat');
  const [terminalH, setTerminalH] = useState(DEFAULT_TERMINAL_H);
  const [collapsed, setCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const onMouseDown = useCallback(() => {
    dragging.current = true;
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const maxH = rect.height * 0.6;
      const newH = rect.bottom - e.clientY;
      setTerminalH(Math.max(MIN_TERMINAL_H, Math.min(maxH, newH)));
      setCollapsed(false);
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      {/* Top: Chat / Code tabs + content */}
      <DeviceTabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && <DeviceChatView deviceId={deviceId} />}
        {activeTab === 'code' && <CodeView deviceId={deviceId} />}
      </div>

      {/* Resizer bar */}
      <div
        onMouseDown={onMouseDown}
        className="h-1 bg-stone-200 hover:bg-accent cursor-row-resize
          flex-shrink-0 transition-colors relative group"
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10
            bg-surface border border-stone-200 rounded-full p-0.5
            text-ink-muted hover:text-accent opacity-0 group-hover:opacity-100
            transition-opacity"
        >
          {collapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Bottom: Terminal (always visible) */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{ height: collapsed ? 0 : terminalH }}
      >
        <TerminalView deviceId={deviceId} />
      </div>
    </div>
  );
}
