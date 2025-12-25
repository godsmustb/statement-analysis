import React, { useState } from 'react';
import authService from '../services/authService';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const { user, session, error: authError } = await authService.signIn(email, password);

        if (authError) {
          setError(authError);
          setLoading(false);
          return;
        }

        if (user && session) {
          setMessage('Login successful! Redirecting...');
          resetForm();
          setTimeout(() => {
            onAuthSuccess(user, session);
            onClose();
          }, 1000);
        }
      } else {
        // Sign up
        const { user, session, error: authError } = await authService.signUp(email, password);

        if (authError) {
          setError(authError);
          setLoading(false);
          return;
        }

        if (user) {
          setMessage('Account created successfully! Please check your email to verify your account.');
          resetForm();
          setTimeout(() => {
            setIsLogin(true);
            setMessage('');
          }, 3000);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-textDark">
            {isLogin ? 'Login to Your Account' : 'Create New Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-textDark text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textDark mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-textDark mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-textDark mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            {' '}
            <button
              onClick={toggleMode}
              className="text-primary hover:underline font-medium"
              disabled={loading}
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>

        {isLogin && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                const email = prompt('Enter your email address:');
                if (email) {
                  authService.resetPassword(email);
                  setMessage('Password reset link sent to your email!');
                }
              }}
              className="text-sm text-gray-500 hover:text-primary"
              disabled={loading}
            >
              Forgot password?
            </button>
          </div>
        )}

        <div className="mt-6 p-4 bg-background rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            Your data is securely stored in Supabase and accessible only to you.
            We never share your information with third parties.
          </p>
        </div>
      </div>
    </div>
  );
}
