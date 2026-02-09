import { useState } from 'react';
import { LogIn, Github, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { signInWithPassword, signInWithGitHub } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signInWithPassword(email, password);
    if (err) setError(err.message);
    setLoading(false);
  };

  const handleGitHub = async () => {
    setError('');
    const { error: err } = await signInWithGitHub();
    if (err) setError(err.message);
  };

  const inputClass =
    'w-full bg-surface border border-stone-300 rounded-lg px-3 py-2 text-sm text-ink ' +
    'placeholder-ink-muted focus:outline-none focus:border-accent transition-colors';

  return (
    <div className="min-h-screen flex items-center justify-center bg-page">
      <div className="w-full max-w-sm px-6">
        <h1 className="text-2xl font-heading font-bold text-ink text-center mb-1">
          OpenAsst
        </h1>
        <p className="text-sm text-ink-muted text-center mb-6">
          Sign in to your account
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-ink-muted mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-xs text-ink-muted mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className={inputClass}
              required
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg
              bg-accent hover:bg-accent-hover text-white text-sm font-semibold
              disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
            Sign In
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-300" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-page px-2 text-ink-muted">or</span>
          </div>
        </div>

        <button
          onClick={handleGitHub}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg
            border border-stone-300 text-ink text-sm font-medium
            hover:bg-stone-100 transition-colors"
        >
          <Github size={16} />
          Continue with GitHub
        </button>

        <p className="text-xs text-ink-muted text-center mt-6">
          Don't have an account?{' '}
          <button onClick={onSwitchToRegister} className="text-accent hover:underline">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
