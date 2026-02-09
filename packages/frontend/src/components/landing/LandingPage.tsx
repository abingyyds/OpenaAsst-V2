import { useState } from 'react';
import { Monitor, Terminal, Globe, Download, Copy, Check, ChevronRight } from 'lucide-react';
import { Logo } from '../shared/Logo';

type Platform = 'unix' | 'powershell' | 'cmd';

const installCommands: Record<Platform, { label: string; command: string }> = {
  unix: {
    label: 'macOS / Linux',
    command: 'curl -fsSL https://raw.githubusercontent.com/abingyyds/OpenAsst/main/install.sh | bash',
  },
  powershell: {
    label: 'PowerShell',
    command: 'iwr -useb https://raw.githubusercontent.com/abingyyds/OpenAsst/main/install.ps1 | iex',
  },
  cmd: {
    label: 'CMD',
    command: 'curl -fsSL https://raw.githubusercontent.com/abingyyds/OpenAsst/main/install.bat -o install.bat && install.bat',
  },
};

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

export function LandingPage({ onLogin, onRegister }: LandingPageProps) {
  return (
    <div className="landing-page landing-grid bg-[#0f0e0c] text-white">
      <HeroSection onLogin={onLogin} onRegister={onRegister} />
      <PlatformSection />
      <FeaturesSection />
      <CLISection />
      <FooterSection />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

function HeroSection({ onLogin, onRegister }: { onLogin: () => void; onRegister: () => void }) {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen px-6 py-20">
      {/* gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#d97757]/5 via-transparent to-transparent pointer-events-none" />

      {/* terminal card */}
      <div className="terminal-window w-full max-w-2xl mb-10 relative z-10">
        <div className="terminal-dots">
          <span className="bg-[#ff5f57]" />
          <span className="bg-[#febc2e]" />
          <span className="bg-[#28c840]" />
          <span className="ml-4 text-[#a8a29e] text-xs font-mono">openasst@terminal ~</span>
        </div>
        <div className="p-5 font-mono text-sm space-y-2">
          <div><span className="text-[#d97757]">$</span> <span className="text-stone-300">openasst do "deploy my app to production"</span></div>
          <div className="text-stone-500">Analyzing project... Building Docker image... Configuring Nginx...</div>
          <div className="flex items-center gap-2 text-emerald-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Deployed successfully to 3 servers
          </div>
        </div>
      </div>

      {/* logo + title */}
      <div className="relative z-10 mb-4">
        <Logo size={72} className="drop-shadow-[0_0_24px_rgba(217,119,87,0.35)]" />
      </div>
      <h1 className="text-6xl md:text-7xl font-heading font-bold tracking-tight text-center relative z-10">
        <span className="text-white">Open</span>
        <span className="text-[#d97757] glow-text">Asst</span>
        <span className="text-stone-500 text-lg font-normal ml-3 align-top">V2</span>
      </h1>
      <p className="text-xl md:text-2xl text-stone-400 mt-4 font-mono text-center">
        AI-Powered Terminal Assistant
      </p>
      <p className="text-stone-600 font-mono text-sm mt-2 text-center">
        Desktop &middot; CLI &middot; Web &mdash; Natural Language System Operations
      </p>

      {/* CTA */}
      <div className="flex gap-4 mt-10 relative z-10">
        <button
          onClick={onLogin}
          className="px-8 py-3 bg-[#d97757] hover:bg-[#c2613f] text-white font-semibold rounded-lg
            transition-all shadow-lg shadow-[#d97757]/20 hover:shadow-[#d97757]/30"
        >
          <span className="font-mono">&gt;_ Login</span>
        </button>
        <button
          onClick={onRegister}
          className="px-8 py-3 border border-stone-600 text-stone-300 font-semibold rounded-lg
            hover:border-[#d97757]/50 hover:text-white transition-all"
        >
          <span className="font-mono">[ Register ]</span>
        </button>
      </div>

      {/* scroll hint */}
      <div className="absolute bottom-8 text-stone-600 animate-bounce">
        <ChevronRight size={20} className="rotate-90" />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Platform Downloads                                                 */
/* ------------------------------------------------------------------ */

function PlatformSection() {
  const [platform, setPlatform] = useState<Platform>('unix');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommands[platform].command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="px-6 py-20 max-w-5xl mx-auto">
      <h2 className="text-3xl font-heading font-bold text-center mb-3">
        Get <span className="text-[#d97757]">OpenAsst</span>
      </h2>
      <p className="text-stone-500 text-center mb-12 font-mono text-sm">
        Available on every platform you need
      </p>

      {/* Three columns: Desktop / CLI / Web */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
        {/* Desktop App */}
        <div className="terminal-window p-6 flex flex-col items-center text-center">
          <Monitor size={32} className="text-[#d97757] mb-4" />
          <h3 className="font-heading font-semibold text-lg mb-2">Desktop App</h3>
          <p className="text-stone-500 text-xs mb-5">Native app powered by Tauri V2</p>
          <div className="space-y-2 w-full">
            <a href="https://github.com/abingyyds/OpenaAsst-V2/releases/latest"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg
                bg-[#d97757] hover:bg-[#c2613f] text-white text-sm font-medium transition-colors">
              <Download size={14} /> macOS (.dmg)
            </a>
            <a href="https://github.com/abingyyds/OpenaAsst-V2/releases/latest"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg
                border border-stone-700 text-stone-300 text-sm hover:border-stone-500 transition-colors">
              <Download size={14} /> Windows (.msi)
            </a>
            <a href="https://github.com/abingyyds/OpenaAsst-V2/releases/latest"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg
                border border-stone-700 text-stone-300 text-sm hover:border-stone-500 transition-colors">
              <Download size={14} /> Linux (.AppImage)
            </a>
          </div>
        </div>

        {/* CLI */}
        <div className="terminal-window p-6 flex flex-col items-center text-center">
          <Terminal size={32} className="text-[#d97757] mb-4" />
          <h3 className="font-heading font-semibold text-lg mb-2">CLI Tool</h3>
          <p className="text-stone-500 text-xs mb-5">One-line install, works everywhere</p>
          <div className="w-full space-y-3">
            <div className="flex gap-1 justify-center">
              {(Object.keys(installCommands) as Platform[]).map((p) => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={`px-2.5 py-1 text-xs rounded font-mono transition-colors ${
                    platform === p
                      ? 'bg-[#d97757] text-white'
                      : 'border border-stone-700 text-stone-400 hover:border-stone-500'
                  }`}>
                  {installCommands[p].label}
                </button>
              ))}
            </div>
            <div className="bg-[#0f0e0c] rounded-lg p-3 flex items-center gap-2">
              <code className="text-[#d97757] text-[11px] flex-1 overflow-x-auto whitespace-nowrap">
                {installCommands[platform].command}
              </code>
              <button onClick={handleCopy}
                className="shrink-0 text-stone-500 hover:text-white transition-colors">
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Web */}
        <div className="terminal-window p-6 flex flex-col items-center text-center">
          <Globe size={32} className="text-[#d97757] mb-4" />
          <h3 className="font-heading font-semibold text-lg mb-2">Web Dashboard</h3>
          <p className="text-stone-500 text-xs mb-5">Use directly in your browser</p>
          <div className="space-y-2 w-full mt-auto">
            <a href="https://openasst.ai" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg
                bg-[#d97757] hover:bg-[#c2613f] text-white text-sm font-medium transition-colors">
              Open Web App
            </a>
            <p className="text-stone-600 text-[11px] font-mono">openasst.ai</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Features                                                           */
/* ------------------------------------------------------------------ */

const FEATURES = [
  { icon: '>', title: 'Smart Task Engine', desc: 'Execute any system task using natural language' },
  { icon: '#', title: 'Cluster Control', desc: 'Manage and execute on multiple servers at once' },
  { icon: '$', title: 'API Sharing', desc: 'Share AI API with Claude Code, Cursor, Aider' },
  { icon: '@', title: 'Terminal Agent', desc: 'Deploy AI agent on remote servers via SSH' },
  { icon: '!', title: 'Auto Recovery', desc: 'Intelligent error detection and auto-fixing' },
  { icon: '*', title: 'Knowledge Base', desc: 'Build and sync reusable knowledge to GitHub' },
  { icon: '~', title: 'Auto Deployment', desc: 'Deploy from Git repos, docs, or plain text' },
  { icon: '%', title: 'Skill System', desc: 'Extensible skills for Git, Docker, System ops' },
  { icon: '&', title: 'Scheduled Tasks', desc: 'Create timers and automated cron jobs' },
  { icon: '^', title: 'Service Manager', desc: 'Start, stop, and monitor background services' },
  { icon: '+', title: 'Robot Store', desc: 'Create and deploy custom AI bots to servers' },
  { icon: '=', title: 'Multi-Provider', desc: 'Anthropic, OpenAI, DeepSeek, OpenRouter' },
];

function FeaturesSection() {
  return (
    <section className="px-6 py-20 max-w-5xl mx-auto">
      <h2 className="text-3xl font-heading font-bold text-center mb-3">
        Everything You Need
      </h2>
      <p className="text-stone-500 text-center mb-12 font-mono text-sm">
        One tool to manage all your servers
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title}
            className="terminal-window p-5 hover:border-[#d97757]/40 transition-all group">
            <div className="text-2xl font-mono text-[#d97757] mb-3 group-hover:text-[#e8956f] transition-colors">
              {f.icon}_
            </div>
            <h3 className="font-semibold text-sm text-white mb-1">{f.title}</h3>
            <p className="text-stone-500 text-xs">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CLI Documentation                                                  */
/* ------------------------------------------------------------------ */

const CLI_COMMANDS = [
  { cmd: 'openasst do "install nginx"', desc: 'Execute any task with natural language' },
  { cmd: 'openasst assistant', desc: 'Interactive smart assistant mode' },
  { cmd: 'openasst deploy ./INSTALL.md', desc: 'Deploy from documentation' },
  { cmd: 'openasst auto <git-url>', desc: 'Full auto deploy from Git repository' },
  { cmd: 'openasst api share', desc: 'Share API with Claude Code, Cursor, Aider' },
  { cmd: 'openasst devices add', desc: 'Add remote device to cluster' },
  { cmd: 'openasst run "cmd" --all', desc: 'Execute command on all servers' },
  { cmd: 'openasst do "task" --all', desc: 'AI task on entire cluster' },
  { cmd: 'openasst config', desc: 'Configure API key and settings' },
  { cmd: 'openasst skill list', desc: 'List installed skills' },
  { cmd: 'openasst schedule add', desc: 'Add a scheduled task' },
  { cmd: 'openasst agent deploy --all', desc: 'Deploy agent to remote servers' },
];

function CLISection() {
  return (
    <section className="px-6 py-20 max-w-4xl mx-auto">
      <h2 className="text-3xl font-heading font-bold text-center mb-3">
        <span className="font-mono text-stone-500">#</span> CLI Documentation
      </h2>
      <p className="text-stone-500 text-center mb-10 font-mono text-sm">
        Powerful commands at your fingertips
      </p>

      <div className="terminal-window">
        <div className="terminal-dots">
          <span className="bg-[#ff5f57]" />
          <span className="bg-[#febc2e]" />
          <span className="bg-[#28c840]" />
          <span className="ml-4 text-stone-600 text-xs font-mono">openasst --help</span>
        </div>
        <div className="p-5 font-mono text-sm space-y-3">
          {CLI_COMMANDS.map((c) => (
            <div key={c.cmd}>
              <div className="text-stone-300">
                <span className="text-[#d97757]">$</span> {c.cmd}
              </div>
              <div className="text-stone-600 pl-4 text-xs">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */

function FooterSection() {
  return (
    <footer className="px-6 py-16 text-center border-t border-stone-800/50">
      <div className="flex items-center justify-center gap-6 mb-6">
        <a href="https://github.com/abingyyds/OpenaAsst-V2" target="_blank" rel="noopener noreferrer"
          className="text-stone-600 hover:text-[#d97757] transition-colors">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
        </a>
        <a href="https://openasst.ai" target="_blank" rel="noopener noreferrer"
          className="text-stone-600 hover:text-[#d97757] transition-colors font-mono text-sm">
          openasst.ai
        </a>
      </div>
      <p className="text-stone-700 font-mono text-xs">
        Open Source &middot; MIT License &middot; Made by OpenAsst Team
      </p>
    </footer>
  );
}
