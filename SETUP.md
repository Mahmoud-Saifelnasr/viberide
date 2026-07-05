# VibeRide Setup Guide

## Development Environment Setup

### Prerequisites Check

```bash
node --version  # Should be v18+ (ideally v20 LTS)
npm --version   # Should be 9+
git --version   # Should be installed
```

### Step 1: Clone Repository

```bash
git clone https://github.com/Mahmoud-Saifelnasr/viberide.git
cd viberide
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs:
- React 19 & React DOM
- Express.js server framework
- TypeScript compiler
- Vite build tool
- Tailwind CSS 4
- Stripe SDK
- JWT & bcryptjs for auth
- And more...

### Step 3: Configure Environment

**Copy the example file:**
```bash
cp .env.example .env.local
```

**Edit `.env.local` (minimum required):**
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=change_me_to_random_string_in_production
DEVOPS_PASSCODE=admin123
```

**Optional - Add API Keys:**

#### Google Gemini API (for AI features)
1. Go to [Google AI Studio](https://ai.google.dev)
2. Click "Create API Key"
3. Copy key to `.env.local`:
   ```env
   GEMINI_API_KEY=AIza...
   ```

#### Google Maps Platform (for advanced geocoding)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable Maps APIs
3. Create API key with restrictions
4. Add to `.env.local`:
   ```env
   GOOGLE_MAPS_PLATFORM_KEY=AIza...
   ```

#### Stripe (for real payment processing)
1. Create [Stripe account](https://stripe.com)
2. Get secret key from Dashboard
3. Add to `.env.local`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   ```

**Note:** All API keys are optional. App works in simulation/sandbox mode without them.

### Step 4: Start Development Server

```bash
npm run dev
```

You should see:
```
✓ vite v6.2.3 building SSR bundle
✓ built in 2.34s
Vite development server middleware integrated into Express.
Server is running at http://0.0.0.0:3000
```

**Open browser:** http://localhost:3000

### Step 5: Login with Test Account

Default seeded accounts (auto-generated on first run):

**Passenger Login:**
- Email: `sarah@rideshare.com`
- Password: `password123`

**Driver Login:**
- Email: `carlos@rideshare.com`
- Password: `password123`

### Step 6: Access DevOps Dashboard (Optional)

1. Open DevOps section in app
2. Enter passcode: `admin123`
3. Control simulation speed, GPS drift, maintenance mode
4. View real-time logs

## Project Structure Explained

```
viberide/
│
├── src/                          # Frontend React application
│   ├── components/               # Reusable React components
│   │   ├── Navbar.tsx
│   │   ├── RideCard.tsx
│   │   ├── DriverMap.tsx
│   │   └── ...
│   ├── pages/                    # Full-page components (route views)
│   │   ├── Passenger.tsx
│   │   ├── Driver.tsx
│   │   ├── Dashboard.tsx
│   │   └── ...
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAuth.ts            # Authentication hook
│   │   ├── useRide.ts            # Ride state management
│   │   └── ...
│   ├── services/                 # API client functions
│   │   ├── authService.ts        # Auth endpoints
│   │   ├── rideService.ts        # Ride endpoints
│   │   ├── messageService.ts     # Messaging endpoints
│   │   └── ...
│   ├── types/                    # TypeScript interfaces
│   │   └── index.ts              # All shared types
│   ├── utils/                    # Helper functions
│   │   ├── formatters.ts         # Format date, currency, etc
│   │   ├── validators.ts         # Input validation
│   │   └── ...
│   ├── styles/                   # Global CSS
│   │   └── globals.css
│   ├── App.tsx                   # Root component with routing
│   └── main.tsx                  # React DOM entry point
│
├── public/                       # Static assets (images, fonts, etc)
│
├── server.ts                     # Express backend server
│   ├── Auth routes
│   ├── Rides routes
│   ├── Messages routes
│   ├── Payments routes
│   ├── DevOps routes
│   └── Database persistence
│
├── vite.config.ts                # Vite build configuration
├── tsconfig.json                 # TypeScript compiler options
├── tailwind.config.ts            # Tailwind CSS theming
├── package.json                  # Dependencies & npm scripts
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
└── db.json                       # Auto-generated local database
```

## Common Tasks

### Adding a New Feature

1. **Create service** (API calls):
   ```typescript
   // src/services/newService.ts
   export const newFeatureAPI = async (data: any) => {
     const res = await fetch('/api/new-feature', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(data)
     });
     return res.json();
   };
   ```

2. **Create hook** (state management):
   ```typescript
   // src/hooks/useNewFeature.ts
   import { useState } from 'react';
   import { newFeatureAPI } from '../services/newService';

   export function useNewFeature() {
     const [data, setData] = useState(null);
     const [loading, setLoading] = useState(false);

     const fetchData = async () => {
       setLoading(true);
       const result = await newFeatureAPI();
       setData(result);
       setLoading(false);
     };

     return { data, loading, fetchData };
   }
   ```

3. **Create component**:
   ```typescript
   // src/components/NewFeature.tsx
   import { useNewFeature } from '../hooks/useNewFeature';

   export function NewFeature() {
     const { data, loading, fetchData } = useNewFeature();

     return (
       <div>
         {/* Component JSX */}
       </div>
     );
   }
   ```

### Adding a Backend Route

1. Add endpoint to `server.ts`:
   ```typescript
   app.post('/api/new-endpoint', authenticateToken, (req: AuthenticatedRequest, res) => {
     // Route logic
     res.json({ success: true });
   });
   ```

2. Add service method:
   ```typescript
   export const newEndpointAPI = async (data: any) => {
     const token = localStorage.getItem('token');
     const res = await fetch('/api/new-endpoint', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${token}`
       },
       body: JSON.stringify(data)
     });
     return res.json();
   };
   ```

## Troubleshooting

### Port 3000 Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or change port in .env.local
PORT=3001
```

### Node Modules Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
# Type check
npm run lint

# Clear TypeScript cache
rm -rf .tsc-out
```

### Database Issues
```bash
# Reset database
rm db.json
# Restart server - it will auto-seed
npm run dev
```

## Next Steps

- [ ] Review [API Documentation](./API.md)
- [ ] Check [Architecture Guide](./ARCHITECTURE.md)
- [ ] Set up [Git workflow](./CONTRIBUTING.md)
- [ ] Deploy to [Heroku or Docker](./DEPLOYMENT.md)

## Need Help?

- Check GitHub Issues
- Review `server.ts` for backend logic
- Check React components in `src/` for frontend
- Run `npm run lint` to catch type errors
