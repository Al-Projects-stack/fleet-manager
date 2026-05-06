import { useState, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient, getErrorMessage } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { ApiResponse, User, UserRole } from '../types/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  // Sign Up button on landing sends ?tab=register and drove truck LEFT
  // Login button sends no tab and drove truck RIGHT
  const isRegister = searchParams.get('tab') === 'register';
  const truckFromLeft = !isRegister; // Login → truck comes from left; Sign Up → from right

  const [formReady, setFormReady] = useState(false);
  const [view, setView] = useState<'login' | 'register'>(isRegister ? 'register' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await apiClient.post<ApiResponse<{ user: User; token: string }>>(
        '/auth/login',
        { email, password }
      );
      if (data.data) {
        setAuth(data.data.user, data.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await apiClient.post<ApiResponse<{ user: User; token: string }>>(
        '/auth/register',
        { name, email, password, role }
      );
      if (data.data) {
        setAuth(data.data.user, data.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #050510 0%, #080e1e 50%, #05050f 100%)' }}
    >
      {/* Truck drives in from the right and parks */}
      <motion.div
        initial={{ x: truckFromLeft ? '-100vw' : '100vw', scaleX: truckFromLeft ? 1 : -1 }}
        animate={{ x: 0, scaleX: 1 }}
        transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
        onAnimationComplete={() => setFormReady(true)}
        className="select-none mb-4"
        style={{
          fontSize: '5rem',
          lineHeight: 1,
          filter:
            'drop-shadow(0 0 24px rgba(0,240,255,0.5)) drop-shadow(0 0 48px rgba(0,240,255,0.2))',
        }}
      >
        🚛
      </motion.div>

      {/* Neon "delivered" underline */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={formReady ? { scaleX: 1, opacity: 1 } : {}}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="mb-6 h-0.5 w-32 rounded-full origin-left"
        style={{ background: 'linear-gradient(90deg, #00f0ff, transparent)' }}
      />

      {/* Form card slides up once truck is parked */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={formReady ? { y: 0, opacity: 1 } : {}}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(0,240,255,0.15)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">
              Fleet<span style={{ color: '#00f0ff', textShadow: '0 0 12px #00f0ff' }}>Manager</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {view === 'login' ? 'Sign in to your account' : 'Create your account'}
            </p>
          </div>

          {/* Tab toggle */}
          <div
            className="flex rounded-lg p-1 mb-6"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <button
              type="button"
              onClick={() => setView('login')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                view === 'login'
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              style={
                view === 'login'
                  ? {
                      background: 'rgba(0,240,255,0.12)',
                      border: '1px solid rgba(0,240,255,0.3)',
                      color: '#00f0ff',
                    }
                  : {}
              }
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setView('register')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                view === 'register'
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              style={
                view === 'register'
                  ? {
                      background: 'rgba(0,240,255,0.12)',
                      border: '1px solid rgba(0,240,255,0.3)',
                      color: '#00f0ff',
                    }
                  : {}
              }
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => void (view === 'login' ? handleLogin(e) : handleRegister(e))}
            className="space-y-4"
          >
            {error && (
              <div
                className="px-4 py-3 rounded-lg text-sm"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#fca5a5',
                }}
              >
                {error}
              </div>
            )}

            {view === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.border = '1px solid rgba(0,240,255,0.4)')
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)')
                  }
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.border = '1px solid rgba(0,240,255,0.4)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)')
                }
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.border = '1px solid rgba(0,240,255,0.4)')
                }
                onBlur={(e) =>
                  (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)')
                }
              />
            </div>

            {view === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm text-white focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <option value="Admin" style={{ background: '#0d1b3e' }}>Admin</option>
                  <option value="Manager" style={{ background: '#0d1b3e' }}>Manager</option>
                  <option value="Technician" style={{ background: '#0d1b3e' }}>Technician</option>
                  <option value="ReadOnly" style={{ background: '#0d1b3e' }}>Read Only</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-bold text-black transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{
                background: loading
                  ? 'rgba(0,240,255,0.5)'
                  : 'linear-gradient(135deg, #00f0ff, #0088ff)',
                boxShadow: '0 0 20px rgba(0,240,255,0.3)',
              }}
            >
              {loading
                ? view === 'login'
                  ? 'Signing in…'
                  : 'Creating account…'
                : view === 'login'
                ? 'Sign In'
                : 'Sign Up'}
            </button>
          </form>

          {/* Back to landing */}
          <p className="text-xs text-slate-600 text-center mt-6">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="hover:text-slate-400 transition-colors"
            >
              ← Back to home
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
