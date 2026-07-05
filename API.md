# VibeRide API Documentation

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require JWT token in Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### Register

**POST** `/auth/register`

Create new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "role": "passenger",
  "vehicleType": "sedan",
  "vehicleModel": "Toyota Camry",
  "vehiclePlate": "ABC-123",
  "baseRate": 2.50
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "driver",
    "rating": 5.0,
    "ratingCount": 1,
    "location": {"lat": 37.7749, "lng": -122.4194},
    "driverProfile": {
      "vehicleType": "sedan",
      "vehicleModel": "Toyota Camry",
      "vehiclePlate": "ABC-123",
      "baseRate": 2.50,
      "isOnline": true
    },
    "createdAt": "2026-07-05T15:16:08Z"
  }
}
```

#### Login

**POST** `/auth/login`

Authenticate user and get JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ...user object... }
}
```

#### Get Current User

**GET** `/auth/me`

Get authenticated user profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "user-abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "driver",
  "rating": 5.0,
  "ratingCount": 1,
  "location": {"lat": 37.7749, "lng": -122.4194},
  "driverProfile": {...},
  "createdAt": "2026-07-05T15:16:08Z"
}
```

### Users

#### Get Online Drivers

**GET** `/users/drivers`

Get list of all online drivers.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "driver-carlos",
    "name": "Carlos Santana",
    "rating": 4.9,
    "ratingCount": 124,
    "location": {"lat": 37.7833, "lng": -122.4167},
    "driverProfile": {
      "vehicleType": "electric",
      "vehicleModel": "Tesla Model Y (White)",
      "vehiclePlate": "SF-ELEC-Y",
      "baseRate": 2.50,
      "isOnline": true
    }
  }
]
```

#### Update Profile

**PUT** `/users/profile`

Update user profile information.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "Jane Doe",
  "location": {"lat": 37.7749, "lng": -122.4194},
  "isOnline": true,
  "vehicleType": "suv",
  "vehicleModel": "BMW X5",
  "vehiclePlate": "ABC-123",
  "baseRate": 3.00
}
```

**Response (200):**
```json
{ ...updated user object... }
```

#### Rate User

**POST** `/users/:id/rate`

Submit a rating for a driver or passenger.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "rating": 5
}
```

**Response (200):**
```json
{
  "id": "user-abc123",
  "rating": 4.95,
  "ratingCount": 21
}
```

### Rides

#### Request Ride

**POST** `/rides/request`

Passenger requests a new ride.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "pickup": {"lat": 37.7749, "lng": -122.4194},
  "dropoff": {"lat": 37.7833, "lng": -122.4167},
  "distanceKm": 1.2,
  "durationMin": 8,
  "price": 12.50,
  "driverId": "driver-carlos",
  "polyline": "encoded_polyline_string"
}
```

**Response (201):**
```json
{
  "id": "ride-xyz789",
  "passengerId": "passenger-sarah",
  "passengerName": "Sarah Connor",
  "driverId": null,
  "driverName": null,
  "pickup": {"lat": 37.7749, "lng": -122.4194},
  "dropoff": {"lat": 37.7833, "lng": -122.4167},
  "distanceKm": 1.2,
  "durationMin": 8,
  "price": 12.50,
  "status": "requested",
  "polyline": "encoded_polyline_string",
  "stripePaymentIntentId": null,
  "paymentStatus": "unpaid",
  "createdAt": "2026-07-05T15:16:08Z"
}
```

#### Accept Ride

**POST** `/rides/:id/accept`

Driver accepts a ride request.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "ride-xyz789",
  "status": "accepted",
  "driverId": "driver-carlos",
  "driverName": "Carlos Santana",
  ...other ride fields...
}
```

#### Start Ride

**POST** `/rides/:id/start`

Driver starts the ride (heading to passenger).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "ride-xyz789",
  "status": "ongoing",
  ...other ride fields...
}
```

#### Complete Ride

**POST** `/rides/:id/complete`

Driver marks ride as completed.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "ride-xyz789",
  "status": "completed",
  ...other ride fields...
}
```

#### Cancel Ride

**POST** `/rides/:id/cancel`

