import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car, Clock, MapPin, CheckCircle, Navigation, Shield, Compass, Sparkles, MessageCircle 
} from 'lucide-react';
import { Ride, User } from '../types';
import ChatWindow from './ChatWindow';

interface ActiveRideWidgetProps {
  activeRide: Ride;
  currentUser: User;
  authToken: string;
  fetchUpdates: () => Promise<void>;
  onCancelRide: () => void;
  childrenX402Checkout?: React.ReactNode;
  onContactAdded?: () => void;
}

export default function ActiveRideWidget({
  activeRide,
  currentUser,
  authToken,
  fetchUpdates,
  onCancelRide,
  childrenX402Checkout,
  onContactAdded
}: ActiveRideWidgetProps) {
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number | null>(null);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Initialize and tick countdown timer
  useEffect(() => {
    if (!activeRide) return;

    // Reset or initialize timer when status changes
    if (activeRide.status !== prevStatus) {
      setPrevStatus(activeRide.status);
      
      if (activeRide.status === 'accepted') {
        // Driver accepted, arriving at pickup
        // Estimate pickup ETA: roughly 40% of trip duration, minimum 3 mins
        const minutes = Math.max(3, Math.round(activeRide.durationMin * 0.4));
        setTimeLeftSeconds(minutes * 60);
      } else if (activeRide.status === 'ongoing') {
        // Trip underway, arriving at destination
        const minutes = Math.max(2, Math.round(activeRide.durationMin));
        setTimeLeftSeconds(minutes * 60);
      } else {
        setTimeLeftSeconds(null);
      }
    }
  }, [activeRide?.status, activeRide?.id]);

  // Tick the timer every second
  useEffect(() => {
    if (timeLeftSeconds === null) return;
    if (timeLeftSeconds <= 0) return;

    const interval = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeftSeconds]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusStepIndex = (status: string) => {
    switch (status) {
      case 'requested': return 1;
      case 'accepted': return 2;
      case 'ongoing': return 3;
      case 'completed': return 4;
      default: return 1;
    }
  };

  const stepIndex = getStatusStepIndex(activeRide.status);

  // Vehicle type styling
  const getVehicleBadgeStyles = (type: string) => {
    switch (type) {
      case 'luxury':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'electric':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'suv':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6"
    >
      {/* 1. Header with Active Status & Price */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Ride Status</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`w-2.5 h-2.5 rounded-full ${activeRide.status === 'ongoing' ? 'bg-emerald-500 animate-pulse' : 'bg-indigo-500 animate-ping'} shrink-0`} />
            <h3 className="text-slate-900 font-extrabold text-lg capitalize font-display">
              {activeRide.status === 'requested' ? 'Searching for Driver' : activeRide.status === 'accepted' ? 'Driver En Route' : activeRide.status === 'ongoing' ? 'Trip in Progress' : 'Completed'}
            </h3>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Trip Fare</span>
          <p className="text-emerald-600 font-black text-xl font-display">${(activeRide.price ?? 0).toFixed(2)}</p>
        </div>
      </div>

      {/* 2. Real-Time Progress Tracker Stepper */}
      <div className="relative py-2 px-1">
        {/* Progress Line Background */}
        <div className="absolute top-5 left-4 right-4 h-1 bg-slate-100 -translate-y-1/2 z-0 rounded-full" />
        {/* Active Progress Line */}
        <div 
          className="absolute top-5 left-4 h-1 bg-emerald-500 -translate-y-1/2 z-0 rounded-full transition-all duration-700" 
          style={{ width: `${((stepIndex - 1) / 3) * 100}%` }}
        />

        {/* Stepper Steps */}
        <div className="relative flex justify-between z-10 text-center">
          {[
            { label: 'Requested', icon: '📢' },
            { label: 'Accepted', icon: '🚗' },
            { label: 'On Way', icon: '📍' },
            { label: 'Completed', icon: '🏁' }
          ].map((step, idx) => {
            const num = idx + 1;
            const isCompleted = stepIndex > num;
            const isActive = stepIndex === num;
            return (
              <div key={idx} className="flex flex-col items-center">
                <div 
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-emerald-500 text-white' 
                      : isActive 
                        ? 'bg-slate-900 text-white ring-4 ring-slate-100 scale-115' 
                        : 'bg-white text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="w-4 h-4 text-white" /> : step.icon}
                </div>
                <span className={`text-[10px] font-bold mt-2 tracking-tight transition-all ${
                  isActive ? 'text-slate-900 font-black' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Real-Time Estimated Arrival Timer Card */}
      {timeLeftSeconds !== null && (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none">
            <Compass className="w-24 h-24 text-indigo-600 animate-spin-slow" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
              <Clock className="w-5 h-5 animate-pulse text-indigo-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                {activeRide.status === 'accepted' ? 'Driver Arrival ETA' : 'Estimated Dropoff ETA'}
              </p>
              <p className="text-[10px] text-slate-500">
                {activeRide.status === 'accepted' ? 'En route to your pickup location' : 'Smooth driving conditions detected'}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            {timeLeftSeconds > 0 ? (
              <>
                <p className="font-mono text-xl font-extrabold text-slate-900 tracking-tight">
                  {formatTime(timeLeftSeconds)}
                </p>
                <span className="text-[9px] uppercase font-bold text-emerald-600 tracking-wider">REMAINING</span>
              </>
            ) : (
              <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">
                Arriving Now!
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. Assigned Driver Identity & Vehicle details */}
      {activeRide.driverId && (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                {activeRide.driverName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{activeRide.driverName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Driver Partner</span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                  <div className="flex items-center gap-0.5 text-amber-500 text-[10px] font-bold">
                    <span>★</span>
                    <span>4.9</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vehicle Details Card Component */}
          {activeRide.driverVehicle && (
            <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-100/80 shadow-sm">
              <div>
                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block">VEHICLE DETAILS</span>
                <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">
                  {activeRide.driverVehicle.vehicleModel}
                </p>
                <span className={`inline-block text-[9px] font-bold px-2 py-0.5 mt-1 border rounded-md capitalize ${getVehicleBadgeStyles(activeRide.driverVehicle.vehicleType)}`}>
                  🚙 {activeRide.driverVehicle.vehicleType}
                </span>
              </div>
              <div className="text-right flex flex-col justify-center items-end">
                <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block mb-1">LICENSE PLATE</span>
                {/* Physical stylized license plate design */}
                <div className="bg-slate-100 border border-slate-300 rounded-md px-2 py-1 flex items-center gap-1.5 font-mono shadow-inner-sm select-none">
                  <div className="w-1 h-3 bg-blue-500 rounded-l-xs shrink-0" />
                  <span className="text-xs font-extrabold text-slate-800 tracking-widest">
                    {activeRide.driverVehicle.vehiclePlate}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Pickup & Dropoff locations layout */}
      <div className="space-y-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-start gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-1" />
          <p className="truncate text-slate-700"><strong>Pickup:</strong> {activeRide.pickup.address}</p>
        </div>
        <div className="flex items-start gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 shrink-0 mt-1" />
          <p className="truncate text-slate-700"><strong>Dropoff:</strong> {activeRide.dropoff.address}</p>
        </div>
      </div>

      {/* 6. Checkout or Chat Window */}
      {activeRide.status === 'completed' && activeRide.paymentStatus !== 'paid' ? (
        childrenX402Checkout
      ) : activeRide.status === 'completed' && activeRide.paymentStatus === 'paid' ? (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-2xl flex items-center gap-2.5 font-bold justify-center shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 animate-bounce" />
          <span>Settlement Completed Successfully! Thank you!</span>
        </div>
      ) : (
        <div className="flex gap-2">
          {activeRide.driverId && (
            <div className="w-full">
              <ChatWindow
                currentUser={currentUser}
                contactId={activeRide.driverId}
                contactName={activeRide.driverName || 'Driver'}
                rideId={activeRide.id}
                authToken={authToken}
                onContactAdded={onContactAdded}
              />
            </div>
          )}
        </div>
      )}

      {/* 7. Cancel Ride Option */}
      {['requested', 'accepted'].includes(activeRide.status) && (
        <div className="pt-2 border-t border-slate-100">
          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full text-center text-xs text-rose-500 hover:text-rose-600 hover:underline font-bold transition-all py-1.5 cursor-pointer"
            >
              Cancel Ride Request
            </button>
          ) : (
            <div className="bg-rose-50/50 border border-rose-100/80 rounded-2xl p-3.5 space-y-2 text-center animate-pulse-once">
              <p className="text-xs font-bold text-rose-800">
                Are you sure you want to cancel this ride request?
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => {
                    onCancelRide();
                    setShowCancelConfirm(false);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Yes, Cancel Request
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  Keep Ride
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
