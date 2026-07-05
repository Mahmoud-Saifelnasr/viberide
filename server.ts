/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { 
  User, 
  Ride, 
  Contact, 
  Message, 
  ScheduledTrip, 
  UserRole, 
  VehicleType, 
  RideStatus, 
  ScheduledTripStatus,
  LatLng
} from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'rideshare-social-secret-key-2026';
const DB_FILE = path.join(process.cwd(), 'db.json');

// Initialize Stripe if keys exist, otherwise run in simulation mode
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log('Stripe SDK initialized successfully with Stripe secret key.');
} else {
  console.log('Stripe Secret Key not found in environment. Stripe is running in SIMULATION/SANDBOX mode.');
}

// Global server state
interface DBStore {
  users: (User & { passwordHash: string })[];
  rides: Ride[];
  contacts: Contact[];
  messages: Message[];
  schedules: ScheduledTrip[];
}

let db: DBStore = {
  users: [],
  rides: [],
  contacts: [],
  messages: [],
  schedules: []
};

// Seed initial mock data
function seedDatabase() {
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('password123', salt);

  // Default Drivers
  const defaultDrivers = [
    {
      id: 'driver-carlos',
      email: 'carlos@rideshare.com',
      name: 'Carlos Santana',
      role: 'driver' as UserRole,
      rating: 4.9,
      ratingCount: 124,
      passwordHash: defaultPasswordHash,
      createdAt: new Date().toISOString(),
      location: { lat: 37.7833, lng: -122.4167 },
      driverProfile: {
        vehicleType: 'electric' as VehicleType,
        vehicleModel: 'Tesla Model Y (White)',
        vehiclePlate: 'SF-ELEC-Y',
        baseRate: 2.50,
        isOnline: true
      }
    },
    {
      id: 'driver-sofia',
      email: 'sofia@rideshare.com',
      name: 'Sofia Rodriguez',
      role: 'driver' as UserRole,
      rating: 4.8,
      ratingCount: 89,
      passwordHash: defaultPasswordHash,
      createdAt: new Date().toISOString(),
      location: { lat: 37.7699, lng: -122.4468 },
      driverProfile: {
        vehicleType: 'sedan' as VehicleType,
        vehicleModel: 'Toyota Camry Hybrid (Silver)',
        vehiclePlate: 'SF-HYB-88',
        baseRate: 1.80,
        isOnline: true
      }
    },
    {
      id: 'driver-marcus',
      email: 'marcus@rideshare.com',
      name: 'Marcus Chen',
      role: 'driver' as UserRole,
      rating: 5.0,
      ratingCount: 42,
      passwordHash: defaultPasswordHash,
      createdAt: new Date().toISOString(),
      location: { lat: 37.7901, lng: -122.4007 },
      driverProfile: {
        vehicleType: 'luxury' as VehicleType,
        vehicleModel: 'BMW 5-Series (Black)',
        vehiclePlate: 'SF-LUX-05',
        baseRate: 3.80,
        isOnline: true
      }
    }
  ];

  // Default Passengers
  const defaultPassengers = [
    {
      id: 'passenger-sarah',
      email: 'sarah@rideshare.com',
      name: 'Sarah Connor',
      role: 'passenger' as UserRole,
      rating: 4.9,
      ratingCount: 35,
      passwordHash: defaultPasswordHash,
      createdAt: new Date().toISOString(),
      location: { lat: 37.7749, lng: -122.4194 }
    },
    {
      id: 'passenger-john',
      email: 'john@rideshare.com',
      name: 'John Doe',
      role: 'passenger' as UserRole,
      rating: 4.7,
      ratingCount: 12,
      passwordHash: defaultPasswordHash,
      createdAt: new Date().toISOString(),
      location: { lat: 37.7550, lng: -122.4350 }
    }
  ];

  db.users.push(...defaultDrivers, ...defaultPassengers);

  // Default Relationships / Contacts
  db.contacts.push(
    {
      id: 'contact-1',
      userId: 'passenger-sarah',
      contactId: 'driver-carlos',
      contactName: 'Carlos Santana',
      contactEmail: 'carlos@rideshare.com',
      contactRole: 'driver',
      customRate: 2.10, // Negotiated lower rate from 2.50
      createdAt: new Date().toISOString()
    },
    {
      id: 'contact-2',
      userId: 'driver-carlos',
      contactId: 'passenger-sarah',
      contactName: 'Sarah Connor',
      contactEmail: 'sarah@rideshare.com',
      contactRole: 'passenger',
      customRate: 2.10,
      createdAt: new Date().toISOString()
    }
  );

  // Default Scheduled Trips
  db.schedules.push({
    id: 'schedule-1',
    passengerId: 'passenger-sarah',
    passengerName: 'Sarah Connor',
    driverId: 'driver-carlos',
    driverName: 'Carlos Santana',
    pickup: {
      address: 'Ferry Building, San Francisco, CA',
      lat: 37.7955,
      lng: -122.3937
    },
    dropoff: {
      address: 'Golden Gate Park, San Francisco, CA',
      lat: 37.7694,
      lng: -122.4862
    },
    scheduledTime: '17:30',
    recurring: true,
    recurringDays: ['Mon', 'Wed', 'Fri'],
    status: 'scheduled',
    createdAt: new Date().toISOString()
  });

  // Default Messaging History
  db.messages.push(
    {
      id: 'msg-1',
      rideId: null,
      senderId: 'passenger-sarah',
      receiverId: 'driver-carlos',
      content: 'Hey Carlos! I loved our last scheduled trip. Would you be open to a recurring commute schedule?',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'msg-2',
      rideId: null,
      senderId: 'driver-carlos',
      receiverId: 'passenger-sarah',
      content: 'Hi Sarah! Absolutely. I am happy to set a custom rate of $2.10/km for you. Let’s do Mon/Wed/Fri at 5:30 PM!',
      timestamp: new Date(Date.now() - 3600000).toISOString()
    }
  );

  saveDatabase();
}

