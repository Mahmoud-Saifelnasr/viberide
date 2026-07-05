/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, UserRole, VehicleType } from '../types';
import { Car, User as UserIcon, Lock, Mail, ChevronRight, Compass } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: User) => void;
  onEnterDevOps?: () => void;
}

export default function AuthScreen({ onAuthSuccess, onEnterDevOps }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>('passenger');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('sedan');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [baseRate, setBaseRate] = useState('2.00');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuickLogin = async (quickEmail: string, quickPass: string) => {
    setError('');
    setLoading(true);
    setEmail(quickEmail);
    setPassword(quickPass);
    setIsLogin(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: quickEmail, password: quickPass }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Connection failed. Please verify your fields.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = isLogin
      ? { email, password }
      : {
          name,
          email,
          password,
          role,
          ...(role === 'driver' ? { vehicleType, vehicleModel, vehiclePlate, baseRate } : {})
        };

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Connection failed. Please verify your fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background visual graphics */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Compass className="w-7 h-7 animate-spin-slow" />
          </div>
          <h1 id="brand-title" className="text-3xl font-bold tracking-tight text-white mb-2 font-sans">
            RideShare <span className="text-emerald-400 font-normal">Social</span>
          </h1>
          <p className="text-slate-400 text-sm">
            {isLogin ? 'Sign in to match with rides and contacts' : 'Join as a passenger or customized driver'}
          </p>
        </div>

        {error && (
          <div id="auth-error-banner" className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <>
              {/* Role Picker */}
              <div className="grid grid-cols-2 gap-3 p-1 bg-slate-950 border border-slate-850 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setRole('passenger')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    role === 'passenger'
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  Passenger
                </button>
                <button
                  type="button"
                  onClick={() => setRole('driver')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                    role === 'driver'
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Car className="w-4 h-4" />
                  Driver
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-600">
                <Mail className="w-4.5 h-4.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sarah@rideshare.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-600">
                <Lock className="w-4.5 h-4.5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* Conditional Driver Setup */}
          {!isLogin && role === 'driver' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-2 border-t border-slate-800"
            >
              <h3 className="text-sm font-semibold text-emerald-400">Driver & Vehicle Configuration</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  >
                    <option value="sedan">Sedan (Budget)</option>
                    <option value="suv">SUV (Family)</option>
                    <option value="luxury">Luxury (Elite)</option>
                    <option value="electric">Electric (Eco)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Base Rate ($/km)</label>
                  <input
                    type="number"
                    step="0.10"
                    min="0.50"
                    required
                    value={baseRate}
                    onChange={(e) => setBaseRate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Model / Color</label>
                  <input
                    type="text"
                    required
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="e.g. Tesla Model 3"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">License Plate</label>
                  <input
                    type="text"
                    required
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    placeholder="e.g. 7XYZ99"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-700 text-sm"
                  />
                </div>
              </div>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white rounded-xl py-3.5 font-semibold hover:from-emerald-400 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Processing authentications...' : isLogin ? 'Sign In' : 'Register Account'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-emerald-400 text-sm hover:underline font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

        {/* Quick Access Credentials with Auto-Login */}
        <div className="mt-6 p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            One-Click Instant Sign-In
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('sarah@rideshare.com', 'password123')}
              className="bg-slate-900 hover:bg-slate-850 border border-emerald-500/20 hover:border-emerald-500/40 text-left p-2.5 rounded-xl transition-all cursor-pointer group disabled:opacity-50"
            >
              <span className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Passenger Demo</span>
              <span className="block text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Sarah Connor</span>
              <span className="block text-[9px] text-slate-500 truncate">sarah@rideshare.com</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('carlos@rideshare.com', 'password123')}
              className="bg-slate-900 hover:bg-slate-850 border border-indigo-500/20 hover:border-indigo-500/40 text-left p-2.5 rounded-xl transition-all cursor-pointer group disabled:opacity-50"
            >
              <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Driver Demo</span>
              <span className="block text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">Carlos Santana</span>
              <span className="block text-[9px] text-slate-500 truncate">carlos@rideshare.com</span>
            </button>
          </div>
        </div>

        {onEnterDevOps && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onEnterDevOps}
              className="w-full bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-indigo-500/50 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-inner"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              <span>DevOps Administrator Console</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
