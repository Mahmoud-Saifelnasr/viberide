/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Ride, Contact, ScheduledTrip, LocationDetail } from '../types';
import MapContainer from './MapContainer';
import ChatWindow from './ChatWindow';
import { 
  CheckCircle, ShieldAlert, Navigation, Star, Car, Users, Calendar, 
  MessageCircle, DollarSign, ToggleLeft, ToggleRight, Sparkles, AlertCircle, Play, Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { useDragScroll } from '../hooks/useDragScroll';

interface DriverDashboardProps {
  currentUser: User;
  authToken: string;
  onProfileUpdate: (updatedUser: User) => void;
}

export default function DriverDashboard({ currentUser, authToken, onProfileUpdate }: DriverDashboardProps) {
  const tabsRef = useDragScroll();
  // Tabs: 'rides', 'contacts', 'schedules'
  const [activeTab, setActiveTab] = useState<'rides' | 'contacts' | 'schedules'>('rides');
  
  // Realtime updates
  const [rides, setRides] = useState<Ride[]>([]); // incoming ride requests
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [schedules, setSchedules] = useState<ScheduledTrip[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

  // Custom rate editing state
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [customRateInput, setCustomRateInput] = useState('');

  // Online/Offline State
  const isOnline = currentUser.driverProfile?.isOnline || false;

  const fetchUpdates = async () => {
    try {
      const res = await fetch('/api/updates', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filters incoming requested rides specifically for this driver, or generic ones
        setRides(data.rides || []);
        setActiveRide(data.activeRide || null);
        setSchedules(data.schedules || []);
      }
    } catch (err) {
      console.warn('Error fetching driver dashboard updates:', err);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (err) {
      console.warn('Error fetching driver contacts list:', err);
    }
  };

  useEffect(() => {
    fetchUpdates();
    fetchContacts();
    const interval = setInterval(fetchUpdates, 3500);
    return () => clearInterval(interval);
  }, [currentUser]);

  const toggleOnlineStatus = async () => {
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ isOnline: !isOnline })
      });

      if (res.ok) {
        const updated = await res.json();
        onProfileUpdate(updated);
      }
    } catch (err) {
      console.error('Error updating driver online status:', err);
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    try {
      const res = await fetch(`/api/rides/${rideId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (res.ok) {
        const data = await res.json();
        setActiveRide(data);
        fetchUpdates();
      }
    } catch (err) {
      console.error('Error accepting ride:', err);
    }
  };

  const handleStartRide = async () => {
    if (!activeRide) return;
    try {
      const res = await fetch(`/api/rides/${activeRide.id}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRide(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteRide = async () => {
    if (!activeRide) return;
    try {
      const res = await fetch(`/api/rides/${activeRide.id}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRide(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCustomRate = async (contactId: string) => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/rate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          customRate: customRateInput ? parseFloat(customRateInput) : null
        })
      });

      if (res.ok) {
        setEditingContactId(null);
        setCustomRateInput('');
        fetchContacts();
      }
    } catch (err) {
      console.error('Error setting custom passenger rate:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar Controls */}
      <div className="lg:col-span-5 space-y-6">
        {/* Online toggler bar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <div>
              <p className="text-xs font-bold text-slate-900">Driver Status Board</p>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                {isOnline ? 'ONLINE • Dispatching Active' : 'OFFLINE • Dispatching Paused'}
              </p>
            </div>
          </div>

          <button
            onClick={toggleOnlineStatus}
            className={`flex items-center justify-center p-1 rounded-full cursor-pointer transition-colors ${
              isOnline ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            {isOnline ? <ToggleRight className="w-12 h-12" /> : <ToggleLeft className="w-12 h-12" />}
          </button>
        </div>

        {/* Tab Headers */}
        <div ref={tabsRef} className="flex bg-slate-200/60 border border-slate-300/40 p-1 rounded-2xl overflow-x-auto scrollbar-none whitespace-nowrap select-none max-w-full">
          <button
            onClick={() => setActiveTab('rides')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'rides' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Car className="w-4 h-4" />
            Ride Operations
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'contacts' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Passenger contacts
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'schedules' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Schedules
          </button>
        </div>

        {activeTab === 'rides' && (
          <>
            {/* Active Ride Hud Cockpit */}
            {activeRide ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Ride Operational Cockpit</span>
                    <h3 className="text-indigo-600 font-extrabold text-lg capitalize font-display">{activeRide.status}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Trip Earning</span>
                    <p className="text-slate-900 font-black text-lg">${(activeRide.price ?? 0).toFixed(2)}</p>
                  </div>
                </div>

                {/* Passenger details */}
                <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center border border-indigo-100 text-xs">
                    {activeRide.passengerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{activeRide.passengerName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Rider Contact</p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="flex items-center gap-1 flex-wrap">
                    <strong>From:</strong> 
                    <span className="truncate max-w-[180px]">{activeRide.pickup.address}</span>
                    {activeRide.pickup.navigationPointName && (
                      <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-emerald-100 shrink-0">
                        📍 {activeRide.pickup.navigationPointName}
                      </span>
                    )}
                  </p>
                  <p className="flex items-center gap-1 flex-wrap">
                    <strong>To:</strong> 
                    <span className="truncate max-w-[180px]">{activeRide.dropoff.address}</span>
                    {activeRide.dropoff.navigationPointName && (
                      <span className="bg-rose-50 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-rose-100 shrink-0">
                        📍 {activeRide.dropoff.navigationPointName}
                      </span>
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-200/40 font-bold uppercase tracking-wider">
                    <span>Distance: {(activeRide.distanceKm ?? 0).toFixed(1)} km</span>
                    <span>Duration: {(activeRide.durationMin ?? 0).toFixed(0)} mins</span>
                  </div>
                </div>

                {/* Operations Buttons */}
                {activeRide.status === 'accepted' && (
                  <button
                    onClick={handleStartRide}
                    className="w-full bg-black hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm shadow-md shadow-slate-900/10"
                  >
                    <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                    Passenger Picked Up - Start Ride
                  </button>
                )}

                {activeRide.status === 'ongoing' && (
                  <button
                    onClick={handleCompleteRide}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm shadow-md shadow-indigo-600/10"
                  >
                    <Check className="w-4 h-4" />
                    Arrived - Complete Ride & Invoice
                  </button>
                )}

                {activeRide.status === 'completed' && (
                  <div className="p-5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-2xl flex flex-col items-center justify-center gap-2 text-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                    <p className="font-bold">Trip Completed!</p>
                    <p className="text-slate-500 text-[10px] font-medium max-w-xs">
                      Waiting for passenger {activeRide.passengerName} to finalize payment via x402 invoice.
                    </p>
                  </div>
                )}

                {/* Chat box inside operational Cockpit */}
                {activeRide.status !== 'completed' && (
                  <div className="pt-4 border-t border-slate-100">
                    <ChatWindow
                      currentUser={currentUser}
                      contactId={activeRide.passengerId}
                      contactName={activeRide.passengerName}
                      rideId={activeRide.id}
                      authToken={authToken}
                      onContactAdded={fetchContacts}
                    />
                  </div>
                )}
              </motion.div>
            ) : (
              /* Alerts Board of Incoming requested rides */
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-display">
                    <AlertCircle className="w-4 h-4 text-indigo-600" />
                    Ride Dispatch Board
                  </h3>
                  <span className="bg-slate-50 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                    REALTIME DISPATCH
                  </span>
                </div>

                {!isOnline ? (
                  <div className="text-center py-10 text-slate-400 space-y-2 font-medium">
                    <p className="text-xs">Go ONLINE to view incoming ride dispatches near you.</p>
                  </div>
                ) : rides.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center justify-center space-y-3 font-medium">
                    <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center animate-pulse bg-slate-50 text-base">🚕</div>
                    <p>Scanning GPS grid for passenger requests...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rides.map(ride => (
                      <div key={ride.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5 hover:border-slate-350 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="bg-indigo-50 text-indigo-800 text-[9px] font-black px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">
                              Ride Requested
                            </span>
                            <p className="text-xs font-bold text-slate-900 mt-2">Rider: {ride.passengerName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-900 font-black text-base font-display">${(ride.price ?? 0).toFixed(2)}</p>
                            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider mt-0.5">Estimated Fare</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-[11px] text-slate-600 border-t border-b border-slate-200/60 py-2.5">
                          <p className="flex items-center gap-1 flex-wrap">
                            <strong>From:</strong> 
                            <span className="truncate max-w-[180px]">{ride.pickup.address}</span>
                            {ride.pickup.navigationPointName && (
                              <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-emerald-100 shrink-0">
                                📍 {ride.pickup.navigationPointName}
                              </span>
                            )}
                          </p>
                          <p className="flex items-center gap-1 flex-wrap">
                            <strong>To:</strong> 
                            <span className="truncate max-w-[180px]">{ride.dropoff.address}</span>
                            {ride.dropoff.navigationPointName && (
                              <span className="bg-rose-50 text-rose-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-rose-100 shrink-0">
                                📍 {ride.dropoff.navigationPointName}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 pt-1 font-bold uppercase tracking-wider">Specs: {(ride.distanceKm ?? 0).toFixed(1)} km • {(ride.durationMin ?? 0).toFixed(0)} mins</p>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleAcceptRide(ride.id)}
                            className="flex-1 bg-black hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                          >
                            Accept Ride Request
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'contacts' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-display">
                <Users className="w-4 h-4 text-indigo-600" />
                My Passengers Directory
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Customize specific rate schemas for loyal repeat riders</p>
            </div>

            <div className="space-y-3">
              {contacts.map(c => {
                const isEditing = editingContactId === c.id;

                return (
                  <div key={c.id} className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{c.contactName}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{c.contactEmail}</p>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs font-black text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150">
                          {c.customRate ? `$${c.customRate.toFixed(2)}/km` : `Standard ($${currentUser.driverProfile?.baseRate}/km)`}
                        </p>
                        <span className="text-[8px] text-slate-450 font-bold block uppercase tracking-wider mt-1">Custom Rate</span>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2 pt-3.5 border-t border-slate-200/50">
                        <input
                          type="number"
                          step="0.10"
                          min="0.50"
                          placeholder="Rate per km (e.g. 2.10)"
                          value={customRateInput}
                          onChange={(e) => setCustomRateInput(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-slate-300"
                        />
                        <button
                          onClick={() => handleUpdateCustomRate(c.id)}
                          className="bg-black hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingContactId(null);
                            setCustomRateInput('');
                          }}
                          className="text-slate-400 text-xs hover:underline cursor-pointer font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingContactId(c.id);
                          setCustomRateInput(c.customRate?.toString() || '');
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer uppercase tracking-wider"
                      >
                        Adjust Negotiated Rate
                      </button>
                    )}
                  </div>
                );
              })}
              {contacts.length === 0 && (
                <p className="text-center py-6 text-slate-455 text-xs font-medium">No repeat passengers listed as contacts yet.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-display">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Scheduled Trip Commutes
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Upcoming scheduled and recurring rides booked with contacts</p>
            </div>

            <div className="space-y-3">
              {schedules.map(s => (
                <div key={s.id} className="bg-slate-50 p-4 border border-slate-200 rounded-2xl space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-slate-900">Passenger: {s.passengerName}</p>
                      <p className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 mt-1">
                        <span>Time: {s.scheduledTime}</span>
                        <span>•</span>
                        <span>{s.recurring ? `Recurring (${s.recurringDays.join(', ')})` : 'One-time'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-550 space-y-1 bg-white p-3 rounded-xl border border-slate-150">
                    <p className="truncate"><strong>From:</strong> {s.pickup.address}</p>
                    <p className="truncate"><strong>To:</strong> {s.dropoff.address}</p>
                  </div>
                </div>
              ))}
              {schedules.length === 0 && (
                <p className="text-center py-6 text-slate-450 text-xs font-medium">No scheduled partner trips yet.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Map display */}
      <div className="lg:col-span-7 h-[650px] lg:h-[750px]">
        <MapContainer
          pickup={activeRide ? activeRide.pickup : null}
          dropoff={activeRide ? activeRide.dropoff : null}
          drivers={isOnline ? [currentUser] : []}
          activeRide={activeRide}
          role="driver"
          pendingRides={rides}
          onAcceptRide={handleAcceptRide}
        />
      </div>
    </div>
  );
}