Cancel an active ride (passenger or driver).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "ride-xyz789",
  "status": "cancelled",
  ...other ride fields...
}
```

#### Get Active Ride

**GET** `/rides/active`

Get user's current active ride (if any).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": "ride-xyz789",
  "status": "ongoing",
  "driverLocation": {"lat": 37.776, "lng": -122.418},
  "driverVehicle": {
    "vehicleType": "electric",
    "vehicleModel": "Tesla Model Y",
    "vehiclePlate": "SF-ELEC-Y"
  },
  ...other ride fields...
}
```

#### Get Ride History

**GET** `/rides/history`

Get completed and cancelled rides.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "ride-abc123",
    "status": "completed",
    ...ride object...
  }
]
```

### Messages

#### Get Messages

**GET** `/messages?contactId=<id>&rideId=<id>`

Get message history with contact or for specific ride.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `contactId` (optional) - Get messages with specific contact
- `rideId` (optional) - Get messages for specific ride

**Response (200):**
```json
[
  {
    "id": "msg-1",
    "rideId": null,
    "senderId": "passenger-sarah",
    "receiverId": "driver-carlos",
    "content": "Hey Carlos! I loved our last scheduled trip.",
    "timestamp": "2026-07-05T13:16:08Z"
  }
]
```

#### Send Message

**POST** `/messages/send`

Send a new message to another user.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "receiverId": "driver-carlos",
  "rideId": null,
  "content": "Can you pick me up in 10 minutes?"
}
```

**Response (201):**
```json
{
  "id": "msg-xyz789",
  "rideId": null,
  "senderId": "passenger-sarah",
  "receiverId": "driver-carlos",
  "content": "Can you pick me up in 10 minutes?",
  "timestamp": "2026-07-05T15:16:08Z"
}
```

### Contacts

#### Get Contacts

**GET** `/contacts`

Get all contacts for authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "contact-1",
    "userId": "passenger-sarah",
    "contactId": "driver-carlos",
    "contactName": "Carlos Santana",
    "contactEmail": "carlos@rideshare.com",
    "contactRole": "driver",
    "customRate": 2.10,
    "createdAt": "2026-07-05T15:16:08Z"
  }
]
```

#### Add Contact

**POST** `/contacts/add`

Add a contact to your favorites.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "contactId": "driver-carlos",
  "customRate": 2.10
}
```

**Response (201):**
```json
{
  "id": "contact-xyz789",
  ...contact object...
}
```

#### Update Contact Rate

**PUT** `/contacts/:id/rate`

Update custom rate for a contact.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "customRate": 2.00
}
```

**Response (200):**
```json
{ ...updated contact object... }
```

### Scheduled Trips

#### Get Schedules

**GET** `/schedules`

Get all scheduled trips for user.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
[
  {
    "id": "schedule-1",
    "passengerId": "passenger-sarah",
    "passengerName": "Sarah Connor",
    "driverId": "driver-carlos",
    "driverName": "Carlos Santana",
    "pickup": {
      "address": "Ferry Building, San Francisco, CA",
      "lat": 37.7955,
      "lng": -122.3937
    },
    "dropoff": {
      "address": "Golden Gate Park, San Francisco, CA",
      "lat": 37.7694,
      "lng": -122.4862
    },
    "scheduledTime": "17:30",
    "recurring": true,
    "recurringDays": ["Mon", "Wed", "Fri"],
    "status": "scheduled",
    "createdAt": "2026-07-05T15:16:08Z"
  }
]
```

#### Create Schedule

**POST** `/schedules/create`

Create a new recurring trip schedule.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "driverId": "driver-carlos",
  "pickup": {
    "address": "Ferry Building, San Francisco, CA",
    "lat": 37.7955,
    "lng": -122.3937
  },
  "dropoff": {
    "address": "Golden Gate Park, San Francisco, CA",
    "lat": 37.7694,
    "lng": -122.4862
  },
  "scheduledTime": "17:30",
  "recurring": true,
  "recurringDays": ["Mon", "Wed", "Fri"]
}
```

**Response (201):**
```json
{ ...schedule object... }
```

#### Cancel Schedule

**POST** `/schedules/:id/cancel`

Cancel a scheduled trip.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "message": "Scheduled trip cancelled successfully"
}
```

### Payments

#### Create Payment Intent

**POST** `/payments/create-intent`

