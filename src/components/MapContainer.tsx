/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { LatLng, LocationDetail } from '../types';
import { MapPin, Navigation, Info, Settings, Compass, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#020617' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f172a' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#312e81' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#4338ca' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#e0e7ff' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#020617' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] }
];

interface MapContainerProps {
  pickup: LocationDetail | null;
  dropoff: LocationDetail | null;
  drivers: any[];
  activeRide: any | null;
  role: 'driver' | 'passenger';
  onLocationSelect?: (type: 'pickup' | 'dropoff', detail: LocationDetail) => void;
  pendingRides?: any[];
  onAcceptRide?: (rideId: string) => void;
}

// Inner Google Maps route & polyline logic using our robust pre-computed routeCoords
function RouteRenderer({
  routeCoords,
  strokeColor = '#4f46e5', // Beautiful brand Indigo-600
  strokeOpacity = 0.9,
  strokeWeight = 6,
  strokePattern,
}: {
  routeCoords: LatLng[];
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  strokePattern?: 'solid' | 'dashed';
}) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || routeCoords.length < 2) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    const options: google.maps.PolylineOptions = {
      path: routeCoords,
      geodesic: true,
      strokeColor,
      strokeOpacity,
      strokeWeight,
      map,
    };

    if (strokePattern === 'dashed') {
      options.strokeOpacity = 0;
      options.icons = [{
        icon: {
          path: 'M 0,-1 0,1',
          strokeOpacity: strokeOpacity,
          scale: 3,
          strokeColor,
        },
        offset: '0',
        repeat: '20px'
      }];
    }

    if (polylineRef.current) {
      polylineRef.current.setOptions(options);
    } else {
      polylineRef.current = new google.maps.Polyline(options);
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, routeCoords, strokeColor, strokeOpacity, strokeWeight, strokePattern]);

  return null;
}

// Inner Google Maps auto-recentering & bounding box fit synchronizer
function MapSynchronizer({
  pickup,
  dropoff,
  activeRide,
  routeCoords,
  driverRouteCoords,
}: {
  pickup: LocationDetail | null;
  dropoff: LocationDetail | null;
  activeRide: any | null;
  routeCoords: LatLng[];
  driverRouteCoords: LatLng[];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Collect all coordinates to frame (main route + driver tracking coords)
    const boundsPoints: google.maps.LatLngLiteral[] = [];

    routeCoords.forEach(p => boundsPoints.push({ lat: p.lat, lng: p.lng }));
    driverRouteCoords.forEach(p => boundsPoints.push({ lat: p.lat, lng: p.lng }));

    if (activeRide && (activeRide.status === 'accepted' || activeRide.status === 'ongoing') && activeRide.driverLocation) {
      boundsPoints.push({ lat: activeRide.driverLocation.lat, lng: activeRide.driverLocation.lng });
    }

    if (boundsPoints.length >= 2) {
      if (typeof google !== 'undefined' && google.maps) {
        const bounds = new google.maps.LatLngBounds();
        boundsPoints.forEach(p => bounds.extend(p));
        map.fitBounds(bounds, 80);
      }
    } else {
      // Fallback
      const points: google.maps.LatLngLiteral[] = [];
      if (pickup) points.push({ lat: pickup.lat, lng: pickup.lng });
      if (dropoff) points.push({ lat: dropoff.lat, lng: dropoff.lng });

      if (points.length >= 2) {
        if (typeof google !== 'undefined' && google.maps) {
          const bounds = new google.maps.LatLngBounds();
          points.forEach(p => bounds.extend(p));
          map.fitBounds(bounds, 80);
        }
      } else if (points.length === 1) {
        map.panTo(points[0]);
        map.setZoom(14);
      }
    }
  }, [map, routeCoords, driverRouteCoords, pickup, dropoff, activeRide?.status, activeRide?.driverLocation?.lat, activeRide?.driverLocation?.lng]);

  return null;
}