// Save & Load DB
function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

function loadDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      db = {
        users: parsed.users || [],
        rides: parsed.rides || [],
        contacts: parsed.contacts || [],
        messages: parsed.messages || [],
        schedules: parsed.schedules || []
      };
      console.log('Database loaded successfully from db.json.');
      // Persist back to write any newly initialized keys (e.g. rides) to db.json
      saveDatabase();
    } catch (err) {
      console.error('Error loading database, seeding a fresh database...', err);
      seedDatabase();
    }
  } else {
    console.log('Database file not found, seeding database...');
    seedDatabase();
  }
}

loadDatabase();

// Middleware
app.use(express.json());

// Token verification middleware
interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

const authenticateToken = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    req.user = user;
    next();
  });
};

// ==================== DEVOPS CONFIGURATION & LOGGING ====================
export interface DevOpsConfig {
  simulationSpeed: number;
  driftEnabled: boolean;
  maintenanceMode: boolean;
  mockErrorPercentage: number;
}

export interface DevOpsLog {
  timestamp: string;
  category: 'system' | 'gps' | 'database' | 'network' | 'payment';
  message: string;
  level: 'info' | 'warn' | 'error';
}

let devopsConfig: DevOpsConfig = {
  simulationSpeed: 1.0,
  driftEnabled: true,
  maintenanceMode: false,
  mockErrorPercentage: 0
};

let devopsLogs: DevOpsLog[] = [
  { timestamp: new Date().toISOString(), category: 'system', message: 'DevOps simulation system initialized.', level: 'info' }
];

function addDevOpsLog(category: DevOpsLog['category'], message: string, level: DevOpsLog['level'] = 'info') {
  devopsLogs.push({
    timestamp: new Date().toISOString(),
    category,
    message,
    level
  });
  if (devopsLogs.length > 80) {
    devopsLogs.shift();
  }
}

// Driver position simulation movement loop
setInterval(() => {
  let changed = false;
  let driftCount = 0;
  let moveCount = 0;

  db.users.forEach(user => {
    if (user.role === 'driver' && user.driverProfile?.isOnline) {
      if (devopsConfig.driftEnabled) {
        // Simulate slight drift in latitude/longitude to simulate real driving/traffic
        const latDrift = (Math.random() - 0.5) * 0.0005;
        const lngDrift = (Math.random() - 0.5) * 0.0005;
        if (user.location) {
          user.location.lat += latDrift;
          user.location.lng += lngDrift;
          changed = true;
          driftCount++;
        } else {
          user.location = { lat: 37.7749 + latDrift, lng: -122.4194 + lngDrift };
          changed = true;
          driftCount++;
        }
      }
    }
  });

  // Move active drivers towards their destinations
  db.rides.forEach(ride => {
    if (ride.driverId && (ride.status === 'accepted' || ride.status === 'ongoing')) {
      const driver = db.users.find(u => u.id === ride.driverId);
      if (driver && driver.location) {
        // Destination is pickup if accepted, dropoff if ongoing
        const dest = ride.status === 'accepted' ? ride.pickup : ride.dropoff;
        const current = driver.location;
        
        // Linearly interpolate coordinates slightly to simulate dynamic GPS progress
        const speedMultiplier = Math.min(Math.max(devopsConfig.simulationSpeed, 0), 5); // bracket between 0 and 5
        const stepRate = 0.15 * speedMultiplier;
        
        const latStep = (dest.lat - current.lat) * stepRate;
        const lngStep = (dest.lng - current.lng) * stepRate;
        
        current.lat += latStep;
        current.lng += lngStep;
        
        if (ride.status === 'ongoing') {
          ride.pickup.lat = current.lat; // Update ride progress
          ride.pickup.lng = current.lng;
        }

        moveCount++;
        changed = true;
      }
    }
  });

  if (changed) {
    saveDatabase();
    if (moveCount > 0) {
      addDevOpsLog('gps', `Updated GPS coordinates for ${moveCount} active trip(s) with simulation speed multiplier ${devopsConfig.simulationSpeed}x.`, 'info');
    } else if (driftCount > 0 && Math.random() < 0.2) {
      addDevOpsLog('gps', `Simulated idle GPS drift for ${driftCount} online driver(s).`, 'info');
    }
  }
}, 8000);

