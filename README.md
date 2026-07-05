# VibeRide 🚗

**Modern rideshare social platform** with real-time GPS tracking, scheduled trips, messaging, and secure Stripe payments.

## ✨ Features

### Passenger Features
- 🗺️ Real-time ride requests with live driver tracking
- 💬 In-app messaging with drivers
- 📅 Schedule recurring commutes
- ⭐ Rate and review drivers
- 💳 Secure Stripe payments
- 👥 Save favorite drivers as contacts

### Driver Features
- 📍 Live GPS tracking and drift simulation
- 📋 Accept/manage ride requests
- 💰 Custom pricing per contact
- ⏰ Scheduled route planning
- 📞 Direct messaging with passengers
- 🚙 Vehicle profile management

### Admin Features
- 📊 Real-time DevOps dashboard
- 🎮 Simulation controls (speed, GPS drift)
- 🔧 System maintenance mode
- 📝 Comprehensive audit logs

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS + Motion animations
- **Backend**: Express.js + Node.js with TypeScript
- **Build**: Vite + Tailwind 4 + esbuild
- **Database**: JSON-based (local) with full CRUD operations
- **Authentication**: JWT with bcryptjs password hashing
- **Payments**: Stripe SDK (fallback to simulation mode)
- **Geolocation**: Google Maps Platform integration
- **UI Components**: Lucide React icons

## 📋 Prerequisites

- **Node.js** 18+ (recommended: 20 LTS)
- **npm** 9+ or **yarn** 4+
- **Git**

### Optional API Keys

- [Gemini API Key](https://ai.google.dev) - for AI features (optional)
- [Google Maps Platform API](https://cloud.google.com/maps-platform) - for advanced geocoding (optional)
- [Stripe Secret Key](https://stripe.com) - for real payments (falls back to sandbox mode)

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Mahmoud-Saifelnasr/viberide.git
cd viberide
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys (optional - app works with defaults):

```env
GEMINI_API_KEY=sk-...
GOOGLE_MAPS_PLATFORM_KEY=AIza...
STRIPE_SECRET_KEY=sk_test_...
JWT_SECRET=your-super-secret-key-change-in-production
DEVOPS_PASSCODE=admin123
```

### 3. Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

### 4. Build for Production

```bash
npm run build
npm run start
```

## 📚 Project Structure

```
viberide/
├── src/
│   ├── components/          # Reusable React components
│   ├── pages/               # Page-level components
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API client functions
│   ├── types/               # TypeScript interfaces
│   ├── utils/               # Helper functions
│   ├── styles/              # Global styles
│   └── App.tsx              # Root component
├── public/                  # Static assets
├── server.ts                # Express backend server
├── vite.config.ts           # Vite build configuration
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.ts       # Tailwind CSS config
├── package.json             # Dependencies & scripts
├── .env.example             # Environment template
└── db.json                  # Local database (generated at runtime)
```

## 🔌 API Routes

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile

### Rides
- `POST /api/rides/request` - Request a ride
- `POST /api/rides/:id/accept` - Driver accepts ride
- `POST /api/rides/:id/start` - Start active ride
- `POST /api/rides/:id/complete` - Complete ride
- `POST /api/rides/:id/cancel` - Cancel ride
- `GET /api/rides/active` - Get active ride
- `GET /api/rides/history` - Get ride history

### Messaging
- `GET /api/messages` - Get messages
- `POST /api/messages/send` - Send message

### Contacts & Scheduling
- `GET /api/contacts` - Get contacts
- `POST /api/contacts/add` - Add contact
- `PUT /api/contacts/:id/rate` - Set custom rate
- `GET /api/schedules` - Get scheduled trips
- `POST /api/schedules/create` - Create scheduled trip
- `POST /api/schedules/:id/cancel` - Cancel scheduled trip

### Payments
- `POST /api/payments/create-intent` - Create Stripe payment intent
- `POST /api/payments/confirm` - Confirm payment

### DevOps Dashboard
- `POST /api/devops/login` - Authenticate to dashboard
- `GET /api/devops/status` - Get system status
- `POST /api/devops/config` - Update simulation config
- `POST /api/devops/teleport-driver` - Teleport driver to location (testing)
- `POST /api/devops/reset-db` - Reset database

## 🔐 Default Test Accounts

After first run, seed data is auto-generated:

**Drivers:**
- Email: `carlos@rideshare.com` | Password: `password123`
- Email: `sofia@rideshare.com` | Password: `password123`
- Email: `marcus@rideshare.com` | Password: `password123`

**Passengers:**
- Email: `sarah@rideshare.com` | Password: `password123`
- Email: `john@rideshare.com` | Password: `password123`

**DevOps Dashboard:**
- Passcode: `admin123`

## 🎮 Development Commands

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm run start

# Type check (no emit)
npm run lint
```

## 🗄️ Database

The app uses a `db.json` file stored locally:

```json
{
  "users": [...],
  "rides": [...],
  "contacts": [...],
  "messages": [...],
  "schedules": [...]
}
```

**Reset database:** Use DevOps dashboard endpoint or delete `db.json` and restart.

## 🚀 Deployment

### Heroku

```bash
heroku create viberide
heroku config:set JWT_SECRET=your_secret
heroku config:set STRIPE_SECRET_KEY=sk_...
git push heroku main
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

## 🧪 Testing

```bash
# Request a ride
curl -X POST http://localhost:3000/api/rides/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": {"lat": 37.7749, "lng": -122.4194},
    "dropoff": {"lat": 37.7833, "lng": -122.4167},
    "distanceKm": 1.2,
    "durationMin": 8,
    "price": 12.50
  }'
```

## 📝 License

Apache 2.0 - See LICENSE file

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📧 Support

For issues and questions, please open a GitHub issue.

---

**Built with ❤️ by Mahmoud Saifelnasr**
