/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Ride, Contact, Message, ScheduledTrip, LocationDetail } from '../types';
import MapContainer from './MapContainer';
import ChatWindow from './ChatWindow';
import X402Checkout from './X402Checkout';
import ActiveRideWidget from './ActiveRideWidget';
import { 
  Search, MapPin, SlidersHorizontal, Star, Car, Users, Calendar, Clock, 
  MessageCircle, CreditCard, ChevronRight, Sparkles, Plus, CheckCircle, Trash2,
  Compass
} from 'lucide-react';
import { motion } from 'motion/react';
import { useDragScroll } from '../hooks/useDragScroll';

interface PassengerDashboardProps {
  currentUser: User;
  authToken: string;
}

// Landmark presets for easy quick matching inside SF
const SF_LANDMARKS = [
  { name: 'Ferry Building', address: 'Ferry Building, San Francisco, CA', lat: 37.7955, lng: -122.3937 },
  { name: 'Golden Gate Park', address: 'Golden Gate Park, San Francisco, CA', lat: 37.7694, lng: -122.4862 },
  { name: 'SF Airport (SFO)', address: 'San Francisco International Airport (SFO)', lat: 37.6213, lng: -122.3790 },
  { name: 'Union Square', address: 'Union Square, San Francisco, CA', lat: 37.7879, lng: -122.4074 },
  { name: 'Fisherman’s Wharf', address: 'Fisherman’s Wharf, San Francisco, CA', lat: 37.8080, lng: -122.4177 },
  { name: 'Coit Tower', address: '1 Telegraph Hill Blvd, San Francisco, CA', lat: 37.8024, lng: -122.4058 },
  { name: 'Lombard Street', address: 'Lombard St (Crooked Street), San Francisco, CA', lat: 37.8021, lng: -122.4187 },
  { name: 'Alamo Square (Painted Ladies)', address: 'Alamo Square Park, San Francisco, CA', lat: 37.7763, lng: -122.4347 },
  { name: 'Golden Gate Bridge (Vista Point)', address: 'Golden Gate Bridge, San Francisco, CA', lat: 37.8199, lng: -122.4783 },
  { name: 'Salesforce Tower', address: '415 Mission St, San Francisco, CA', lat: 37.7897, lng: -122.3972 },
  { name: 'Chase Center', address: '1 Warriors Way, San Francisco, CA', lat: 37.7680, lng: -122.3877 },
  { name: 'Oracle Park', address: '24 Willie Mays Plaza, San Francisco, CA', lat: 37.7786, lng: -122.3893 },
  { name: 'Chinatown (Dragon Gate)', address: 'Bush St & Grant Ave, San Francisco, CA', lat: 37.7907, lng: -122.4056 },
  { name: 'The Castro', address: 'Castro St, San Francisco, CA', lat: 37.7609, lng: -122.4350 },
  { name: 'Mission District (Dolores Park)', address: 'Dolores Park, 19th & Dolores St, San Francisco, CA', lat: 37.7596, lng: -122.4269 },
  { name: 'Presidio of San Francisco', address: 'The Presidio, San Francisco, CA', lat: 37.7989, lng: -122.4662 },
  { name: 'Twin Peaks', address: '501 Twin Peaks Blvd, San Francisco, CA', lat: 37.7544, lng: -122.4477 },
  { name: 'Ghirardelli Square', address: '900 North Point St, San Francisco, CA', lat: 37.8059, lng: -122.4225 },
  { name: 'Embarcadero Center', address: 'Embarcadero, San Francisco, CA', lat: 37.7941, lng: -122.3989 },
  { name: 'Ocean Beach', address: 'Great Hwy, San Francisco, CA', lat: 37.7594, lng: -122.5107 }
];