// ==================== AUTH ROUTES ====================

app.post('/api/auth/register', (req, res) => {
  if (devopsConfig.maintenanceMode) {
    addDevOpsLog('network', 'Blocked registration attempt: System is in Maintenance Mode.', 'warn');
    res.status(503).json({ error: 'SYSTEM MAINTENANCE: The platform is undergoing automated container deployment updates.' });
    return;
  }

  const { email, password, name, role, vehicleType, vehicleModel, vehiclePlate, baseRate } = req.body;

  if (!email || !password || !name || !role) {
    res.status(400).json({ error: 'Missing required registration fields' });
    return;
  }

  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    res.status(400).json({ error: 'User already exists with this email' });
    return;
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const id = `user-${Math.random().toString(36).substring(2, 11)}`;

  const newUser: User & { passwordHash: string } = {
    id,
    email: email.toLowerCase(),
    name,
    role: role as UserRole,
    rating: 5.0,
    ratingCount: 1,
    passwordHash,
    createdAt: new Date().toISOString(),
    location: { lat: 37.7749 + (Math.random() - 0.5) * 0.05, lng: -122.4194 + (Math.random() - 0.5) * 0.05 }
  };

  if (role === 'driver') {
    newUser.driverProfile = {
      vehicleType: (vehicleType as VehicleType) || 'sedan',
      vehicleModel: vehicleModel || 'Unspecified Vehicle',
      vehiclePlate: vehiclePlate || 'TEMP-PLATE',
      baseRate: parseFloat(baseRate) || 2.00,
      isOnline: true
    };
  }

  db.users.push(newUser);
  addDevOpsLog('database', `Created user account ${id} for ${name} (${role}).`, 'info');
  saveDatabase();

  const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
  
  // Exclude passwordHash in output
  const { passwordHash: _, ...clientUser } = newUser;
  res.status(201).json({ token, user: clientUser });
});

app.post('/api/auth/login', (req, res) => {
  if (devopsConfig.maintenanceMode) {
    addDevOpsLog('network', 'Blocked login attempt: System is in Maintenance Mode.', 'warn');
    res.status(503).json({ error: 'SYSTEM MAINTENANCE: The platform is undergoing automated container deployment updates.' });
    return;
  }

  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    addDevOpsLog('system', `Failed login attempt for email: ${email}`, 'warn');
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  addDevOpsLog('system', `User authenticated: ${user.name} (${user.role})`, 'info');
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  
  const { passwordHash: _, ...clientUser } = user;
  res.json({ token, user: clientUser });
});

app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  if (devopsConfig.maintenanceMode) {
    res.status(503).json({ error: 'SYSTEM MAINTENANCE: The platform is undergoing automated container deployment updates.' });
    return;
  }

  const user = db.users.find(u => u.id === req.user?.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { passwordHash: _, ...clientUser } = user;
  res.json(clientUser);
});

// ==================== USER PROFILE / DRIVERS ROUTES ====================

app.get('/api/users/drivers', authenticateToken, (req, res) => {
  // Returns all online drivers
  const onlineDrivers = db.users
    .filter(u => u.role === 'driver' && u.driverProfile?.isOnline)
    .map(({ passwordHash: _, ...driver }) => driver);
  res.json(onlineDrivers);
});

app.put('/api/users/profile', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userIndex = db.users.findIndex(u => u.id === req.user?.id);
  if (userIndex === -1) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { name, isOnline, vehicleType, vehicleModel, vehiclePlate, baseRate, location } = req.body;
  const user = db.users[userIndex];

  if (name) user.name = name;
  if (location) user.location = location;

  if (user.role === 'driver' && user.driverProfile) {
    if (isOnline !== undefined) user.driverProfile.isOnline = isOnline;
    if (vehicleType) user.driverProfile.vehicleType = vehicleType;
    if (vehicleModel) user.driverProfile.vehicleModel = vehicleModel;
    if (vehiclePlate) user.driverProfile.vehiclePlate = vehiclePlate;
    if (baseRate !== undefined) user.driverProfile.baseRate = parseFloat(baseRate) || 1.00;
  }

  saveDatabase();
  const { passwordHash: _, ...clientUser } = user;
  res.json(clientUser);
});

// ==================== GOOGLE MAPS GEOCODING DESTINATIONS ====================

