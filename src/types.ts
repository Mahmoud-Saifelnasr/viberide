/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'driver' | 'passenger';
export type VehicleType = 'sedan' | 'suv' | 'luxury' | 'electric';
export type RideStatus = 'requested' | 'accepted' | 'ongoing' | 'completed' | 'cancelled';
export type ScheduledTripStatus = 'scheduled' | 'active' | 'completed';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocationDetail {
  address: string;
  lat: number;
  lng: number;
  navigationPointToken?: string;
  navigationPointName?: string;
}

export interface DriverProfile {
  vehicleType: VehicleType;
  vehicleModel: string;
  vehiclePlate: string;
  baseRate: number; // rate per km
  isOnline: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  rating: number;
  ratingCount: number;
  driverProfile?: DriverProfile;
  location?: LatLng;
  createdAt: string;
}

export interface Ride {
  id: string;
  passengerId: string;
  passengerName: string;
  driverId: string | null;
  driverName: string | null;
  pickup: LocationDetail;
  dropoff: LocationDetail;
  distanceKm: number;
  durationMin: number;
  price: number;
  status: RideStatus;
  polyline: string;
  stripePaymentIntentId: string | null;
  paymentStatus: 'unpaid' | 'processing' | 'paid';
  createdAt: string;
  driverVehicle?: {
    vehicleType: VehicleType;
    vehicleModel: string;
    vehiclePlate: string;
  };
  driverLocation?: LatLng;
}

export interface Contact {
  id: string;
  userId: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactRole: UserRole;
  customRate: number | null; // Negotiated rate per km. If null, standard base rate is used
  createdAt: string;
}

export interface Message {
  id: string;
  rideId: string | null;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
}

export interface ScheduledTrip {
  id: string;
  passengerId: string;
  passengerName: string;
  driverId: string;
  driverName: string;
  pickup: LocationDetail;
  dropoff: LocationDetail;
  scheduledTime: string;
  recurring: boolean;
  recurringDays: string[]; // ['Monday', 'Wednesday', etc]
  status: ScheduledTripStatus;
  createdAt: string;
}

export interface DBState {
  users: User[];
  rides: Ride[];
  contacts: Contact[];
  messages: Message[];
  schedules: ScheduledTrip[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LiveUpdatesResponse {
  rides: Ride[];
  messages: Message[];
  activeRide: Ride | null;
  drivers: User[];
  schedules: ScheduledTrip[];
}
