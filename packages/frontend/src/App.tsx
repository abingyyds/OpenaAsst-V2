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
import { KnowledgeView } from './components/knowledge/KnowledgeView';
import { RobotStoreView } from './components/robots/RobotStoreView';
import { MarketplaceView } from './components/marketplace/MarketplaceView';
import { SkillsView } from './components/skills/SkillsView';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { AuthCallback } from './components/auth/AuthCallback';
import { LandingPage } from './components/landing/LandingPage';
import { useAuth } from './hooks/useAuth';

type AuthView = 'landing' | 'login' | 'register' | 'callback';

export function App() {
  const { user, loading } = useAuth();
  const [activeView, setActiveView] = useState<ViewType>('chat');
  const [authView, setAuthView] = useState<AuthView>('landing');

  // Handle OAuth callback
  if (window.location.hash.includes('access_token')) {
    return <AuthCallback />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-page">
        <span className="text-sm text-ink-muted">Loading...</span>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    if (authView === 'register') {
      return <RegisterPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'login') {
      return <LoginPage onSwitchToRegister={() => setAuthView('register')} />;
    }
    return (
      <LandingPage
        onLogin={() => setAuthView('login')}
        onRegister={() => setAuthView('register')}
      />
    );
  }

  // Logged in — main app
  return (
    <div className="h-screen flex bg-page overflow-hidden">
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
          <div className="flex-1"><ServerManagement /></div>
        )}
        {activeView === 'documents' && (
          <div className="flex-1"><DocumentsView /></div>
        )}
        {activeView === 'code' && (
          <div className="flex-1"><CodeProjectView /></div>
        )}
        {activeView === 'websites' && (
          <div className="flex-1"><WebsitesView /></div>
        )}
        {activeView === 'files' && (
          <div className="flex-1"><FilesView /></div>
        )}
        {activeView === 'cluster' && (
          <div className="flex-1"><ClusterView /></div>
        )}
        {activeView === 'knowledge' && (
          <div className="flex-1"><KnowledgeView /></div>
        )}
        {activeView === 'robots' && (
          <div className="flex-1"><RobotStoreView /></div>
        )}
        {activeView === 'marketplace' && (
          <div className="flex-1"><MarketplaceView /></div>
        )}
        {activeView === 'skills' && (
          <div className="flex-1"><SkillsView /></div>
        )}
        {activeView === 'settings' && (
          <div className="flex-1"><SettingsPanel /></div>
        )}
      </div>
    </div>
  );
}