function generateSimulatedDestination(address?: string, lat?: number, lng?: number) {
  const baseLat = lat || 37.7749;
  const baseLng = lng || -122.4194;
  const displayName = address ? address.split(',')[0] : 'Selected Place';

  // Return realistic entrances for ride-hailing based on coordinates
  return {
    displayName: displayName,
    navigationPoints: [
      {
        navigationPointToken: `nav_tok_main_${Math.random().toString(36).substring(2, 11)}`,
        displayName: 'Main Entrance / Lobby Walkway',
        travelModes: ['DRIVE'],
        usages: ['PICKUP', 'DROPOFF'],
        location: {
          lat: baseLat + 0.00018,
          lng: baseLng - 0.00015
        }
      },
      {
        navigationPointToken: `nav_tok_north_${Math.random().toString(36).substring(2, 11)}`,
        displayName: 'North Loading Gate & Dropoff Loop',
        travelModes: ['DRIVE'],
        usages: ['PICKUP', 'DROPOFF'],
        location: {
          lat: baseLat - 0.00022,
          lng: baseLng + 0.00025
        }
      },
      {
        navigationPointToken: `nav_tok_accessible_${Math.random().toString(36).substring(2, 11)}`,
        displayName: 'Side Accessible Transit Lane',
        travelModes: ['DRIVE'],
        usages: ['PICKUP', 'DROPOFF'],
        location: {
          lat: baseLat + 0.00005,
          lng: baseLng + 0.00031
        }
      }
    ]
  };
}

app.post('/api/destinations', authenticateToken, async (req, res) => {
  const { placeId, address, lat, lng } = req.body;
  const apiKey = process.env.GOOGLE_MAPS_PLATFORM_KEY;

  if (!apiKey) {
    // If no key is set, fall back to high-fidelity simulated navigation points
    return res.json({ destinations: [generateSimulatedDestination(address, lat, lng)] });
  }

  try {
    const body: any = {};
    if (placeId) {
      body.place = `places/${placeId}`;
    } else if (address) {
      body.addressQuery = { addressQuery: address };
    } else if (lat !== undefined && lng !== undefined) {
      body.locationQuery = { location: { lat: parseFloat(lat), lng: parseFloat(lng) } };
    } else {
      return res.status(400).json({ error: 'Missing geocoding lookup criteria.' });
    }

    body.travelModes = ["DRIVE"];

    const response = await fetch('https://geocode.googleapis.com/v4beta/geocode/destinations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': '*'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Geocoding Destinations API returned error status, falling back:', response.status, errText);
      return res.json({ destinations: [generateSimulatedDestination(address, lat, lng)] });
    }

    const data = await response.json();
    
    // Ensure navigationPoints are present, else add fallbacks
    if (!data.destinations || data.destinations.length === 0 || !data.destinations[0].navigationPoints || data.destinations[0].navigationPoints.length === 0) {
      return res.json({ destinations: [generateSimulatedDestination(address, lat, lng)] });
    }

    return res.json(data);
  } catch (error) {
    console.error('Failed to query Geocoding Destinations API:', error);
    return res.json({ destinations: [generateSimulatedDestination(address, lat, lng)] });
  }
});

// Rate driver/passenger
app.post('/api/users/:id/rate', authenticateToken, (req, res) => {
  const targetId = req.params.id;
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
    return;
  }

  const user = db.users.find(u => u.id === targetId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const totalRatingPoints = user.rating * user.ratingCount + parseFloat(rating);
  user.ratingCount += 1;
  user.rating = Math.round((totalRatingPoints / user.ratingCount) * 10) / 10;

  saveDatabase();
  res.json({ id: user.id, rating: user.rating, ratingCount: user.ratingCount });
});

// ==================== RIDES ROUTING ====================

app.post('/api/rides/request', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { pickup, dropoff, distanceKm, durationMin, price, driverId, polyline } = req.body;

  if (!pickup || !dropoff || !distanceKm || !durationMin || !price) {
    res.status(400).json({ error: 'Incomplete ride request information' });
    return;
  }

  const passenger = db.users.find(u => u.id === req.user?.id);
  if (!passenger) {
    res.status(404).json({ error: 'Passenger account not found' });
    return;
  }

  let driverName: string | null = null;
  if (driverId) {
    const driver = db.users.find(u => u.id === driverId);
    if (driver) {
      driverName = driver.name;
    }
  }

  const newRide: Ride = {
    id: `ride-${Math.random().toString(36).substring(2, 11)}`,
    passengerId: passenger.id,
    passengerName: passenger.name,
    driverId: driverId || null,
    driverName,
    pickup,
    dropoff,
    distanceKm: parseFloat(distanceKm),
    durationMin: parseFloat(durationMin),
    price: parseFloat(price),
    status: 'requested',
    polyline: polyline || '',
    stripePaymentIntentId: null,
    paymentStatus: 'unpaid',
    createdAt: new Date().toISOString()
  };

  db.rides.push(newRide);
  saveDatabase();

  res.status(201).json(newRide);
});