export default function PassengerDashboard({ currentUser, authToken }: PassengerDashboardProps) {
  const tabsRef = useDragScroll();
  // Tabs: 'ride', 'contacts', 'schedules'
  const [activeTab, setActiveTab] = useState<'ride' | 'contacts' | 'schedules'>('ride');
  
  // Locations State
  const [pickup, setPickup] = useState<LocationDetail | null>(null);
  const [dropoff, setDropoff] = useState<LocationDetail | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Search autocomplete query and results state
  const [pickupQuery, setPickupQuery] = useState('');
  const [dropoffQuery, setDropoffQuery] = useState('');
  const [pickupResults, setPickupResults] = useState<LocationDetail[]>([]);
  const [dropoffResults, setDropoffResults] = useState<LocationDetail[]>([]);
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDropoff, setSearchingDropoff] = useState(false);
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDropoffDropdown, setShowDropoffDropdown] = useState(false);

  // Geocoding Destinations Navigation Points States
  const [pickupNavPoints, setPickupNavPoints] = useState<any[]>([]);
  const [dropoffNavPoints, setDropoffNavPoints] = useState<any[]>([]);


  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        let addressStr = `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'CommutePartner/1.0',
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data && data.display_name) {
              // Extract a concise address string (first 3 parts)
              addressStr = data.display_name.split(',').slice(0, 3).join(',').trim();
            }
          }
        } catch (err) {
          console.error('Error reverse geocoding:', err);
        }

        setPickup({
          address: addressStr,
          lat: latitude,
          lng: longitude
        });
        setDetectingLocation(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        let errorMsg = 'Failed to fetch your GPS coordinates.';
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = 'Location permission was denied. Please allow location access in your browser or iframe frame settings.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = 'GPS signal is currently unavailable.';
        } else if (err.code === err.TIMEOUT) {
          errorMsg = 'GPS scanning timed out.';
        }
        setError(errorMsg);
        setDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  // Sync text inputs with selected location changes (presets, current GPS, or manual)
  useEffect(() => {
    if (pickup) {
      setPickupQuery(pickup.address);
    } else {
      setPickupQuery('');
    }
  }, [pickup]);

  useEffect(() => {
    if (dropoff) {
      setDropoffQuery(dropoff.address);
    } else {
      setDropoffQuery('');
    }
  }, [dropoff]);

  // Debounced search for Pickup Location
  useEffect(() => {
    if (!pickupQuery || (pickup && pickup.address === pickupQuery)) {
      setPickupResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingPickup(true);

      const performOsmAndLocalFallback = async () => {
        // 1. Filter local landmarks
        const localMatches = SF_LANDMARKS.filter(landmark => 
          landmark.name.toLowerCase().includes(pickupQuery.toLowerCase()) ||
          landmark.address.toLowerCase().includes(pickupQuery.toLowerCase())
        ).map(landmark => ({
          address: landmark.name,
          lat: landmark.lat,
          lng: landmark.lng
        }));

        // 2. Query OSM Nominatim globally (no bounding box)
        let remoteMatches: LocationDetail[] = [];
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pickupQuery)}&limit=5`;
          const response = await fetch(url, {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'CommutePartner/1.0'
            }
          });
          if (response.ok) {
            const data = await response.json();
            remoteMatches = data.map((item: any) => ({
              address: item.display_name.split(',').slice(0, 3).join(',').trim(),
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon)
            }));
          }
        } catch (err) {
          console.error('Pickup remote search failed:', err);
        }

        const combined = [...localMatches];
        remoteMatches.forEach(remote => {
          if (!combined.some(c => c.address.toLowerCase() === remote.address.toLowerCase())) {
            combined.push(remote);
          }
        });

        setPickupResults(combined.slice(0, 6));
        setSearchingPickup(false);
      };

      // Try Google Places TextSearch first if SDK is loaded and initialized (globally)
      if (typeof google !== 'undefined' && google.maps && google.maps.places && google.maps.places.Place && typeof google.maps.places.Place.searchByText === 'function') {
        try {
          const request = {
            textQuery: pickupQuery,
            fields: ['displayName', 'formattedAddress', 'location']
          };
          google.maps.places.Place.searchByText(request)
            .then(({ places }) => {
              if (places && places.length > 0) {
                const googleMatches = places.map(place => {
                  const name = place.displayName && typeof place.displayName === 'object'
                    ? (place.displayName as any).text
                    : (place.displayName || '');
                  const lat = typeof place.location?.lat === 'function' ? place.location.lat() : ((place.location as any)?.lat || 37.7749);
                  const lng = typeof place.location?.lng === 'function' ? place.location.lng() : ((place.location as any)?.lng || -122.4194);
                  return {
                    address: place.formattedAddress || name || '',
                    lat,
                    lng
                  };
                });
                setPickupResults(googleMatches.slice(0, 6));
                setSearchingPickup(false);
              } else {
                performOsmAndLocalFallback();
              }
            })
            .catch(err => {
              console.error('Google Places New searchByText failed, falling back:', err);
              performOsmAndLocalFallback();
            });
          return;
        } catch (err) {
          console.error('Google Places New searchByText initiation failed, falling back:', err);
        }
      }

      // If Google is not available or threw an error
      await performOsmAndLocalFallback();
    }, 300);

    return () => clearTimeout(timer);
  }, [pickupQuery]);

  // Debounced search for Dropoff Location
  useEffect(() => {
    if (!dropoffQuery || (dropoff && dropoff.address === dropoffQuery)) {
      setDropoffResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingDropoff(true);

      const performOsmAndLocalFallback = async () => {
        // 1. Filter local landmarks
        const localMatches = SF_LANDMARKS.filter(landmark => 
          landmark.name.toLowerCase().includes(dropoffQuery.toLowerCase()) ||
          landmark.address.toLowerCase().includes(dropoffQuery.toLowerCase())
        ).map(landmark => ({
          address: landmark.name,
          lat: landmark.lat,
          lng: landmark.lng
        }));

        // 2. Query OSM Nominatim globally (no bounding box)
        let remoteMatches: LocationDetail[] = [];
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dropoffQuery)}&limit=5`;
          const response = await fetch(url, {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'CommutePartner/1.0'
            }
          });
          if (response.ok) {
            const data = await response.json();
            remoteMatches = data.map((item: any) => ({
              address: item.display_name.split(',').slice(0, 3).join(',').trim(),
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon)
            }));
          }
        } catch (err) {
          console.error('Dropoff remote search failed:', err);
        }

        const combined = [...localMatches];
        remoteMatches.forEach(remote => {
          if (!combined.some(c => c.address.toLowerCase() === remote.address.toLowerCase())) {
            combined.push(remote);
          }
        });

        setDropoffResults(combined.slice(0, 6));
        setSearchingDropoff(false);
      };

      // Try Google Places TextSearch first if SDK is loaded and initialized (globally)
      if (typeof google !== 'undefined' && google.maps && google.maps.places && google.maps.places.Place && typeof google.maps.places.Place.searchByText === 'function') {
        try {
          const request = {
            textQuery: dropoffQuery,
            fields: ['displayName', 'formattedAddress', 'location']
          };
          google.maps.places.Place.searchByText(request)
            .then(({ places }) => {
              if (places && places.length > 0) {
                const googleMatches = places.map(place => {
                  const name = place.displayName && typeof place.displayName === 'object'
                    ? (place.displayName as any).text
                    : (place.displayName || '');
                  const lat = typeof place.location?.lat === 'function' ? place.location.lat() : ((place.location as any)?.lat || 37.7749);
                  const lng = typeof place.location?.lng === 'function' ? place.location.lng() : ((place.location as any)?.lng || -122.4194);
                  return {
                    address: place.formattedAddress || name || '',
                    lat,
                    lng
                  };
                });
                setDropoffResults(googleMatches.slice(0, 6));
                setSearchingDropoff(false);
              } else {
                performOsmAndLocalFallback();
              }
            })
            .catch(err => {
              console.error('Google Places New searchByText failed, falling back:', err);
              performOsmAndLocalFallback();
            });
          return;
        } catch (err) {
          console.error('Google Places New searchByText initiation failed, falling back:', err);
        }
      }

      // If Google is not available or threw an error
      await performOsmAndLocalFallback();
    }, 300);

    return () => clearTimeout(timer);
  }, [dropoffQuery]);

  // Fetch navigation points for Pickup
  useEffect(() => {
    if (!pickup) {
      setPickupNavPoints([]);
      return;
    }
    // If the selected pickup already has a navigation point token, do not re-fetch/reset
    if (pickup.navigationPointToken) {
      return;
    }

    const fetchNavPoints = async () => {
      try {
        const response = await fetch('/api/destinations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            address: pickup.address,
            lat: pickup.lat,
            lng: pickup.lng
          })
        });
        if (response.ok) {
          const data = await response.json();
          const navPoints = data.destinations?.[0]?.navigationPoints || [];
          setPickupNavPoints(navPoints);
          if (navPoints.length > 0) {
            // Use the first navigation point by default
            const defaultPoint = navPoints[0];
            setPickup({
              ...pickup,
              lat: defaultPoint.location.lat,
              lng: defaultPoint.location.lng,
              navigationPointToken: defaultPoint.navigationPointToken,
              navigationPointName: defaultPoint.displayName
            });
          }
        }
      } catch (err) {
        console.error('Error fetching pickup navigation points:', err);
      }
    };

    fetchNavPoints();
  }, [pickup?.address, pickup?.lat, pickup?.lng]);

  // Fetch navigation points for Dropoff
  useEffect(() => {
    if (!dropoff) {
      setDropoffNavPoints([]);
      return;
    }
    // If the selected dropoff already has a navigation point token, do not re-fetch/reset
    if (dropoff.navigationPointToken) {
      return;
    }

    const fetchNavPoints = async () => {
      try {
        const response = await fetch('/api/destinations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            address: dropoff.address,
            lat: dropoff.lat,
            lng: dropoff.lng
          })
        });
        if (response.ok) {
          const data = await response.json();
          const navPoints = data.destinations?.[0]?.navigationPoints || [];
          setDropoffNavPoints(navPoints);
          if (navPoints.length > 0) {
            // Use the first navigation point by default
            const defaultPoint = navPoints[0];
            setDropoff({
              ...dropoff,
              lat: defaultPoint.location.lat,
              lng: defaultPoint.location.lng,
              navigationPointToken: defaultPoint.navigationPointToken,
              navigationPointName: defaultPoint.displayName
            });
          }
        }
      } catch (err) {
        console.error('Error fetching dropoff navigation points:', err);
      }
    };

    fetchNavPoints();
  }, [dropoff?.address, dropoff?.lat, dropoff?.lng]);
  
  // Realtime lists
  const [drivers, setDrivers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [schedules, setSchedules] = useState<ScheduledTrip[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  
  // Filtering driver list states
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [maxPriceRate, setMaxPriceRate] = useState<number>(5.0);
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);

  // New Contact / Schedule form states
  const [contactEmail, setContactEmail] = useState('');
  const [contactCustomRate, setContactCustomRate] = useState('');
  const [schedTime, setSchedTime] = useState('09:00');
  const [schedRecurring, setSchedRecurring] = useState(false);
  const [schedDays, setSchedDays] = useState<string[]>([]);
  const [schedDriverId, setSchedDriverId] = useState('');

  // UI status flags
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchUpdates = async () => {
    try {
      const res = await fetch('/api/updates', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
        setActiveRide(data.activeRide || null);
        setSchedules(data.schedules || []);
      }
    } catch (err) {
      console.warn('Error fetching dashboard delta updates:', err);
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
      console.warn('Error fetching contacts list:', err);
    }
  };

  // Poll for drivers/active ride, fetch contacts on load
  useEffect(() => {
    fetchUpdates();
    fetchContacts();
    const interval = setInterval(fetchUpdates, 3500);
    return () => clearInterval(interval);
  }, []);

  const calculateDistance = (p1: LocationDetail, p2: LocationDetail) => {
    // Haversine approx
    const R = 6371; // km
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getRideMetrics = () => {
    if (!pickup || !dropoff) return { distance: 0, duration: 0 };
    const dist = calculateDistance(pickup, dropoff);
    const duration = dist * 2; // Approx 2 mins per km
    return {
      distance: dist,
      duration: duration
    };
  };

  const getPriceForDriver = (driver: User) => {
    const { distance } = getRideMetrics();
    // Check if driver is contact and has custom rate
    const contactRel = contacts.find(c => c.contactId === driver.id);
    const rate = (contactRel && contactRel.customRate !== null)
      ? contactRel.customRate 
      : (driver.driverProfile?.baseRate || 2.0);
    return distance * rate;
  };

  // Filtered drivers based on inputs
  const filteredDrivers = drivers.filter(driver => {
    if (!driver.driverProfile) return false;
    
    // Vehicle type
    if (selectedVehicleType !== 'all' && driver.driverProfile.vehicleType !== selectedVehicleType) return false;
    
    // Rating filter
    if (driver.rating < minRating) return false;
    
    // Custom price calculation per km comparison
    const contactRel = contacts.find(c => c.contactId === driver.id);
    const rate = (contactRel && contactRel.customRate !== null) ? contactRel.customRate : driver.driverProfile.baseRate;
    if (rate > maxPriceRate) return false;

    return true;
  });

  const handlePresetSelect = (type: 'pickup' | 'dropoff', landmark: any) => {
    const detail: LocationDetail = {
      address: landmark.name,
      lat: landmark.lat,
      lng: landmark.lng
    };
    if (type === 'pickup') setPickup(detail);
    if (type === 'dropoff') setDropoff(detail);
  };

  const handleRequestRide = async () => {
    if (!pickup || !dropoff || !selectedDriver) {
      setError('Please select pickup, dropoff and driver before requesting.');
      return;
    }

    setError('');
    const { distance, duration } = getRideMetrics();
    const isOpenDispatch = selectedDriver.id === 'open-dispatch';
    const price = isOpenDispatch ? distance * 2.0 : getPriceForDriver(selectedDriver);

    const payload = {
      pickup,
      dropoff,
      distanceKm: distance,
      durationMin: duration,
      price: price,
      driverId: isOpenDispatch ? null : selectedDriver.id
    };

    try {
      const res = await fetch('/api/rides/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setActiveRide(data);
        // Reset local selection states
        setPickup(null);
        setDropoff(null);
        setSelectedDriver(null);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to file ride request.');
      }
    } catch (err) {
      console.error(err);
      setError('Network communication failed.');
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Find user by email in drivers list or server search
      const res = await fetch('/api/auth/register'); // Check standard list or submit directly
      // Post relationship
      const addRes = await fetch('/api/contacts/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          contactId: contactEmail, // Can accept driver user ID or email on back end (we query ID in server.ts)
          customRate: contactCustomRate ? parseFloat(contactCustomRate) : null
        })
      });

      const data = await addRes.json();
      if (addRes.ok) {
        fetchContacts();
        setContactEmail('');
        setContactCustomRate('');
        alert('Driver added to contacts database successfully!');
      } else {
        setError(data.error || 'Failed to associate contact.');
      }
    } catch (err) {
      setError('Error creating contact relation.');
    }
  };

  const handleScheduleTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff || !schedDriverId) {
      alert('Please specify pickup, dropoff locations and select a driver.');
      return;
    }

    const payload = {
      driverId: schedDriverId,
      pickup,
      dropoff,
      scheduledTime: schedTime,
      recurring: schedRecurring,
      recurringDays: schedDays
    };

    try {
      const res = await fetch('/api/schedules/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchUpdates();
        setSchedDriverId('');
        setPickup(null);
        setDropoff(null);
        alert('Commute trip scheduled successfully!');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create schedule.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelSchedule = async (id: string) => {
    if (!confirm('Cancel this scheduled trip?')) return;
    try {
      const res = await fetch(`/api/schedules/${id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        fetchUpdates();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelActiveRide = async () => {
    if (!activeRide) return;

    try {
      const res = await fetch(`/api/rides/${activeRide.id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        setActiveRide(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleDay = (day: string) => {
    setSchedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sidebar: Config panels and forms */}
      <div className="lg:col-span-5 space-y-6">
        {/* Navigation Tabs - Bento pill wrapper */}
        <div ref={tabsRef} className="flex bg-slate-200/60 border border-slate-300/40 p-1 rounded-2xl overflow-x-auto scrollbar-none whitespace-nowrap select-none max-w-full">
          <button
            onClick={() => setActiveTab('ride')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'ride' 
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Car className="w-4 h-4" />
            Ride Booking
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
            Social Partners
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

        {activeTab === 'ride' && (
          <>
            {/* Active Ride HUD Tracker */}
            {activeRide ? (
              <ActiveRideWidget
                activeRide={activeRide}
                currentUser={currentUser}
                authToken={authToken}
                fetchUpdates={fetchUpdates}
                onCancelRide={handleCancelActiveRide}
                onContactAdded={fetchContacts}
                childrenX402Checkout={
                  <X402Checkout
                    amount={activeRide.price}
                    rideId={activeRide.id}
                    authToken={authToken}
                    onPaymentSuccess={fetchUpdates}
                  />
                }
              />
            ) : (
              /* Core Address Input & Driver Filters */
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                    <MapPin className="w-4 h-4 text-slate-800" />
                    Request a New Ride
                  </h3>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                    GPS SCANNING
                  </span>
                </div>

                {error && <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100 font-medium">{error}</p>}

                 {/* Active Selections Summary Panel */}
                 {(pickup || dropoff) && (
                   <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3.5 text-xs">
                     <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Trip Details</h4>
                     <div className="space-y-3 font-sans">
                       {pickup && (
                         <div className="flex items-start gap-2.5">
                           <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-black shrink-0 mt-0.5">A</span>
                           <div className="flex-1 min-w-0">
                             <span className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider block">Pickup Point</span>
                             <span className="text-slate-600 leading-normal font-medium block truncate" title={pickup.address}>{pickup.address}</span>
                             
                             {/* Navigation Points Selector */}
                             {pickupNavPoints.length > 0 && (
                               <div className="mt-2 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm space-y-1.5 max-w-full">
                                 <span className="text-[9px] font-bold uppercase text-indigo-500 tracking-wider block">📍 Precise Pickup Entrances (Destinations API)</span>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                   {pickupNavPoints.map((point) => {
                                     const isSelected = pickup.navigationPointToken === point.navigationPointToken;
                                     return (
                                       <button
                                         key={point.navigationPointToken}
                                         type="button"
                                         onClick={() => {
                                           setPickup({
                                             ...pickup,
                                             lat: point.location.lat,
                                             lng: point.location.lng,
                                             navigationPointToken: point.navigationPointToken,
                                             navigationPointName: point.displayName
                                           });
                                         }}
                                         className={`text-left px-2.5 py-1.5 rounded-lg text-[10px] transition-all flex items-center justify-between border cursor-pointer ${
                                           isSelected
                                             ? 'bg-indigo-50/70 border-indigo-200 text-indigo-700 font-bold'
                                             : 'bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-600'
                                         }`}
                                       >
                                         <span className="truncate pr-1">{point.displayName}</span>
                                         {isSelected && <span className="text-[8px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-black shrink-0">ACTIVE</span>}
                                       </button>
                                     );
                                   })}
                                 </div>
                               </div>
                             )}
                           </div>
                         </div>
                       )}
                       {dropoff && (
                         <div className="flex items-start gap-2.5">
                           <span className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[8px] font-black shrink-0 mt-0.5">B</span>
                           <div className="flex-1 min-w-0">
                             <span className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider block">Dropoff Destination</span>
                             <span className="text-slate-600 leading-normal font-medium block truncate" title={dropoff.address}>{dropoff.address}</span>
                             
                             {/* Navigation Points Selector */}
                             {dropoffNavPoints.length > 0 && (
                               <div className="mt-2 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm space-y-1.5 max-w-full">
                                 <span className="text-[9px] font-bold uppercase text-indigo-500 tracking-wider block">📍 Precise Arrival Entrances (Destinations API)</span>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                   {dropoffNavPoints.map((point) => {
                                     const isSelected = dropoff.navigationPointToken === point.navigationPointToken;
                                     return (
                                       <button
                                         key={point.navigationPointToken}
                                         type="button"
                                         onClick={() => {
                                           setDropoff({
                                             ...dropoff,
                                             lat: point.location.lat,
                                             lng: point.location.lng,
                                             navigationPointToken: point.navigationPointToken,
                                             navigationPointName: point.displayName
                                           });
                                         }}
                                         className={`text-left px-2.5 py-1.5 rounded-lg text-[10px] transition-all flex items-center justify-between border cursor-pointer ${
                                           isSelected
                                             ? 'bg-indigo-50/70 border-indigo-200 text-indigo-700 font-bold'
                                             : 'bg-slate-50 hover:bg-slate-100 border-slate-100 text-slate-600'
                                         }`}
                                       >
                                         <span className="truncate pr-1">{point.displayName}</span>
                                         {isSelected && <span className="text-[8px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-black shrink-0">ACTIVE</span>}
                                       </button>
                                     );
                                   })}
                                 </div>
                               </div>
                             )}
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                 )}
                                {/* Searchable Inputs with Autocomplete Dropdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  {/* Pickup Search Input */}
                  <div className="relative">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span>Pickup Location</span>
                      </label>
                      
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={detectingLocation}
                        className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg transition-all cursor-pointer disabled:opacity-50 border border-indigo-100"
                      >
                        {detectingLocation ? (
                          <>
                            <span className="w-1 h-1 rounded-full bg-indigo-600 animate-ping" />
                            <span>Locating...</span>
                          </>
                        ) : (
                          <>
                            <Compass className="w-3 h-3 text-indigo-500 animate-pulse" />
                            <span>GPS Current Location</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={pickupQuery}
                        onChange={(e) => {
                          setPickupQuery(e.target.value);
                          setShowPickupDropdown(true);
                        }}
                        onFocus={() => setShowPickupDropdown(true)}
                        placeholder="Type address or landmarks..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl pl-9 pr-8 py-3 text-xs text-slate-800 font-medium transition-all focus:outline-none placeholder-slate-400 shadow-sm"
                      />
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                      {searchingPickup ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
                        </div>
                      ) : pickupQuery ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPickup(null);
                            setPickupQuery('');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      ) : null}
                    </div>

                    {/* Pickup Autocomplete Results */}
                    {showPickupDropdown && pickupQuery && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setShowPickupDropdown(false)} 
                        />
                        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto z-20 divide-y divide-slate-100 py-1">
                          {pickupResults.length > 0 ? (
                            pickupResults.map((result, idx) => (
                              <button
                                key={`pickup-res-${idx}`}
                                type="button"
                                onClick={() => {
                                  setPickup(result);
                                  setShowPickupDropdown(false);
                                }}
                                className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-start gap-2 transition-all cursor-pointer"
                              >
                                <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-semibold text-slate-800 leading-tight">{result.address}</p>
                                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                    {result.lat != null ? result.lat.toFixed(4) : '0.0000'}, {result.lng != null ? result.lng.toFixed(4) : '0.0000'}
                                  </p>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3.5 py-4 text-xs text-slate-500 italic text-center">
                              No matches. Keep typing to search San Francisco...
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Dropoff Search Input */}
                  <div className="relative">
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        <span>Dropoff / Destination</span>
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={dropoffQuery}
                        onChange={(e) => {
                          setDropoffQuery(e.target.value);
                          setShowDropoffDropdown(true);
                        }}
                        onFocus={() => setShowDropoffDropdown(true)}
                        placeholder="Type destination, hotel, park..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-2xl pl-9 pr-8 py-3 text-xs text-slate-800 font-medium transition-all focus:outline-none placeholder-slate-400 shadow-sm"
                      />
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500" />
                      {searchingDropoff ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin" />
                        </div>
                      ) : dropoffQuery ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDropoff(null);
                            setDropoffQuery('');
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      ) : null}
                    </div>

                    {/* Dropoff Autocomplete Results */}
                    {showDropoffDropdown && dropoffQuery && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setShowDropoffDropdown(false)} 
                        />
                        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto z-20 divide-y divide-slate-100 py-1">
                          {dropoffResults.length > 0 ? (
                            dropoffResults.map((result, idx) => (
                              <button
                                key={`dropoff-res-${idx}`}
                                type="button"
                                onClick={() => {
                                  setDropoff(result);
                                  setShowDropoffDropdown(false);
                                }}
                                className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-start gap-2 transition-all cursor-pointer"
                              >
                                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-semibold text-slate-800 leading-tight">{result.address}</p>
                                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                    {result.lat != null ? result.lat.toFixed(4) : '0.0000'}, {result.lng != null ? result.lng.toFixed(4) : '0.0000'}
                                  </p>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3.5 py-4 text-xs text-slate-500 italic text-center">
                              No matches. Keep typing to search San Francisco...
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Popular Location Presets */}
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Quick Presets Shortcut</span>
                  
                  <div className="grid grid-cols-2 gap-4 text-[11px]">
                    <div>
                      <span className="font-extrabold text-slate-500 block mb-1.5">Pickup</span>
                      <div className="flex flex-wrap gap-1">
                        {SF_LANDMARKS.slice(0, 5).map(landmark => (
                          <button
                            key={`pickup-preset-${landmark.name}`}
                            onClick={() => handlePresetSelect('pickup', landmark)}
                            className={`px-2 py-1 rounded-lg border transition-all cursor-pointer font-semibold text-[10px] ${
                              pickup?.address === landmark.name
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            {landmark.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="font-extrabold text-slate-500 block mb-1.5">Dropoff</span>
                      <div className="flex flex-wrap gap-1">
                        {SF_LANDMARKS.slice(0, 5).map(landmark => (
                          <button
                            key={`dropoff-preset-${landmark.name}`}
                            onClick={() => handlePresetSelect('dropoff', landmark)}
                            className={`px-2 py-1 rounded-lg border transition-all cursor-pointer font-semibold text-[10px] ${
                              dropoff?.address === landmark.name
                                ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            {landmark.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Driver Filters */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-display">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                      Filter Nearby Drivers
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{filteredDrivers.length} nearby</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Vehicle Type</label>
                      <select
                        value={selectedVehicleType}
                        onChange={(e) => setSelectedVehicleType(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-300 mt-1"
                      >
                        <option value="all">All types</option>
                        <option value="sedan">Sedan</option>
                        <option value="suv">SUV</option>
                        <option value="luxury">Luxury</option>
                        <option value="electric">Electric</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Max rate per km</label>
                      <select
                        value={maxPriceRate}
                        onChange={(e) => setMaxPriceRate(parseFloat(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-slate-300 mt-1"
                      >
                        <option value="5.0">Any price</option>
                        <option value="3.5">$3.50 max</option>
                        <option value="2.5">$2.50 max</option>
                        <option value="2.0">$2.00 max</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Drivers list comparison */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {/* Open Dispatch broadcast option */}
                  <div
                    onClick={() => setSelectedDriver({ id: 'open-dispatch', name: 'Open Dispatch' } as any)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      selectedDriver?.id === 'open-dispatch'
                        ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                        : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                        📢
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Broadcast (Open Dispatch)</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Any online driver can see and accept</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {pickup && dropoff ? (
                        <>
                          <p className="text-xs font-black text-emerald-600">${(getRideMetrics().distance * 2.0).toFixed(2)}</p>
                          <p className="text-[8px] text-slate-450 font-bold uppercase tracking-wider mt-0.5">Standard $2.00/km</p>
                        </>
                      ) : (
                        <p className="text-xs font-bold text-slate-700">$2.00/km</p>
                      )}
                    </div>
                  </div>

                  {filteredDrivers.map(driver => {
                    const isSelected = selectedDriver?.id === driver.id;
                    const contactRel = contacts.find(c => c.contactId === driver.id);
                    const isContact = !!contactRel;
                    const hasCustomRate = isContact && contactRel.customRate !== null;

                    return (
                      <div
                        key={driver.id}
                        onClick={() => setSelectedDriver(driver)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-500 shadow-sm'
                            : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shadow-sm shrink-0">
                            {driver.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-900">{driver.name}</p>
                              {isContact && (
                                <span className="bg-emerald-50 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                                  Contact
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-medium">
                              <span className="capitalize">{driver.driverProfile?.vehicleType}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-amber-500">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                {(driver.rating ?? 5.0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          {pickup && dropoff ? (
                            <>
                              <p className="text-xs font-black text-slate-900">${(getPriceForDriver(driver) ?? 0).toFixed(2)}</p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                {hasCustomRate ? 'Negotiated rate' : `rate: $${driver.driverProfile?.baseRate}/km`}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs font-bold text-slate-700">
                              {hasCustomRate ? `$${contactRel.customRate}/km` : `$${driver.driverProfile?.baseRate}/km`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredDrivers.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs font-medium">No online drivers fit these criteria.</div>
                  )}
                </div>

                <button
                  onClick={handleRequestRide}
                  disabled={!pickup || !dropoff || !selectedDriver}
                  className="w-full bg-black hover:bg-slate-800 text-white rounded-2xl py-4 font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-30 cursor-pointer text-sm shadow-md shadow-slate-900/10"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Request Ride with {selectedDriver ? selectedDriver.name : 'Selected Driver'}
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'contacts' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                <Users className="w-4 h-4 text-indigo-600" />
                My Frequent Ride Partners
              </h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">Establish permanent discounted rates with loyal drivers</p>
            </div>

            {/* Quick add mutual contact */}
            <form onSubmit={handleAddContact} className="space-y-3 bg-slate-50 p-4 border border-slate-150 rounded-2xl">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">Link Frequent Driver</h4>
              
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Driver Partner</label>
                  <select
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs focus:outline-none focus:border-slate-300"
                  >
                    <option value="">Select a driver...</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.email})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Negotiated Custom Rate ($/km)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    placeholder="e.g. 2.10"
                    value={contactCustomRate}
                    onChange={(e) => setContactCustomRate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs placeholder-slate-400 focus:outline-none focus:border-slate-300"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-black text-white rounded-xl py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-1"
              >
                <Plus className="w-4 h-4" />
                Add to Contacts Sheet
              </button>
            </form>

            {/* Contacts Directory List */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-extrabold text-slate-900 font-display">My Contacts Sheet</h4>
              <div className="space-y-2">
                {contacts.map(c => (
                  <div key={c.id} className="bg-slate-50 p-4 border border-slate-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{c.contactName}</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{c.contactEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {c.customRate ? `$${c.customRate.toFixed(2)}/km` : 'Standard Rate'}
                      </p>
                      <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider mt-1">Custom Pricing</span>
                    </div>
                  </div>
                ))}
                {contacts.length === 0 && (
                  <p className="text-center py-6 text-slate-400 text-xs font-medium">No social contact relationships found yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Schedule Future Commutes
              </h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5">Automated repeat schedules booked with frequent drivers</p>
            </div>

            {/* Form */}
            <form onSubmit={handleScheduleTrip} className="space-y-4 bg-slate-50 p-4 border border-slate-100 rounded-2xl text-xs space-y-3.5">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Assigned Commute Driver</label>
                <select
                  required
                  value={schedDriverId}
                  onChange={(e) => setSchedDriverId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-300"
                >
                  <option value="">Select driver partner...</option>
                  {contacts.filter(c => c.contactRole === 'driver').map(c => (
                    <option key={c.contactId} value={c.contactId}>{c.contactName}</option>
                  ))}
                </select>
              </div>

              {/* Quick Pick pickup/dropoff */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Departure Landmark</label>
                  <select
                    onChange={(e) => {
                      const l = SF_LANDMARKS.find(lm => lm.name === e.target.value);
                      if (l) setPickup(l);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-300"
                  >
                    <option value="">Select pickup...</option>
                    {SF_LANDMARKS.map(lm => <option key={`lm-p-${lm.name}`} value={lm.name}>{lm.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Arrival Landmark</label>
                  <select
                    onChange={(e) => {
                      const l = SF_LANDMARKS.find(lm => lm.name === e.target.value);
                      if (l) setDropoff(l);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-300"
                  >
                    <option value="">Select dropoff...</option>
                    {SF_LANDMARKS.map(lm => <option key={`lm-d-${lm.name}`} value={lm.name}>{lm.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Commute Time</label>
                  <input
                    type="time"
                    required
                    value={schedTime}
                    onChange={(e) => setSchedTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-300 font-bold"
                  />
                </div>
                <div className="flex items-center gap-2 pt-4 pl-1">
                  <input
                    type="checkbox"
                    id="sched-recurring"
                    checked={schedRecurring}
                    onChange={(e) => setSchedRecurring(e.target.checked)}
                    className="rounded text-black focus:ring-black w-4 h-4 bg-white border-slate-300"
                  />
                  <label htmlFor="sched-recurring" className="text-slate-700 font-bold cursor-pointer select-none">Recurring Trip</label>
                </div>
              </div>

              {schedRecurring && (
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Repeat Days</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                      const active = schedDays.includes(day);
                      return (
                        <button
                          type="button"
                          key={`day-${day}`}
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-1.5 rounded-xl font-bold border text-[10px] transition-all cursor-pointer ${
                            active 
                              ? 'bg-black text-white border-black shadow-sm' 
                              : 'bg-white text-slate-500 border-slate-250 hover:bg-slate-100 hover:text-slate-800'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-slate-950 hover:bg-black text-white rounded-xl py-3 font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Calendar className="w-4 h-4" />
                Schedule Trip
              </button>
            </form>

            {/* List of schedules */}
            <div className="space-y-3.5 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-extrabold text-slate-900 font-display">My Scheduled Commutes</h4>
              {schedules.map(s => (
                <div key={s.id} className="bg-slate-50 p-4 border border-slate-100 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{s.driverName}</p>
                      <p className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        {s.scheduledTime} {s.recurring ? `• Recurring (${s.recurringDays.join(', ')})` : '• One-time'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancelSchedule(s.id)}
                      className="text-slate-400 hover:text-rose-500 p-1.5 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500 space-y-1 bg-white p-3 rounded-xl border border-slate-150">
                    <p className="truncate"><strong className="text-slate-700">From:</strong> {s.pickup.address}</p>
                    <p className="truncate"><strong className="text-slate-700">To:</strong> {s.dropoff.address}</p>
                  </div>
                </div>
              ))}
              {schedules.length === 0 && (
                <p className="text-center py-6 text-slate-400 text-xs font-medium">No scheduled trips scheduled.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Map section on right */}
      <div className="lg:col-span-7 h-[650px] lg:h-[750px]">
        <MapContainer
          pickup={pickup}
          dropoff={dropoff}
          drivers={drivers}
          activeRide={activeRide}
          role="passenger"
          onLocationSelect={(type, details) => {
            if (type === 'pickup') setPickup(details);
            if (type === 'dropoff') setDropoff(details);
          }}
        />
      </div>
    </div>
  );
}
