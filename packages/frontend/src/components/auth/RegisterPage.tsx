import { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const { error: err } = await signUp(email, password);
    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  const inputClass =
    'w-full bg-surface border border-stone-300 rounded-lg px-3 py-2 text-sm text-ink ' +
    'placeholder-ink-muted focus:outline-none focus:border-accent transition-colors';

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page">
        <div className="w-full max-w-sm px-6 text-center">
          <h2 className="text-lg font-heading font-bold text-ink mb-2">
            Check your email
          </h2>
          <p className="text-sm text-ink-muted mb-4">
            We sent a confirmation link to {email}
          </p>
          <button
            onClick={onSwitchToLogin}
            className="text-sm text-accent hover:underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page">
      <div className="w-full max-w-sm px-6">
        <h1 className="text-2xl font-heading font-bold text-ink text-center mb-1">
          Create Account
        </h1>
        <p className="text-sm text-ink-muted text-center mb-6">
          Sign up for OpenAsst
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
              placeholder="Min 6 characters"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className="block text-xs text-ink-muted mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
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
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <UserPlus size={14} />
            )}
            Sign Up
          </button>
        </form>

        <p className="text-xs text-ink-muted text-center mt-6">
          Already have an account?{' '}
          <button onClick={onSwitchToLogin} className="text-accent hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