app.post('/api/rides/:id/accept', authenticateToken, (req: AuthenticatedRequest, res) => {
  const rideId = req.params.id;
  const driverId = req.user?.id;

  if (req.user?.role !== 'driver') {
    res.status(403).json({ error: 'Only drivers can accept rides' });
    return;
  }

  const ride = db.rides.find(r => r.id === rideId);
  if (!ride) {
    res.status(404).json({ error: 'Ride request not found' });
    return;
  }

  if (ride.status !== 'requested') {
    res.status(400).json({ error: 'Ride request has already been handled' });
    return;
  }

  const driver = db.users.find(u => u.id === driverId);
  if (!driver) {
    res.status(404).json({ error: 'Driver account not found' });
    return;
  }

  ride.driverId = driver.id;
  ride.driverName = driver.name;
  ride.status = 'accepted';

  // Automatically start message channel
  db.messages.push({
    id: `msg-${Math.random().toString(36).substring(2, 11)}`,
    rideId: ride.id,
    senderId: driver.id,
    receiverId: ride.passengerId,
    content: `Hi ${ride.passengerName}, I have accepted your ride request! I am heading to your location.`,
    timestamp: new Date().toISOString()
  });

  saveDatabase();
  res.json(ride);
});

app.post('/api/rides/:id/start', authenticateToken, (req: AuthenticatedRequest, res) => {
  const rideId = req.params.id;

  const ride = db.rides.find(r => r.id === rideId);
  if (!ride) {
    res.status(404).json({ error: 'Ride not found' });
    return;
  }

  if (ride.driverId !== req.user?.id) {
    res.status(403).json({ error: 'Unauthorized. You are not the driver assigned to this ride.' });
    return;
  }

  ride.status = 'ongoing';
  saveDatabase();
  res.json(ride);
});

app.post('/api/rides/:id/complete', authenticateToken, (req: AuthenticatedRequest, res) => {
  const rideId = req.params.id;

  const ride = db.rides.find(r => r.id === rideId);
  if (!ride) {
    res.status(404).json({ error: 'Ride not found' });
    return;
  }

  if (ride.driverId !== req.user?.id) {
    res.status(403).json({ error: 'Unauthorized. You are not the driver assigned to this ride.' });
    return;
  }

  ride.status = 'completed';
  saveDatabase();
  res.json(ride);
});

app.post('/api/rides/:id/cancel', authenticateToken, (req: AuthenticatedRequest, res) => {
  const rideId = req.params.id;
  const userId = req.user?.id;

  const ride = db.rides.find(r => r.id === rideId);
  if (!ride) {
    res.status(404).json({ error: 'Ride not found' });
    return;
  }

  // Passenger or assigned driver can cancel
  if (ride.passengerId !== userId && ride.driverId !== userId) {
    res.status(403).json({ error: 'Unauthorized to cancel this ride' });
    return;
  }

  ride.status = 'cancelled';
  saveDatabase();
  res.json(ride);
});

app.get('/api/rides/active', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;

  const activeRide = db.rides.find(r => {
    const isUser = role === 'driver' ? r.driverId === userId : r.passengerId === userId;
    return isUser && ['requested', 'accepted', 'ongoing'].includes(r.status);
  });

  if (activeRide && activeRide.driverId) {
    const driverUser = db.users.find(u => u.id === activeRide.driverId);
    if (driverUser) {
      activeRide.driverLocation = driverUser.location;
      if (driverUser.driverProfile) {
        activeRide.driverVehicle = {
          vehicleType: driverUser.driverProfile.vehicleType,
          vehicleModel: driverUser.driverProfile.vehicleModel,
          vehiclePlate: driverUser.driverProfile.vehiclePlate,
        };
      }
    }
  }

  res.json(activeRide || null);
});

app.get('/api/rides/history', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;

  const history = db.rides
    .filter(r => {
      const isUser = role === 'driver' ? r.driverId === userId : r.passengerId === userId;
      return isUser && ['completed', 'cancelled'].includes(r.status);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(history);
});

// ==================== MESSAGING ====================

app.get('/api/messages', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const { contactId, rideId } = req.query;

  let chatHistory = db.messages.filter(m => {
    // If rideId is specified, query ride-specific channel
    if (rideId) {
      return m.rideId === rideId;
    }
    // Else query general direct message history
    if (contactId) {
      const matchDirect = (m.senderId === userId && m.receiverId === contactId) ||
                          (m.senderId === contactId && m.receiverId === userId);
      return matchDirect && m.rideId === null;
    }
    // If neither, return all user-related messages
    return m.senderId === userId || m.receiverId === userId;
  });

  chatHistory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  res.json(chatHistory);
});