// Leaflet Map fallback component utilizing free, open-source OpenStreetMap tiles
function LeafletMap({
  pickup,
  dropoff,
  drivers,
  activeRide,
  routeCoords,
  driverRouteCoords,
  pendingRides,
  onLocationSelect,
  onAcceptRide,
  isDarkMode,
}: {
  pickup: LocationDetail | null;
  dropoff: LocationDetail | null;
  drivers: any[];
  activeRide: any | null;
  routeCoords: LatLng[];
  driverRouteCoords: LatLng[];
  pendingRides?: any[];
  onLocationSelect?: (type: 'pickup' | 'dropoff', detail: LocationDetail) => void;
  onAcceptRide?: (rideId: string) => void;
  isDarkMode: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polyRef1 = useRef<any>(null);
  const polyRef2 = useRef<any>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined' || !(window as any).L) return;
    const L = (window as any).L;

    const center = pickup ? [pickup.lat, pickup.lng] : [37.7895, -122.4014];
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(center, 13);

    L.control.zoom({ position: 'topright' }).addTo(map);

    const tileUrl = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      maxZoom: 19,
    }).addTo(map);

    map.on('click', (e: any) => {
      if (onLocationSelect) {
        const { lat, lng } = e.latlng;
        const fallbackAddress = `SF Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'CommutePartner/1.0',
          },
        })
          .then((r) => r.json())
          .then((data) => {
            const address = data.display_name
              ? data.display_name.split(',').slice(0, 3).join(',').trim()
              : fallbackAddress;

            if (!pickup) {
              onLocationSelect('pickup', { address, lat, lng });
            } else if (!dropoff) {
              onLocationSelect('dropoff', { address, lat, lng });
            }
          })
          .catch(() => {
            if (!pickup) {
              onLocationSelect('pickup', { address: fallbackAddress, lat, lng });
            } else if (!dropoff) {
              onLocationSelect('dropoff', { address: fallbackAddress, lat, lng });
            }
          });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [isDarkMode]);

  // Synchronize Markers & Polylines
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !(window as any).L) return;
    const L = (window as any).L;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const fitCoords: any[] = [];

    // Pickup Marker
    if (pickup) {
      const pickupIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="background-color: #10b981; color: white; font-weight: bold; font-size: 10px; width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.25);">UP</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const marker = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon, title: 'Pickup' }).addTo(map);
      markersRef.current.push(marker);
      fitCoords.push([pickup.lat, pickup.lng]);
    }

    // Dropoff Marker
    if (dropoff) {
      const dropoffIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="background-color: #f43f5e; color: white; font-weight: bold; font-size: 10px; width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.25);">OFF</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const marker = L.marker([dropoff.lat, dropoff.lng], { icon: dropoffIcon, title: 'Dropoff' }).addTo(map);
      markersRef.current.push(marker);
      fitCoords.push([dropoff.lat, dropoff.lng]);
    }

    // Active Driver Marker
    if (activeRide && (activeRide.status === 'accepted' || activeRide.status === 'ongoing') && activeRide.driverLocation) {
      const dLoc = activeRide.driverLocation;
      const driverIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="position: absolute; bottom: 35px; background-color: #059669; color: white; font-weight: bold; font-size: 9px; padding: 3px 8px; border-radius: 8px; border: 1px solid #10b981; white-space: nowrap; box-shadow: 0 4px 6px rgba(0,0,0,0.15);">🚕 ${activeRide.status === 'accepted' ? 'En Route' : 'Ongoing'}</div>
            <div style="background-color: #10b981; color: white; font-size: 16px; width: 34px; height: 34px; border-radius: 50%; border: 2.5px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">🚕</div>
          </div>
        `,
        iconSize: [34, 50],
        iconAnchor: [17, 34],
      });
      const marker = L.marker([dLoc.lat, dLoc.lng], { icon: driverIcon, title: 'Driver' }).addTo(map);
      markersRef.current.push(marker);
      fitCoords.push([dLoc.lat, dLoc.lng]);
    }

    // Other Drivers Markers
    drivers
      .filter((d) => !activeRide || d.id !== activeRide.driverId)
      .forEach((driver) => {
        if (!driver.location) return;
        const driverIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `<div style="background-color: #4f46e5; color: white; font-size: 14px; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 6px rgba(0,0,0,0.25);">🚕</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        const marker = L.marker([driver.location.lat, driver.location.lng], { icon: driverIcon, title: driver.name }).addTo(map);
        markersRef.current.push(marker);
      });

    // Pending Rides Markers (Pickup opportunities)
    pendingRides?.forEach((ride) => {
      if (!ride.pickup) return;
      const rideIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="background-color: #10b981; border: 2px solid white; color: white; font-weight: 900; font-size: 10px; padding: 4px 8px; border-radius: 9999px; box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px; cursor: pointer; white-space: nowrap;">
            <span>📢</span>
            <span>$${(ride.price ?? 0).toFixed(2)}</span>
          </div>
        `,
        iconSize: [60, 24],
        iconAnchor: [30, 12],
      });
      const marker = L.marker([ride.pickup.lat, ride.pickup.lng], { icon: rideIcon }).addTo(map);

      marker.on('click', () => {
        if (onAcceptRide) {
          const confirmAccept = window.confirm(
            `Accept ride request from ${ride.passengerName}?\n\nFrom: ${ride.pickup.address}\nTo: ${ride.dropoff.address}\nDistance: ${(ride.distanceKm ?? 0).toFixed(1)} km\nFare: $${(ride.price ?? 0).toFixed(2)}`
          );
          if (confirmAccept) {
            onAcceptRide(ride.id);
          }
        }
      });

      markersRef.current.push(marker);
    });

    // Clear old polylines
    if (polyRef1.current) polyRef1.current.remove();
    if (polyRef2.current) polyRef2.current.remove();

    // Redraw polyline for main routeCoords
    if (routeCoords.length >= 2) {
      const latlngs = routeCoords.map((c) => [c.lat, c.lng]);
      const polyline = L.polyline(latlngs, {
        color: '#4f46e5',
        weight: 5,
        opacity: 0.8,
      }).addTo(map);
      polyRef1.current = polyline;
      latlngs.forEach((coord) => fitCoords.push(coord));
    }

    // Redraw polyline for driverRouteCoords
    if (driverRouteCoords.length >= 2) {
      const latlngs = driverRouteCoords.map((c) => [c.lat, c.lng]);
      const polyline = L.polyline(latlngs, {
        color: '#10b981',
        weight: 4,
        opacity: 0.8,
        dashArray: '5, 10',
      }).addTo(map);
      polyRef2.current = polyline;
      latlngs.forEach((coord) => fitCoords.push(coord));
    }

    // Fit bounds automatically
    if (fitCoords.length >= 2) {
      map.fitBounds(fitCoords, { padding: [50, 50] });
    } else if (fitCoords.length === 1) {
      map.panTo(fitCoords[0]);
    }
  }, [pickup, dropoff, activeRide, drivers, pendingRides, routeCoords, driverRouteCoords]);

  return <div ref={containerRef} className="w-full h-full z-0" />;
}

