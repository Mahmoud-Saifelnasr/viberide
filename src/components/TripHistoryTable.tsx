import React from 'react';
import { Ride, User } from '../types';
import { Star, MapPin, Receipt, ArrowRight, Clock, Compass } from 'lucide-react';

interface TripHistoryTableProps {
  history: Ride[];
  currentUser: User;
  ratedRides: Record<string, boolean>;
  ratingTargetId: string | null;
  ratingValue: number;
  setRatingTargetId: (id: string | null) => void;
  setRatingValue: (val: number) => void;
  handleRateUser: (targetUserId: string, rideId: string) => void;
}

export default function TripHistoryTable({
  history,
  currentUser,
  ratedRides,
  ratingTargetId,
  ratingValue,
  setRatingTargetId,
  setRatingValue,
  handleRateUser
}: TripHistoryTableProps) {
  const isPassenger = currentUser.role === 'passenger';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            ● Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            ● Cancelled
          </span>
        );
      case 'ongoing':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            ● Ongoing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
            ● {status}
          </span>
        );
    }
  };

  const getPaymentBadge = (status: string) => {
    if (status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-100">
          PAID
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-100">
        UNPAID
      </span>
    );
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-100 shadow-sm bg-white">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            <th className="py-4 px-5">Date / ID</th>
            <th className="py-4 px-5">{isPassenger ? 'Driver Partner' : 'Passenger'}</th>
            <th className="py-4 px-5">Route</th>
            <th className="py-4 px-5 text-right">Metrics</th>
            <th className="py-4 px-5 text-right">Fare / Payment</th>
            <th className="py-4 px-5 text-center">Status</th>
            <th className="py-4 px-5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
          {history.map((ride) => {
            const isCancelled = ride.status === 'cancelled';
            const oppositeName = isPassenger ? ride.driverName || 'No Driver' : ride.passengerName;
            const oppositeId = isPassenger ? ride.driverId : ride.passengerId;

            return (
              <tr 
                key={ride.id} 
                className="hover:bg-slate-50/40 transition-colors group"
              >
                {/* 1. Date & ID */}
                <td className="py-4 px-5 align-middle">
                  <span className="font-bold text-slate-800 block">
                    {new Date(ride.createdAt).toLocaleDateString([], { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5 uppercase tracking-tight">
                    {new Date(ride.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </td>

                {/* 2. Partner name / profile */}
                <td className="py-4 px-5 align-middle">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 text-white font-extrabold flex items-center justify-center text-[10px] uppercase shrink-0">
                      {oppositeName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 block truncate max-w-[120px]">
                        {oppositeName}
                      </span>
                      {isPassenger && ride.driverVehicle && (
                        <span className="text-[9px] text-slate-400 block truncate max-w-[120px] font-medium mt-0.5">
                          🚙 {ride.driverVehicle.vehicleModel}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* 3. Route addresses */}
                <td className="py-4 px-5 align-middle max-w-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="truncate text-slate-700 font-medium max-w-[180px] block" title={ride.pickup.address}>
                        {ride.pickup.address}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0" />
                      <span className="truncate text-slate-600 max-w-[180px] block" title={ride.dropoff.address}>
                        {ride.dropoff.address}
                      </span>
                    </div>
                  </div>
                </td>

                {/* 4. Distance / Duration metrics */}
                <td className="py-4 px-5 align-middle text-right font-medium">
                  <span className="text-slate-800 block font-bold">
                    {(ride.distanceKm ?? 0).toFixed(1)} km
                  </span>
                  <span className="text-[10px] text-slate-450 block mt-0.5">
                    ⏱️ {(ride.durationMin ?? 0).toFixed(0)} mins
                  </span>
                </td>

                {/* 5. Fare cost & Payment badge */}
                <td className="py-4 px-5 align-middle text-right">
                  <span className="text-sm font-black text-slate-900 font-display block">
                    ${(ride.price ?? 0).toFixed(2)}
                  </span>
                  {!isCancelled && (
                    <div className="mt-1 flex items-center justify-end gap-1">
                      <Receipt className="w-3 h-3 text-emerald-600 shrink-0" />
                      {getPaymentBadge(ride.paymentStatus)}
                    </div>
                  )}
                </td>

                {/* 6. Overall Ride Status badge */}
                <td className="py-4 px-5 align-middle text-center">
                  {getStatusBadge(ride.status)}
                </td>

                {/* 7. Interactive Rating Actions */}
                <td className="py-4 px-5 align-middle text-right">
                  {!isCancelled && oppositeId && !ratedRides[ride.id] && (
                    <div className="flex justify-end">
                      {ratingTargetId === ride.id ? (
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/80 shadow-sm shrink-0">
                          <select
                            value={ratingValue}
                            onChange={(e) => setRatingValue(parseInt(e.target.value))}
                            className="bg-white text-slate-800 text-[10px] font-bold border border-slate-200 rounded-lg px-1.5 py-0.5 focus:outline-none"
                          >
                            <option value="5">5 ★</option>
                            <option value="4">4 ★</option>
                            <option value="3">3 ★</option>
                            <option value="2">2 ★</option>
                            <option value="1">1 ★</option>
                          </select>
                          <button
                            onClick={() => handleRateUser(oppositeId, ride.id)}
                            className="bg-black hover:bg-slate-800 text-white px-2 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider cursor-pointer"
                          >
                            Submit
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setRatingTargetId(ride.id);
                            setRatingValue(5);
                          }}
                          className="text-amber-500 hover:text-amber-600 font-bold flex items-center gap-1 uppercase text-[9px] tracking-wider bg-slate-50 hover:bg-amber-50 border border-slate-200/60 hover:border-amber-200/60 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                        >
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                          Rate
                        </button>
                      )}
                    </div>
                  )}
                  {ratedRides[ride.id] && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      ★ Rated
                    </span>
                  )}
                  {isCancelled && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      —
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