app.post('/api/messages/send', authenticateToken, (req: AuthenticatedRequest, res) => {
  const senderId = req.user?.id;
  const { receiverId, rideId, content } = req.body;

  if (!receiverId || !content) {
    res.status(400).json({ error: 'Receiver ID and content are required' });
    return;
  }

  if (!senderId) {
    res.status(401).json({ error: 'Sender ID not authenticated' });
    return;
  }

  const newMessage: Message = {
    id: `msg-${Math.random().toString(36).substring(2, 11)}`,
    rideId: rideId || null,
    senderId,
    receiverId,
    content,
    timestamp: new Date().toISOString()
  };

  db.messages.push(newMessage);
  saveDatabase();

  res.status(201).json(newMessage);
});

// ==================== CONTACTS ROUTING ====================

app.get('/api/contacts', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const userContacts = db.contacts.filter(c => c.userId === userId);
  res.json(userContacts);
});

app.post('/api/contacts/add', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const { contactId, customRate } = req.body;

  if (!contactId) {
    res.status(400).json({ error: 'Contact User ID is required' });
    return;
  }

  if (userId === contactId) {
    res.status(400).json({ error: 'You cannot add yourself as a contact' });
    return;
  }

  const user = db.users.find(u => u.id === userId);
  const contactUser = db.users.find(u => u.id === contactId);

  if (!user || !contactUser) {
    res.status(404).json({ error: 'User account not found' });
    return;
  }

  // Check if contact relationship already exists
  const exists = db.contacts.find(c => c.userId === userId && c.contactId === contactId);
  if (exists) {
    res.status(400).json({ error: 'Contact relationship already exists' });
    return;
  }

  // Add mutual contacts
  const newContactA: Contact = {
    id: `contact-${Math.random().toString(36).substring(2, 11)}`,
    userId: userId!,
    contactId: contactId,
    contactName: contactUser.name,
    contactEmail: contactUser.email,
    contactRole: contactUser.role,
    customRate: customRate !== undefined ? parseFloat(customRate) : null,
    createdAt: new Date().toISOString()
  };

  const newContactB: Contact = {
    id: `contact-${Math.random().toString(36).substring(2, 11)}`,
    userId: contactId,
    contactId: userId!,
    contactName: user.name,
    contactEmail: user.email,
    contactRole: user.role,
    customRate: customRate !== undefined ? parseFloat(customRate) : null,
    createdAt: new Date().toISOString()
  };

  db.contacts.push(newContactA, newContactB);
  saveDatabase();

  res.status(201).json(newContactA);
});

app.put('/api/contacts/:id/rate', authenticateToken, (req: AuthenticatedRequest, res) => {
  const contactRecordId = req.params.id;
  const { customRate } = req.body;

  const contactA = db.contacts.find(c => c.id === contactRecordId && c.userId === req.user?.id);
  if (!contactA) {
    res.status(404).json({ error: 'Contact relation not found' });
    return;
  }

  const rateValue = customRate !== null ? parseFloat(customRate) : null;
  contactA.customRate = rateValue;

  // Update reverse mutual contact
  const contactB = db.contacts.find(c => c.userId === contactA.contactId && c.contactId === contactA.userId);
  if (contactB) {
    contactB.customRate = rateValue;
  }

  saveDatabase();
  res.json(contactA);
});

// ==================== SCHEDULES ====================

app.get('/api/schedules', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;

  const schedules = db.schedules.filter(s => {
    return role === 'driver' ? s.driverId === userId : s.passengerId === userId;
  });

  res.json(schedules);
});

app.post('/api/schedules/create', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { driverId, pickup, dropoff, scheduledTime, recurring, recurringDays } = req.body;

  if (!driverId || !pickup || !dropoff || !scheduledTime) {
    res.status(400).json({ error: 'Missing scheduled trip details' });
    return;
  }

  const passenger = db.users.find(u => u.id === req.user?.id);
  const driver = db.users.find(u => u.id === driverId);

  if (!passenger || !driver) {
    res.status(404).json({ error: 'Passenger or Driver account not found' });
    return;
  }

  const newSchedule: ScheduledTrip = {
    id: `schedule-${Math.random().toString(36).substring(2, 11)}`,
    passengerId: passenger.id,
    passengerName: passenger.name,
    driverId: driver.id,
    driverName: driver.name,
    pickup,
    dropoff,
    scheduledTime,
    recurring: !!recurring,
    recurringDays: recurringDays || [],
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };

  db.schedules.push(newSchedule);
  saveDatabase();

  res.status(201).json(newSchedule);
});

app.post('/api/schedules/:id/cancel', authenticateToken, (req: AuthenticatedRequest, res) => {
  const scheduleId = req.params.id;
  const userId = req.user?.id;

  const scheduleIndex = db.schedules.findIndex(s => s.id === scheduleId && (s.passengerId === userId || s.driverId === userId));
  if (scheduleIndex === -1) {
    res.status(404).json({ error: 'Schedule not found or unauthorized' });
    return;
  }

  db.schedules.splice(scheduleIndex, 1);
  saveDatabase();
  res.json({ success: true, message: 'Scheduled trip cancelled successfully' });
});

