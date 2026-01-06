import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Login() {
  const navigate = useNavigate();
  const { setToken, setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${baseURL}/api/auth/login`, { email, password });
      setToken(res.data.token);
      setUser(res.data.user);
      navigate('/queue');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2070")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-indigo-900/90 to-purple-900/90"></div>
      </div>

      {/* Floating blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>

      <div className="relative z-10 w-full max-w-md px-6">
        <form
          onSubmit={handleSubmit}
          className="bg-white/95 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-10 space-y-6 text-gray-900"
        >
          {/* Logo */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-24 h-24 flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-3xl shadow-xl">
              <svg
                className="w-14 h-14 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-black">
                LAS Trivon Pvt. Ltd.
              </h1>
              <p className="text-sm font-semibold text-teal-700 mt-2">
                Patient Management System
              </p>
              <p className="text-xs font-medium text-purple-700 mt-1">
                Secure • Reliable • Professional
              </p>
            </div>
          </div>

          {/* Login */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-rose-700 text-center">
              Sign in to your account
            </h2>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded">
                <p className="text-sm font-semibold text-red-700">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter your password"
              />
            </div>

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-700 pt-6 border-t">
            <p className="font-semibold">&copy; 2026 LAS Trivon Pvt. Ltd.</p>
            <p>All rights reserved. Secure Patient Management System</p>
          </div>
        </form>

        <p className="mt-6 text-center text-white font-medium">
          Empowering Healthcare with Technology
        </p>
      </div>
    </div>
  );
}