Create Stripe payment intent for ride.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "amount": 12.50,
  "rideId": "ride-xyz789"
}
```

**Response (200):**
```json
{
  "clientSecret": "x402_secret_...",
  "isSimulation": false,
  "paymentIntentId": "x402_pi_..."
}
```

#### Confirm Payment

**POST** `/payments/confirm`

Confirm payment for ride.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "rideId": "ride-xyz789",
  "paymentIntentId": "x402_pi_..."
}
```

**Response (200):**
```json
{
  "success": true,
  "ride": { ...ride object... }
}
```

### Destinations (Geocoding)

#### Get Destinations

**POST** `/destinations`

Get navigation points for destination using Google Maps API.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "placeId": "ChIJIQBpAG2ahYAR_6128GltTXQ",
  "address": "Golden Gate Park, San Francisco",
  "lat": 37.7694,
  "lng": -122.4862
}
```

**Response (200):**
```json
{
  "destinations": [
    {
      "displayName": "Golden Gate Park",
      "navigationPoints": [
        {
          "navigationPointToken": "nav_tok_main_...",
          "displayName": "Main Entrance / Lobby Walkway",
          "travelModes": ["DRIVE"],
          "usages": ["PICKUP", "DROPOFF"],
          "location": {"lat": 37.7694, "lng": -122.4862}
        }
      ]
    }
  ]
}
```

### DevOps Dashboard

#### DevOps Login

**POST** `/devops/login`

Authenticate to DevOps dashboard.

**Request:**
```json
{
  "passcode": "admin123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "admin123"
}
```

#### Get System Status

**GET** `/devops/status`

Get system health, stats, and logs.

**Headers:** `X-DevOps-Token: admin123`

**Response (200):**
```json
{
  "stats": {
    "uptime": 3600,
    "memory": {
      "rss": "150 MB",
      "heapTotal": "200 MB",
      "heapUsed": "80 MB"
    }
  },
  "config": {
    "simulationSpeed": 1.0,
    "driftEnabled": true,
    "maintenanceMode": false,
    "mockErrorPercentage": 0
  },
  "database": {
    "usersCount": 5,
    "passengersCount": 2,
    "driversCount": 3,
    "onlineDriversCount": 3,
    "rides": {
      "requested": 0,
      "accepted": 1,
      "ongoing": 0,
      "completed": 5,
      "cancelled": 0,
      "total": 6
    },
    "schedulesCount": 1,
    "messagesCount": 2
  },
  "users": [...],
  "rides": [...],
  "logs": [...]
}
```

#### Update Config

**POST** `/devops/config`

Update simulation configuration.

**Headers:** `X-DevOps-Token: admin123`

**Request:**
```json
{
  "simulationSpeed": 2.0,
  "driftEnabled": false,
  "maintenanceMode": false,
  "mockErrorPercentage": 5
}
```

**Response (200):**
```json
{
  "success": true,
  "config": { ...updated config... }
}
```

#### Teleport Driver

**POST** `/devops/teleport-driver`

Instantly teleport driver to pickup or dropoff location (testing only).

**Headers:** `X-DevOps-Token: admin123`

**Request:**
```json
{
  "rideId": "ride-xyz789",
  "target": "pickup"
}
```

**Response (200):**
```json
{
  "success": true,
  "driverLocation": {"lat": 37.7749, "lng": -122.4194},
  "ride": { ...ride object... }
}
```

#### Reset Database

**POST** `/devops/reset-db`

Reset entire database and reseed default data.

**Headers:** `X-DevOps-Token: admin123`

**Response (200):**
```json
{
  "success": true
}
```

#### Inject Log

**POST** `/devops/inject-log`

Add custom log entry for testing.

**Headers:** `X-DevOps-Token: admin123`

**Request:**
```json
{
  "category": "system",
  "message": "Custom test message",
  "level": "info"
}
```

**Response (200):**
```json
{
  "success": true
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable error message"
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (missing/invalid params)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Server Error
- `503` - Service Unavailable (maintenance mode)

## Real-time Updates

#### Get Updates

**GET** `/updates`

Get current state deltas (rides, messages, drivers, schedules).

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "rides": [...pending rides for user...],
  "messages": [...all messages involving user...],
  "activeRide": {...current active ride or null...},
  "drivers": [...all online drivers...],
  "schedules": [...user's schedules...]
}
```