// ==================== STRIPE PAYMENTS ROUTING ====================

app.post('/api/payments/create-intent', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { amount, rideId } = req.body;

  if (!amount || !rideId) {
    res.status(400).json({ error: 'Amount and Ride ID are required' });
    return;
  }

  const ride = db.rides.find(r => r.id === rideId);
  if (!ride) {
    res.status(404).json({ error: 'Ride record not found' });
    return;
  }

  const centsAmount = Math.round(parseFloat(amount) * 100);

  try {
    if (stripe) {
      // Create real Stripe PaymentIntent if API key exists
      const paymentIntent = await stripe.paymentIntents.create({
        amount: centsAmount,
        currency: 'usd',
        metadata: { rideId, passengerId: req.user?.id || '' },
        automatic_payment_methods: { enabled: true }
      });

      ride.stripePaymentIntentId = paymentIntent.id;
      ride.paymentStatus = 'processing';
      saveDatabase();

      res.json({
        clientSecret: paymentIntent.client_secret,
        isSimulation: false,
        paymentIntentId: paymentIntent.id
      });
    } else {
      // Return highly detailed mock payment payload for our client simulation
      const mockSecret = `x402_secret_${Math.random().toString(36).substring(2, 15)}`;
      const mockId = `x402_pi_${Math.random().toString(36).substring(2, 11)}`;
      
      ride.stripePaymentIntentId = mockId;
      ride.paymentStatus = 'processing';
      saveDatabase();

      res.json({
        clientSecret: mockSecret,
        isSimulation: true,
        paymentIntentId: mockId
      });
    }
  } catch (error: any) {
    console.error('Stripe Payment Intent Error:', error);
    res.status(500).json({ error: error.message || 'Payment processing failure' });
  }
});

app.post('/api/payments/confirm', authenticateToken, (req: AuthenticatedRequest, res) => {
  const { rideId, paymentIntentId } = req.body;

  const ride = db.rides.find(r => r.id === rideId);
  if (!ride) {
    res.status(404).json({ error: 'Ride record not found' });
    return;
  }

  ride.paymentStatus = 'paid';
  if (paymentIntentId) {
    ride.stripePaymentIntentId = paymentIntentId;
  }
  
  saveDatabase();
  res.json({ success: true, ride });
});

// ==================== REALTIME UPDATES DELTA ROUTE ====================

app.get('/api/updates', authenticateToken, (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const role = req.user?.role;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Find users active ride if any
  const activeRide = db.rides.find(r => {
    const isUser = role === 'driver' ? r.driverId === userId : r.passengerId === userId;
    return isUser && ['requested', 'accepted', 'ongoing'].includes(r.status);
  }) || null;

  if (activeRide && activeRide.driverId) {
    const driverUser = db.users.find(u => u.id === activeRide.driverId);
    if (driverUser) {
      activeRide.driverLocation = driverUser.location;
      if (driverUser.driverProfile) {
        activeRide.driverVehicle = {
          vehicleType: driverUser.driverProfile.vehicleType,
          vehicleModel: driverUser.driverProfile.vehicleModel,
          vehiclePlate: driverUser.driverProfile.vehiclePlate,
        };
      }
    }
  }

  // Filter messages for this user
  const userMessages = db.messages.filter(m => m.senderId === userId || m.receiverId === userId);

  // List of all online drivers (for passenger view)
  const drivers = db.users
    .filter(u => u.role === 'driver' && u.driverProfile?.isOnline)
    .map(({ passwordHash: _, ...d }) => d);

  // If driver, list of pending requests
  const pendingRides = role === 'driver' 
    ? db.rides.filter(r => r.status === 'requested' && (r.driverId === null || r.driverId === userId))
    : [];

  // Filter schedules
  const schedules = db.schedules.filter(s => s.passengerId === userId || s.driverId === userId);

  res.json({
    rides: pendingRides,
    messages: userMessages,
    activeRide,
    drivers,
    schedules
  });
});

// ==================== DEVOPS DASHBOARD ENDPOINTS ====================

const DEVOPS_SECRET_PASSCODE = process.env.DEVOPS_PASSCODE || 'admin123';

const authenticateDevOps = (req: any, res: any, next: any) => {
  const token = req.headers['x-devops-token'];
  if (token === DEVOPS_SECRET_PASSCODE) {
    next();
  } else {
    res.status(401).json({ error: 'UNAUTHORIZED: Valid DevOps access token required.' });
  }
};

app.post('/api/devops/login', (req, res) => {
  const { passcode } = req.body;
  if (passcode === DEVOPS_SECRET_PASSCODE) {
    addDevOpsLog('system', 'Successful DevOps console authenticated login.', 'info');
    res.json({ success: true, token: DEVOPS_SECRET_PASSCODE });
  } else {
    addDevOpsLog('system', 'Failed DevOps authentication attempt.', 'warn');
    res.status(401).json({ error: 'Invalid DevOps authentication passcode.' });
  }
});

