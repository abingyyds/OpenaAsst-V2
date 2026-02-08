import { useState } from 'react';
import { ChatView } from './components/chat/ChatView';
import { ArtifactPanel } from './components/artifacts/ArtifactPanel';
import { Sidebar, ViewType } from './components/layout/Sidebar';
import { ServerManagement } from './components/server-mgmt/ServerManagement';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { DocumentsView } from './components/documents/DocumentsView';
import { CodeProjectView } from './components/code/CodeProjectView';
import { WebsitesView } from './components/websites/WebsitesView';
import { FilesView } from './components/files/FilesView';
import { ClusterView } from './components/cluster/ClusterView';

export function App() {
  const [activeView, setActiveView] = useState<ViewType>('chat');

  return (
    <div className="h-screen flex bg-page">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />

      <div className="flex-1 flex overflow-hidden">
        {activeView === 'chat' && (
          <>
            <div className="flex-1 flex flex-col">
              <ChatView />
            </div>
            <div className="w-[380px] shrink-0">
              <ArtifactPanel workDir="" taskId="" files={[]} />
            </div>
          </>
        )}

        {activeView === 'servers' && (
          <div className="flex-1">
            <ServerManagement />
          </div>
        )}

        {activeView === 'documents' && (
          <div className="flex-1">
            <DocumentsView />
          </div>
        )}

        {activeView === 'code' && (
          <div className="flex-1">
            <CodeProjectView />
          </div>
        )}

        {activeView === 'websites' && (
          <div className="flex-1">
            <WebsitesView />
          </div>
        )}

        {activeView === 'files' && (
          <div className="flex-1">
            <FilesView />
          </div>
        )}

        {activeView === 'cluster' && (
          <div className="flex-1">
            <ClusterView />
          </div>
        )}

        {activeView === 'settings' && (
          <div className="flex-1">
            <SettingsPanel />
          </div>
        )}
      </div>
    </div>
  );
}
