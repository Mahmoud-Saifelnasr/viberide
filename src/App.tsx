/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from './types';
import AuthScreen from './components/AuthScreen';
import PassengerDashboard from './components/PassengerDashboard';
import DriverDashboard from './components/DriverDashboard';
import ProfileView from './components/ProfileView';
import DevOpsDashboard from './components/DevOpsDashboard';
import { Compass, User as UserIcon, Star, LogOut, LayoutDashboard, Settings, Server } from 'lucide-react';
import { useDragScroll } from './hooks/useDragScroll';
import { APIProvider } from '@vis.gl/react-google-maps';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

export default function App() {
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('rideshare_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'devops'>('dashboard');
  const navRef = useDragScroll();

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
      } else {
        // Stale or invalid token
        handleLogout();
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchProfile(authToken);
    } else {
      setLoading(false);
    }
  }, [authToken]);

  const handleAuthSuccess = (token: string, user: User) => {
    localStorage.setItem('rideshare_token', token);
    setAuthToken(token);
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('rideshare_token');
    setAuthToken(null);
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleProfileUpdate = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  if (loading) {
    return (
      <div id="app-loading-screen" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-black animate-spin" />
        <p className="text-slate-600 text-sm font-medium">Launching RideShare Social network...</p>
      </div>
    );
  }

  // Not logged in -> Auth Form (unless explicitly viewing the DevOps Console)
  if (activeTab !== 'devops' && (!currentUser || !authToken)) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} onEnterDevOps={() => setActiveTab('devops')} />;
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly" libraries={['places']}>
      <div id="app-root-shell" className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
        {/* Premium Header Global Bar in Bento style */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo & Brand - ROUTELY inspired black logo block */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-black rounded-xl text-white flex items-center justify-center shadow-md">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900 font-display flex items-center gap-1.5">
                  RIDESHARE <span className="text-indigo-600 font-medium">SOCIAL</span>
                </h1>
              </div>
            </div>

            {/* Active Navigation Header Tabs in a neat bento pill wrapper */}
            <nav ref={navRef} className="flex gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl overflow-x-auto scrollbar-none whitespace-nowrap max-w-full select-none">
              {currentUser && (
                <>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      activeTab === 'dashboard'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                        : 'text-slate-500 hover:text-slate-950'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      activeTab === 'profile'
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                        : 'text-slate-500 hover:text-slate-950'
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Settings & Invoices</span>
                  </button>
                </>
              )}
              {!currentUser && (
                <button
                  onClick={() => setActiveTab('devops')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    activeTab === 'devops'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-950'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>DevOps Console</span>
                </button>
              )}
            </nav>

            {/* User Identity HUD */}
            <div className="flex items-center gap-3">
              {currentUser ? (
                <>
                  <div className="hidden sm:block text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                        currentUser.role === 'driver' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {currentUser.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mt-0.5 font-medium">
                      <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {(currentUser.rating ?? 5.0).toFixed(2)}
                      </span>
                      <span>•</span>
                      <span>{currentUser.email}</span>
                    </p>
                  </div>
                  
                  <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center font-bold text-slate-500 text-sm">
                    {currentUser.name.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Quick Sign Out Button */}
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 border border-transparent hover:border-rose-100"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span className="hidden md:inline text-[10px] font-extrabold uppercase tracking-wider text-slate-500 hover:text-rose-600">Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' ? (
            currentUser.role === 'passenger' ? (
              <PassengerDashboard currentUser={currentUser} authToken={authToken} />
            ) : (
              <DriverDashboard currentUser={currentUser} authToken={authToken} onProfileUpdate={handleProfileUpdate} />
            )
          ) : activeTab === 'profile' ? (
            <ProfileView 
              currentUser={currentUser} 
              authToken={authToken} 
              onLogout={handleLogout} 
              onProfileUpdate={handleProfileUpdate} 
            />
          ) : !currentUser ? (
            <DevOpsDashboard />
          ) : (
            <div className="bg-white border border-rose-100 p-8 rounded-3xl text-center space-y-4 shadow-sm max-w-md mx-auto my-12">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mx-auto font-black text-lg">!</div>
              <h3 className="text-sm font-bold text-slate-900 font-sans uppercase tracking-tight">Access Prohibited</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Passenger and driver user accounts are strictly prohibited from accessing administrative DevOps systems. Please sign out from your user account to access the DevOps Gateway.
              </p>
            </div>
          )}
        </main>

        {/* Footer bar */}
        <footer className="bg-white border-t border-slate-200 py-6 mt-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-slate-400 font-mono">
            RideShare Social • Bento Grid Architectural Theme • Secured with JWT & x402 Settlement • Local Time {new Date().toLocaleDateString()}
          </div>
        </footer>
      </div>
    </APIProvider>
  );
}