app.get('/api/devops/status', authenticateDevOps, (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  const totalUsers = db.users.length;
  const passengers = db.users.filter(u => u.role === 'passenger').length;
  const drivers = db.users.filter(u => u.role === 'driver');
  const onlineDrivers = drivers.filter(d => d.driverProfile?.isOnline).length;

  const ridesByStatus = {
    requested: db.rides.filter(r => r.status === 'requested').length,
    accepted: db.rides.filter(r => r.status === 'accepted').length,
    ongoing: db.rides.filter(r => r.status === 'ongoing').length,
    completed: db.rides.filter(r => r.status === 'completed').length,
    cancelled: db.rides.filter(r => r.status === 'cancelled').length,
    total: db.rides.length
  };

  const usersList = db.users.map(({ passwordHash: _, ...u }) => u);

  res.json({
    stats: {
      uptime,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      }
    },
    config: devopsConfig,
    database: {
      usersCount: totalUsers,
      passengersCount: passengers,
      driversCount: drivers.length,
      onlineDriversCount: onlineDrivers,
      rides: ridesByStatus,
      schedulesCount: db.schedules.length,
      messagesCount: db.messages.length
    },
    users: usersList,
    rides: db.rides,
    logs: devopsLogs
  });
});

app.post('/api/devops/config', authenticateDevOps, (req, res) => {
  const { simulationSpeed, driftEnabled, maintenanceMode, mockErrorPercentage } = req.body;

  if (simulationSpeed !== undefined) {
    devopsConfig.simulationSpeed = parseFloat(simulationSpeed) || 0.0;
    addDevOpsLog('system', `DevOps updated simulationSpeed to ${devopsConfig.simulationSpeed}x`, 'info');
  }
  if (driftEnabled !== undefined) {
    devopsConfig.driftEnabled = !!driftEnabled;
    addDevOpsLog('system', `DevOps toggled GPS drift to ${devopsConfig.driftEnabled ? 'ENABLED' : 'DISABLED'}`, 'info');
  }
  if (maintenanceMode !== undefined) {
    devopsConfig.maintenanceMode = !!maintenanceMode;
    addDevOpsLog('system', `DevOps toggled Maintenance Mode to ${devopsConfig.maintenanceMode ? 'ENABLED' : 'DISABLED'}`, 'warn');
  }
  if (mockErrorPercentage !== undefined) {
    devopsConfig.mockErrorPercentage = parseInt(mockErrorPercentage) || 0;
    addDevOpsLog('system', `DevOps set simulated network error rate to ${devopsConfig.mockErrorPercentage}%`, 'info');
  }

  res.json({ success: true, config: devopsConfig });
});

app.post('/api/devops/teleport-driver', authenticateDevOps, (req, res) => {
  const { rideId, target } = req.body;

  if (!rideId || !target) {
    res.status(400).json({ error: 'rideId and target ("pickup" or "dropoff") are required.' });
    return;
  }

  const ride = db.rides.find(r => r.id === rideId);
  if (!ride) {
    res.status(404).json({ error: 'Ride record not found.' });
    return;
  }

  if (!ride.driverId) {
    res.status(400).json({ error: 'This ride does not have an assigned driver.' });
    return;
  }

  const driver = db.users.find(u => u.id === ride.driverId);
  if (!driver) {
    res.status(404).json({ error: 'Driver profile not found.' });
    return;
  }

  const targetCoords = target === 'pickup' ? ride.pickup : ride.dropoff;
  if (!driver.location) {
    driver.location = { lat: 0, lng: 0 };
  }

  driver.location.lat = targetCoords.lat;
  driver.location.lng = targetCoords.lng;

  saveDatabase();
  addDevOpsLog('gps', `Teleported driver ${driver.name} instantly to passenger's ${target.toUpperCase()} location.`, 'info');

  res.json({ success: true, driverLocation: driver.location, ride });
});

app.post('/api/devops/reset-db', authenticateDevOps, (req, res) => {
  db = {
    users: [],
    rides: [],
    contacts: [],
    messages: [],
    schedules: []
  };
  seedDatabase();
  addDevOpsLog('database', 'DevOps initiated full system database reset and seeded standard accounts.', 'warn');
  res.json({ success: true });
});

app.post('/api/devops/inject-log', authenticateDevOps, (req, res) => {
  const { category, message, level } = req.body;
  if (message) {
    addDevOpsLog(category || 'system', message, level || 'info');
  }
  res.json({ success: true });
});


// ==================== VITE DEVELOPMENT ENVIRONMENT MIDDLEWARE ====================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    console.log('Vite development server middleware integrated into Express.');
  } else {
    // Serve production static assets from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static asset file server initialized.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failure starting Fullstack Express Server:', err);
});
