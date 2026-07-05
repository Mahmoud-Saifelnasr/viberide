/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Ride } from '../types';
import { Star, LogOut, Receipt, History, UserCheck, ShieldAlert, CheckCircle, Navigation, MapPin } from 'lucide-react';
import TripHistoryTable from './TripHistoryTable';

interface ProfileViewProps {
  currentUser: User;
  authToken: string;
  onLogout: () => void;
  onProfileUpdate: (updatedUser: User) => void;
}

export default function ProfileView({ currentUser, authToken, onLogout, onProfileUpdate }: ProfileViewProps) {
  const [history, setHistory] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  
  // Profile inputs
  const [name, setName] = useState(currentUser.name);
  const [vehicleModel, setVehicleModel] = useState(currentUser.driverProfile?.vehicleModel || '');
  const [vehiclePlate, setVehiclePlate] = useState(currentUser.driverProfile?.vehiclePlate || '');
  const [baseRate, setBaseRate] = useState(currentUser.driverProfile?.baseRate?.toString() || '2.00');
  
  // Rating inputs
  const [ratingTargetId, setRatingTargetId] = useState<string | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratedRides, setRatedRides] = useState<Record<string, boolean>>({});

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rides/history', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching ride history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        ...(currentUser.role === 'driver' ? {
          vehicleModel,
          vehiclePlate,
          baseRate: parseFloat(baseRate)
        } : {})
      };

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        onProfileUpdate(updated);
        setEditing(false);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  const handleRateUser = async (targetUserId: string, rideId: string) => {
    try {
      const res = await fetch(`/api/users/${targetUserId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ rating: ratingValue })
      });

      if (res.ok) {
        setRatedRides(prev => ({ ...prev, [rideId]: true }));
        setRatingTargetId(null);
        alert('Thank you! Rating submitted successfully.');
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Info Summary Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center font-bold text-2xl text-white shadow-md">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 font-display">{currentUser.name}</h2>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border ${
                  currentUser.role === 'driver' 
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-150' 
                    : 'bg-emerald-50 text-emerald-800 border-emerald-150'
                }`}>
                  {currentUser.role}
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-0.5">{currentUser.email}</p>
              
              <div className="flex items-center gap-1.5 mt-2.5 text-amber-500 text-sm font-bold">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span className="text-slate-800 font-extrabold">{(currentUser.rating ?? 5.0).toFixed(2)}</span>
                <span className="text-slate-400 font-semibold text-xs">({currentUser.ratingCount ?? 0} reviews)</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setEditing(!editing)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm rounded-xl transition-all font-bold cursor-pointer border border-slate-200/60"
            >
              {editing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-rose-50 text-rose-700 text-sm rounded-xl hover:bg-rose-100 transition-all font-bold flex items-center gap-1.5 cursor-pointer border border-rose-100"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {editing && (
          <form onSubmit={handleUpdateProfile} className="mt-6 pt-6 border-t border-slate-100 space-y-5">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-display">Update Profile Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-850 text-sm focus:outline-none focus:bg-white focus:border-slate-350"
                />
              </div>

              {currentUser.role === 'driver' && (
                <>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Vehicle Model</label>
                    <input
                      type="text"
                      required
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-850 text-sm focus:outline-none focus:bg-white focus:border-slate-350"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">License Plate</label>
                    <input
                      type="text"
                      required
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-850 text-sm focus:outline-none focus:bg-white focus:border-slate-350"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-1.5">Base Rate ($/km)</label>
                    <input
                      type="number"
                      step="0.10"
                      required
                      value={baseRate}
                      onChange={(e) => setBaseRate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-850 text-sm focus:outline-none focus:bg-white focus:border-slate-350"
                    />
                  </div>
                </>
              )}
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-black hover:bg-slate-800 text-white font-bold rounded-xl transition-all text-sm cursor-pointer shadow-md"
            >
              Save Configuration
            </button>
          </form>
        )}
      </div>

      {/* Transaction & History Logs */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
          <History className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900 font-display">Ride & Transaction History</h3>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-400 font-medium">Loading history logs...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm font-medium">
            No past rides found. Trips you complete will appear here.
          </div>
        ) : (
          <TripHistoryTable
            history={history}
            currentUser={currentUser}
            ratedRides={ratedRides}
            ratingTargetId={ratingTargetId}
            ratingValue={ratingValue}
            setRatingTargetId={setRatingTargetId}
            setRatingValue={setRatingValue}
            handleRateUser={handleRateUser}
          />
        )}
      </div>
    </div>
  );
}