export default function MapContainer({
  pickup,
  dropoff,
  drivers,
  activeRide,
  role,
  onLocationSelect,
  pendingRides = [],
  onAcceptRide,
}: MapContainerProps) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const hours = new Date().getHours();
    // Night-time hours (6 PM / 18:00 to 7 AM / 07:00)
    return hours >= 18 || hours < 7;
  });
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet'>(() => {
    // Default to OpenStreetMap if API key is not valid, or if the user wants reliable maps without billing
    return hasValidKey ? 'google' : 'leaflet';
  });
  const [hoveredPoint, setHoveredPoint] = useState<'pickup' | 'dropoff' | null>(null);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [driverRouteCoords, setDriverRouteCoords] = useState<LatLng[]>([]);

  // Resolve the effective pickup and dropoff points, falling back to those of active ride if they're null as props
  const effectivePickup = pickup || activeRide?.pickup || null;
  const effectiveDropoff = dropoff || activeRide?.dropoff || null;

  // 1. Calculate and fetch road routing coordinates from OSRM driving router for pickup-to-dropoff
  useEffect(() => {
    if (!effectivePickup || !effectiveDropoff) {
      setRouteCoords([]);
      return;
    }

    let isMounted = true;
    const fetchPickupToDropoff = async () => {
      try {
        const url = `https://router.projectosrm.org/route/v1/driving/${effectivePickup.lng},${effectivePickup.lat};${effectiveDropoff.lng},${effectiveDropoff.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.routes && data.routes[0]?.geometry?.coordinates) {
            const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => ({
              lat: c[1],
              lng: c[0]
            }));
            setRouteCoords(coords);
            return;
          }
        }
      } catch (err) {
        console.warn('OSM Route pickup-to-dropoff fetch failed (falling back to direct line):', err);
      }
      if (isMounted) {
        setRouteCoords([effectivePickup, effectiveDropoff]);
      }
    };

    fetchPickupToDropoff();
    return () => {
      isMounted = false;
    };
  }, [effectivePickup?.lat, effectivePickup?.lng, effectiveDropoff?.lat, effectiveDropoff?.lng]);

  // 2. Calculate and fetch driver routing coordinates en route/ongoing
  useEffect(() => {
    let origin: LatLng | null = null;
    let destination: LatLng | null = null;

    if (activeRide && (activeRide.status === 'accepted' || activeRide.status === 'ongoing') && activeRide.driverLocation) {
      origin = activeRide.driverLocation;
      if (activeRide.status === 'accepted' && effectivePickup) {
        destination = effectivePickup;
      } else if (activeRide.status === 'ongoing' && effectiveDropoff) {
        destination = effectiveDropoff;
      }
    }

    if (!origin || !destination) {
      setDriverRouteCoords([]);
      return;
    }

    let isMounted = true;
    const fetchDriverRoute = async () => {
      try {
        const url = `https://router.projectosrm.org/route/v1/driving/${origin!.lng},${origin!.lat};${destination!.lng},${destination!.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.routes && data.routes[0]?.geometry?.coordinates) {
            const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => ({
              lat: c[1],
              lng: c[0]
            }));
            setDriverRouteCoords(coords);
            return;
          }
        }
      } catch (err) {
        console.warn('OSM Driver route fetch failed (falling back to direct line):', err);
      }
      if (isMounted) {
        setDriverRouteCoords([origin!, destination!]);
      }
    };

    fetchDriverRoute();
    return () => {
      isMounted = false;
    };
  }, [
    effectivePickup?.lat, effectivePickup?.lng,
    effectiveDropoff?.lat, effectiveDropoff?.lng,
    activeRide?.status,
    activeRide?.driverLocation?.lat, activeRide?.driverLocation?.lng
  ]);

  // Default coordinate focused on SF Financial District
  const defaultCenter = { lat: 37.7895, lng: -122.4014 };

  const stateRef = useRef({ pickup, dropoff });
  useEffect(() => {
    stateRef.current = { pickup, dropoff };
  }, [pickup, dropoff]);

  const handleMapClick = (e: any) => {
    if (!onLocationSelect) return;

    let lat: number | undefined = undefined;
    let lng: number | undefined = undefined;

    if (e.latLng) {
      lat = typeof e.latLng.lat === 'function' ? e.latLng.lat() : e.latLng.lat;
      lng = typeof e.latLng.lng === 'function' ? e.latLng.lng() : e.latLng.lng;
    } else if (e.detail?.latLng) {
      const gLatLng = e.detail.latLng;
      lat = typeof gLatLng.lat === 'function' ? gLatLng.lat() : gLatLng.lat;
      lng = typeof gLatLng.lng === 'function' ? gLatLng.lng() : gLatLng.lng;
    } else if (e.lat !== undefined && e.lng !== undefined) {
      lat = e.lat;
      lng = e.lng;
    }

    if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) {
      console.warn('Map click event did not contain valid coordinates:', e);
      return;
    }

    const fallbackAddress = `SF Point (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

    const applyLocation = (address: string) => {
      const curPickup = stateRef.current.pickup;
      const curDropoff = stateRef.current.dropoff;
      if (!curPickup) {
        onLocationSelect('pickup', { address, lat: lat!, lng: lng! });
      } else if (!curDropoff) {
        onLocationSelect('dropoff', { address, lat: lat!, lng: lng! });
      }
    };

    if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        let address = fallbackAddress;
        if (status === 'OK' && results && results[0]) {
          const formatted = results[0].formatted_address;
          address = formatted.split(',').slice(0, 2).join(',').trim();
        }
        applyLocation(address);
      });
    } else {
      applyLocation(fallbackAddress);
    }
  };

  return (
    <div className={`relative w-full h-full rounded-2xl overflow-hidden shadow-xl border transition-colors duration-300 ${
      isDarkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
    }`}>
      {/* Dynamic Overlay HUD Controls & Mode Toggles */}
      <div className="absolute top-4 right-4 z-10 flex flex-col sm:flex-row items-end sm:items-center gap-2">
        {/* Map Engine Toggle */}
        <button
          onClick={() => setMapEngine(mapEngine === 'google' ? 'leaflet' : 'google')}
          title={mapEngine === 'google' ? 'Switch to free OpenStreetMap' : 'Switch to native Google Maps'}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 backdrop-blur-md ${
            isDarkMode 
              ? 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800' 
              : 'bg-white/95 border-slate-200/80 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {mapEngine === 'google' ? (
            <>
              <span className="text-emerald-500 text-sm">🌍</span>
              <span className="text-[10px] font-bold">Use OpenStreetMap</span>
            </>
          ) : (
            <>
              <span className="text-indigo-500 text-sm">🗺️</span>
              <span className="text-[10px] font-bold">Use Google Maps</span>
            </>
          )}
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`p-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 backdrop-blur-md ${
            isDarkMode 
              ? 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800' 
              : 'bg-white/95 border-slate-200/80 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {isDarkMode ? (
            <>
              <span className="text-amber-400 text-sm">☀️</span>
              <span className="text-[10px] font-semibold pr-1">Light</span>
            </>
          ) : (
            <>
              <span className="text-slate-600 text-sm">🌙</span>
              <span className="text-[10px] font-semibold pr-1">Dark</span>
            </>
          )}
        </button>
      </div>

      {/* Dynamic Overlay HUD Instructions Panel */}
      <div className={`absolute top-4 left-4 p-3 rounded-2xl text-xs max-w-xs space-y-1.5 backdrop-blur-md shadow-md z-10 border transition-colors duration-300 ${
        isDarkMode
          ? 'bg-slate-900/90 border-slate-800 text-slate-100'
          : 'bg-white/95 border-slate-200/80 text-slate-800'
      }`}>
        <div className={`flex items-center gap-1.5 font-bold font-display ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
          <Compass className="w-4 h-4" />
          <span>Interactive Map ({mapEngine === 'google' ? 'Google' : 'OSM'})</span>
        </div>
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-[11px] leading-relaxed font-medium`}>
          Click directly on the map to interactively place your pickup and dropoff points.
        </p>
        <div className={`pt-1 text-[10px] border-t font-semibold ${isDarkMode ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-400'}`}>
          {!effectivePickup && <span className="text-emerald-500">⚡ Click anywhere to select Pickup Location</span>}
          {effectivePickup && !effectiveDropoff && <span className="text-amber-500">⚡ Click to select Destination Dropoff</span>}
          {effectivePickup && effectiveDropoff && <span className={isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}>✨ Path coordinates matched!</span>}
        </div>
      </div>

      {mapEngine === 'leaflet' ? (
        <LeafletMap
          pickup={effectivePickup}
          dropoff={effectiveDropoff}
          drivers={drivers}
          activeRide={activeRide}
          routeCoords={routeCoords}
          driverRouteCoords={driverRouteCoords}
          pendingRides={pendingRides}
          onLocationSelect={onLocationSelect}
          onAcceptRide={onAcceptRide}
          isDarkMode={isDarkMode}
        />
      ) : (
        <Map
          defaultCenter={effectivePickup || defaultCenter}
          defaultZoom={13}
          mapId="DEMO_MAP_ID"
          onClick={handleMapClick}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: '100%', height: '100%' }}
          gestureHandling="greedy"
          disableDefaultUI={false}
          styles={isDarkMode ? DARK_MAP_STYLE : undefined}
          options={{
            styles: isDarkMode ? DARK_MAP_STYLE : undefined,
          }}
        >
          <MapSynchronizer pickup={effectivePickup} dropoff={effectiveDropoff} activeRide={activeRide} routeCoords={routeCoords} driverRouteCoords={driverRouteCoords} />
          {/* Pickup Marker */}
          {effectivePickup && (
            <AdvancedMarker position={{ lat: effectivePickup.lat, lng: effectivePickup.lng }} title="Pickup Location">
              <Pin background="#10b981" glyphColor="#ffffff" scale={1.2}>
                <div className="text-[9px] font-bold text-white uppercase px-1">UP</div>
              </Pin>
            </AdvancedMarker>
          )}

          {/* Dropoff Marker */}
          {effectiveDropoff && (
            <AdvancedMarker position={{ lat: effectiveDropoff.lat, lng: effectiveDropoff.lng }} title="Dropoff Location">
              <Pin background="#f43f5e" glyphColor="#ffffff" scale={1.2}>
                <div className="text-[9px] font-bold text-white uppercase px-1">OFF</div>
              </Pin>
            </AdvancedMarker>
          )}

          {/* Drivers Markers */}
          {drivers
            .filter(d => !activeRide || d.id !== activeRide.driverId)
            .map(driver => {
              if (!driver.location) return null;
              return (
                <AdvancedMarker
                  key={driver.id}
                  position={{ lat: driver.location.lat, lng: driver.location.lng }}
                  title={driver.name}
                >
                  <Pin background="#4f46e5" glyphColor="#ffffff" borderColor="#ffffff" scale={0.95}>
                    <div className="text-[8px] font-bold text-white">🚕</div>
                  </Pin>
                </AdvancedMarker>
              );
            })}

          {/* Assigned Active Driver Marker with beautiful real-time tracking highlights */}
          {activeRide && (activeRide.status === 'accepted' || activeRide.status === 'ongoing') && activeRide.driverLocation && (
            <AdvancedMarker
              position={{ lat: activeRide.driverLocation.lat, lng: activeRide.driverLocation.lng }}
              title={`Your Driver: ${activeRide.driverName || 'Partner'}`}
            >
              <div className="relative flex flex-col items-center">
                <div className="absolute -top-10 bg-emerald-600 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-xl shadow-lg border border-emerald-500/50 whitespace-nowrap z-20 animate-bounce">
                  ⚡ {activeRide.status === 'accepted' ? 'Driver coming' : 'Your Ride'}
                </div>
                <Pin background="#10b981" glyphColor="#ffffff" borderColor="#ffffff" scale={1.25}>
                  <div className="text-xs">🚕</div>
                </Pin>
                <span className="absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-40 animate-ping -z-10" />
              </div>
            </AdvancedMarker>
          )}

          {/* Pending Rides Markers (Pickup opportunities) */}
          {pendingRides?.map(ride => {
            if (!ride.pickup) return null;
            return (
              <AdvancedMarker
                key={`pending-${ride.id}`}
                position={{ lat: ride.pickup.lat, lng: ride.pickup.lng }}
                title={`Pickup opportunity from ${ride.passengerName}`}
              >
                <div 
                  className="relative group cursor-pointer" 
                  onClick={() => {
                    if (onAcceptRide) {
                      const confirmAccept = window.confirm(
                         `Accept ride request from ${ride.passengerName}?\n\nFrom: ${ride.pickup.address}\nTo: ${ride.dropoff.address}\nDistance: ${(ride.distanceKm ?? 0).toFixed(1)} km\nFare: $${(ride.price ?? 0).toFixed(2)}`
                      );
                      if (confirmAccept) {
                        onAcceptRide(ride.id);
                      }
                    }
                  }}
                >
                  <div className="bg-emerald-500 hover:bg-emerald-600 border-2 border-white text-white font-black text-xs px-2.5 py-1.5 rounded-full shadow-lg flex items-center gap-1 transition-all hover:scale-110 cursor-pointer">
                    <span>📢</span>
                    <span>${(ride.price ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full mx-auto -mt-1 shadow-md"></div>
                </div>
              </AdvancedMarker>
            );
          })}

          {/* Route Computation rendering */}
          {routeCoords.length >= 2 && (
            <RouteRenderer routeCoords={routeCoords} strokeColor="#4f46e5" strokeWeight={6} />
          )}

          {driverRouteCoords.length >= 2 && (
            <RouteRenderer routeCoords={driverRouteCoords} strokeColor="#10b981" strokeWeight={5} strokePattern="dashed" />
          )}
        </Map>
      )}

      {/* API Key or Billing failure banner mitigation */}
      {mapEngine === 'google' && (
        <div className={`absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl backdrop-blur-md shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 z-10 border transition-all duration-300 ${
          isDarkMode 
            ? 'bg-slate-900/90 border-slate-800 text-slate-100' 
            : 'bg-white/95 border-slate-200/80 text-slate-800'
        }`}>
          <div className="flex items-start gap-2.5">
            <HelpCircle className={`w-5 h-5 shrink-0 mt-0.5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <div className="text-xs space-y-1">
              <p className={`font-extrabold font-display ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                ⚠️ Maps Billing or Authorization Issue?
              </p>
              <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium text-[11px] max-w-xl leading-normal`}>
                If Google Maps displays "Billing required" or fails to load, you can instantly switch to OpenStreetMap. It is completely free, does not require an API key or billing, and supports full interactive capabilities!
              </p>
            </div>
          </div>
          <button
            onClick={() => setMapEngine('leaflet')}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow transition-all self-end sm:self-center"
          >
            Switch to OpenStreetMap Fallback
          </button>
        </div>
      )}
    </div>
  );
}
