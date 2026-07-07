import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Activity, 
  Database, 
  Terminal, 
  ShieldAlert, 
  RefreshCw, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  Sliders, 
  Trash2, 
  PlusCircle, 
  SlidersHorizontal,
  Compass,
  AlertCircle,
  Clock,
  User,
  MapPin,
  MessageSquare
} from 'lucide-react';

interface DevOpsConfig {
  simulationSpeed: number;
  driftEnabled: boolean;
  maintenanceMode: boolean;
  mockErrorPercentage: number;
}

interface DevOpsLog {
  timestamp: string;
  category: 'system' | 'gps' | 'database' | 'network' | 'payment';
  message: string;
  level: 'info' | 'warn' | 'error';
}

interface UserDetail {
  id: string;
  email: string;
  name: string;
  role: 'passenger' | 'driver';
  rating: number;
  ratingCount: number;
  location?: { lat: number; lng: number };
  driverProfile?: {
    vehicleType: string;
    vehicleModel: string;
    vehiclePlate: string;
    baseRate: number;
    isOnline: boolean;
  };
}

interface RideDetail {
  id: string;
  passengerId: string;
  passengerName: string;
  driverId: string | null;
  driverName: string | null;
  status: string;
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address: string; lat: number; lng: number };
  price: number;
  paymentStatus: string;
}

export default function DevOpsDashboard() {
  const [devopsToken, setDevopsToken] = useState<string>(sessionStorage.getItem('devops_token') || '');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [config, setConfig] = useState<DevOpsConfig>({
    simulationSpeed: 1.0,
    driftEnabled: true,
    maintenanceMode: false,
    mockErrorPercentage: 0
  });
  const [database, setDatabase] = useState<any>({});
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [rides, setRides] = useState<RideDetail[]>([]);
  const [logs, setLogs] = useState<DevOpsLog[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  
  // Custom log injector states
  const [customMsg, setCustomMsg] = useState('');
  const [customCat, setCustomCat] = useState<'system' | 'gps' | 'database' | 'network' | 'payment'>('system');
  const [customLevel, setCustomLevel] = useState<'info' | 'warn' | 'error'>('info');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchStatus = async (tokenOverride?: string) => {
    const activeToken = tokenOverride !== undefined ? tokenOverride : devopsToken;
    if (!activeToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/devops/status', {
        headers: {
          'x-devops-token': activeToken
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setConfig(data.config);
        setDatabase(data.database);
        setUsers(data.users);
        setRides(data.rides);
        setLogs(data.logs);
      } else if (res.status === 401) {
        setDevopsToken('');
        sessionStorage.removeItem('devops_token');
      }
    } catch (err) {
      console.error('Error fetching DevOps status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (devopsToken) {
      fetchStatus();
      const interval = setInterval(() => fetchStatus(), 3000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [devopsToken]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcodeInput.trim()) return;
    setAuthenticating(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/devops/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput })
      });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('devops_token', data.token);
        setDevopsToken(data.token);
        triggerToast('DevOps identity authorized!');
        fetchStatus(data.token);
      } else {
        const data = await res.json();
        setAuthError(data.error || 'Invalid passcode');
      }
    } catch (err) {
      setAuthError('Failed to communicate with devops gateway');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleUpdateConfig = async (updatedFields: Partial<DevOpsConfig>) => {
    try {
      const res = await fetch('/api/devops/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-devops-token': devopsToken
        },
        body: JSON.stringify(updatedFields)
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        triggerToast('Configuration updated successfully!');
      } else if (res.status === 401) {
        setDevopsToken('');
        sessionStorage.removeItem('devops_token');
      }
    } catch (err) {
      console.error('Error updating DevOps configuration:', err);
    }
  };

  const handleTeleport = async (rideId: string, target: 'pickup' | 'dropoff') => {
    try {
      const res = await fetch('/api/devops/teleport-driver', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-devops-token': devopsToken
        },
        body: JSON.stringify({ rideId, target })
      });
      if (res.ok) {
        triggerToast(`Driver teleported to passenger's ${target} coordinates!`);
        fetchStatus();
      } else if (res.status === 401) {
        setDevopsToken('');
        sessionStorage.removeItem('devops_token');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to teleport driver');
      }
    } catch (err) {
      console.error('Error teleporting driver:', err);
    }
  };

  const handleResetDB = async () => {
    if (!window.confirm('WARNING: This will wipe out all custom rides, chats, schedules, and revert users to default mock profiles. Proceed?')) {
      return;
    }
    try {
      const res = await fetch('/api/devops/reset-db', { 
        method: 'POST',
        headers: {
          'x-devops-token': devopsToken
        }
      });
      if (res.ok) {
        triggerToast('System database completely reset and reseeded!');
        fetchStatus();
      } else if (res.status === 401) {
        setDevopsToken('');
        sessionStorage.removeItem('devops_token');
      }
    } catch (err) {
      console.error('Error resetting DB:', err);
    }
  };

  const handleInjectLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) return;
    try {
      const res = await fetch('/api/devops/inject-log', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-devops-token': devopsToken
        },
        body: JSON.stringify({
          category: customCat,
          message: customMsg,
          level: customLevel
        })
      });
      if (res.ok) {
        setCustomMsg('');
        triggerToast('Custom DevOps log message injected.');
        fetchStatus();
      } else if (res.status === 401) {
        setDevopsToken('');
        sessionStorage.removeItem('devops_token');
      }
    } catch (err) {
      console.error('Error injecting log:', err);
    }
  };

  const triggerToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => {
      setActionSuccess(null);
    }, 4000);
  };

  const filteredLogs = logs.filter(log => {
    const catMatch = selectedCategory === 'all' || log.category === selectedCategory;
    const levelMatch = selectedLevel === 'all' || log.level === selectedLevel;
    return catMatch && levelMatch;
  });

  const getLogBadgeColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'warn': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-sky-50 text-sky-700 border-sky-100';
    }
  };

  const getLogCatIcon = (category: string) => {
    switch (category) {
      case 'gps': return '📍';
      case 'database': return '🗄️';
      case 'payment': return '💳';
      case 'network': return '🌐';
      default: return '⚙️';
    }
  };

  if (!devopsToken) {
    return (
      <div id="devops-auth-container" className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Banner */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
          <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
            <ShieldAlert className="w-6 h-6 animate-pulse text-indigo-400" />
          </div>
          <h2 className="text-white text-lg font-bold font-sans tracking-tight">DevOps Gateway Access</h2>
          <p className="text-indigo-400 text-xs mt-1 font-medium font-mono uppercase tracking-wider">AUTHORIZED PERSONNEL ONLY</p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAuthSubmit} className="p-6 space-y-4">
          <p className="text-slate-600 text-xs leading-relaxed">
            This administrative dashboard coordinates hot container simulations, live GPS interpolation speeds, and raw database seeding. Secure passcode verification is required to fetch or update telemetry records.
          </p>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Administrative Passcode
            </label>
            <input
              type="password"
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              placeholder="Enter administrator passcode"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 font-mono transition-all"
              required
            />
          </div>

          {authError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={authenticating}
            className="w-full bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-300 text-white py-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
          >
            {authenticating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Authorizing Session...</span>
              </>
            ) : (
              <>
                <Terminal className="w-4 h-4" />
                <span>Verify & Enter Console</span>
              </>
            )}
          </button>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-[11px] text-slate-500 leading-normal flex items-start gap-2">
            <span className="text-amber-500 text-xs shrink-0">💡</span>
            <p>
              <strong>Tip:</strong> The secure administrative passcode is defined as <code>DEVOPS_PASSCODE</code> in your environment configuration (defaults to <code>admin123</code>).
            </p>
          </div>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div id="devops-loading" className="flex flex-col items-center justify-center p-12 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-mono font-medium">Acquiring container DevOps metrics...</p>
      </div>
    );
  }

  const activeRidesList = rides.filter(r => ['requested', 'accepted', 'ongoing'].includes(r.status));

  return (
    <div id="devops-root" className="space-y-6">
      {/* Top Warning HUD & Custom Alert Banner */}
      {actionSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-black text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-slate-800 flex items-center gap-2 animate-bounce">
          <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
          <span className="font-mono font-bold">{actionSuccess}</span>
        </div>
      )}

      {/* DevOps Dashboard Title Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl -z-10" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-550/25 border border-indigo-500/30 text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
              <Server className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider font-mono">
                  Container Ingress Active
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <h2 className="text-2xl font-black tracking-tight font-display mt-1">
                DevOps Control Console
              </h2>
              <p className="text-slate-400 text-xs font-mono mt-0.5">
                Real-Time Health Inspection, Database CRUD States & Simulation Tuning
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleResetDB}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer shadow-md"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Full Reset DB</span>
            </button>
            <button
              onClick={fetchStatus}
              className="flex items-center gap-1.5 bg-indigo-655 hover:bg-indigo-600 active:rotate-45 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Force Refetch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Diagnostics, Configuration and Active Teleport */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* BENTO CARD 1: Dynamic Telemetry Metrics */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-4 font-mono">
              <Activity className="w-4 h-4 text-slate-500" />
              System Telemetry & Database Volumes
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] font-mono font-extrabold uppercase">Server Uptime</span>
                <span className="text-lg font-black text-slate-900 font-mono mt-1">
                  {Math.round(stats?.uptime || 0)}s
                </span>
                <span className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  Continuous runtime
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] font-mono font-extrabold uppercase">V8 Heap Alloc</span>
                <span className="text-lg font-black text-slate-900 font-mono mt-1">
                  {stats?.memory?.heapUsed || 'N/A'}
                </span>
                <span className="text-[9px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                  Limit: {stats?.memory?.heapTotal || 'N/A'}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-slate-400 text-[10px] font-mono font-extrabold uppercase">Error Rate</span>
                <span className={`text-lg font-black mt-1 font-mono ${config.mockErrorPercentage > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {config.mockErrorPercentage}%
                </span>
                <span className="text-[9px] text-slate-400 mt-1">
                  Simulated API loss
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="border border-slate-150 p-3 rounded-xl text-center">
                <span className="block text-[18px] font-extrabold text-slate-900 font-mono">{database.usersCount || 0}</span>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Total Users</span>
              </div>
              <div className="border border-slate-150 p-3 rounded-xl text-center">
                <span className="block text-[18px] font-extrabold text-indigo-600 font-mono">{database.onlineDriversCount || 0}</span>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Online Drivers</span>
              </div>
              <div className="border border-slate-150 p-3 rounded-xl text-center">
                <span className="block text-[18px] font-extrabold text-emerald-600 font-mono">{database.rides?.active || (database.rides?.requested + database.rides?.accepted + database.rides?.ongoing) || 0}</span>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Active Rides</span>
              </div>
              <div className="border border-slate-150 p-3 rounded-xl text-center">
                <span className="block text-[18px] font-extrabold text-slate-700 font-mono">{database.schedulesCount || 0}</span>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Schedules</span>
              </div>
            </div>
          </div>

          {/* BENTO CARD 2: Active Component Tuning & Simulation Speed */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Sliders className="w-4 h-4 text-slate-500" />
              Simulation tuning & DevOps overrides
            </h3>

            {/* Slider 1: GPS Speed Simulation Multiplier */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1 font-mono">
                  ⚡ GPS Simulation Speed
                </span>
                <span className="text-xs font-black font-mono bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md">
                  {config.simulationSpeed}x speed multiplier
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Modifies the linear step multiplier when drivers are en route or on ongoing trips.
              </p>
              <div className="flex gap-2 pt-1">
                {[0, 0.5, 1.0, 2.0, 4.0].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleUpdateConfig({ simulationSpeed: speed })}
                    className={`flex-1 font-mono text-[10px] font-extrabold py-1.5 rounded-lg border transition-all cursor-pointer ${
                      config.simulationSpeed === speed
                        ? 'bg-black text-white border-black'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {speed === 0 ? 'PAUSE' : `${speed}x`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
              {/* Toggle: GPS Drift simulation */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>🗺️ Driver Idle GPS Drift</span>
                  <input
                    type="checkbox"
                    checked={config.driftEnabled}
                    onChange={(e) => handleUpdateConfig({ driftEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                </label>
                <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                  Generates realistic GPS micro-drifts for online drivers to simulate waiting traffic.
                </p>
              </div>

              {/* Slider 2: Mock network error percentage */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-slate-700">📶 Network Loss Ratio</span>
                  <span className="text-xs font-bold font-mono text-slate-500">{config.mockErrorPercentage}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={config.mockErrorPercentage}
                  onChange={(e) => handleUpdateConfig({ mockErrorPercentage: parseInt(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
                <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                  Injects artificial network failure codes for debugging resilient retries in API pipelines.
                </p>
              </div>
            </div>

            {/* Maintenance Mode HUD block */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
              config.maintenanceMode 
                ? 'bg-rose-50 border-rose-200 text-rose-900' 
                : 'bg-slate-50 border-slate-150 text-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  config.maintenanceMode ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono">Maintenance Mode Gate</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {config.maintenanceMode ? 'Blocking non-DevOps ingress with 503 errors' : 'Open for standard passenger commutes'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleUpdateConfig({ maintenanceMode: !config.maintenanceMode })}
                className={`text-[10px] font-black uppercase px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                  config.maintenanceMode
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md hover:bg-rose-700'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {config.maintenanceMode ? 'Disable' : 'Enable Gate'}
              </button>
            </div>
          </div>

          {/* BENTO CARD 3: Interactive Developer Teleport Control Center */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />
                Instant Teleport & Test Controller
              </h3>
              <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold px-2 py-0.5 rounded uppercase font-mono">
                {activeRidesList.length} Active Rides
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-mono">
              Bypass waiting for slow interval movements. Use the buttons below to teleport drivers instantly to passenger coordinates to test trip state machine triggers.
            </p>

            {activeRidesList.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 p-6 rounded-2xl text-center">
                <Compass className="w-8 h-8 mx-auto text-slate-300 animate-spin mb-2" />
                <p className="text-xs text-slate-500 font-bold">No active rides are being run currently</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  Login as Sarah Connor or Carlos Santana, and request a ride to see live GPS tracking teleport controls!
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {activeRidesList.map((ride) => {
                  return (
                    <div key={ride.id} className="border border-slate-150 rounded-2xl p-4 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black font-mono text-slate-900">
                            ID: {ride.id.substring(0, 8)}
                          </span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                            ride.status === 'requested' ? 'bg-amber-100 text-amber-800' :
                            ride.status === 'accepted' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {ride.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium">
                          <strong>Passenger:</strong> {ride.passengerName}
                        </p>
                        <p className="text-[11px] text-slate-600 font-medium">
                          <strong>Driver:</strong> {ride.driverName || 'None assigned yet'}
                        </p>
                        <div className="text-[9px] text-slate-400 font-mono space-y-0.5 pt-1">
                          <div className="flex items-center gap-1">
                            <span className="text-rose-500">📍</span> 
                            <span className="truncate max-w-[200px]">Pickup: {ride.pickup.address}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-indigo-500">📍</span> 
                            <span className="truncate max-w-[200px]">Dropoff: {ride.dropoff.address}</span>
                          </div>
                        </div>
                      </div>

                      {ride.driverId ? (
                        <div className="flex sm:flex-col gap-2 shrink-0">
                          <button
                            onClick={() => handleTeleport(ride.id, 'pickup')}
                            className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-extrabold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm text-center"
                          >
                            📍 Teleport to Pickup
                          </button>
                          <button
                            onClick={() => handleTeleport(ride.id, 'dropoff')}
                            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-extrabold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-sm text-center"
                          >
                            🏆 Teleport to Dropoff
                          </button>
                        </div>
                      ) : (
                        <div className="text-[10px] font-mono text-slate-400 bg-white border border-slate-150 p-2.5 rounded-xl flex items-center justify-center">
                          Waiting for Driver Acceptance...
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Live Event Terminal logs, and User component details */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* BENTO CARD 4: Live Event Logs Terminal */}
          <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col h-[520px]">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Terminal className="w-4 h-4 text-indigo-400" />
                Live Event Logger & Terminal
              </h3>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Logs Filters */}
            <div className="flex flex-wrap gap-1.5 mb-4 shrink-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-[10px] font-mono font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">ALL CATS</option>
                <option value="system">⚙️ SYSTEM</option>
                <option value="gps">📍 GPS</option>
                <option value="database">🗄️ DATABASE</option>
                <option value="network">🌐 NETWORK</option>
                <option value="payment">💳 PAYMENT</option>
              </select>

              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-[10px] font-mono font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">ALL LEVELS</option>
                <option value="info">🟢 INFO</option>
                <option value="warn">🟡 WARN</option>
                <option value="error">🔴 ERROR</option>
              </select>

              <button
                onClick={() => setLogs([])}
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[9px] font-mono font-black uppercase px-2 py-1 rounded-lg transition-all border border-slate-700 ml-auto cursor-pointer"
              >
                Clear Terminal
              </button>
            </div>

            {/* Scrollable logs screen in pure retro style */}
            <div className="flex-1 bg-slate-950 border border-slate-850 rounded-2xl p-4 overflow-y-auto space-y-3 font-mono text-[10px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
              {filteredLogs.length === 0 ? (
                <div className="text-slate-600 text-center py-12">
                  No telemetry logged matching filter criteria.
                </div>
              ) : (
                filteredLogs.slice().reverse().map((log, idx) => {
                  const dateStr = new Date(log.timestamp).toLocaleTimeString();
                  let levelColor = 'text-sky-400';
                  if (log.level === 'warn') levelColor = 'text-amber-400';
                  if (log.level === 'error') levelColor = 'text-rose-500';

                  return (
                    <div key={idx} className="border-b border-slate-900/40 pb-2 flex items-start gap-1.5">
                      <span className="text-slate-500 select-none shrink-0">{dateStr}</span>
                      <span className="text-slate-400 select-none shrink-0 font-bold">
                        [{getLogCatIcon(log.category)} {log.category.toUpperCase()}]
                      </span>
                      <span className={`${levelColor} font-semibold shrink-0`}>
                        {log.level.toUpperCase()}:
                      </span>
                      <span className="text-slate-200 break-all">{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Custom Log Injector Tool */}
            <form onSubmit={handleInjectLog} className="mt-4 pt-3 border-t border-slate-800/80 flex gap-2 shrink-0">
              <input
                type="text"
                placeholder="Inject diagnostic event message..."
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-[10px] text-slate-200 font-mono focus:outline-none focus:border-indigo-500 placeholder-slate-600"
              />
              <select
                value={customCat}
                onChange={(e: any) => setCustomCat(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-2 text-[10px] text-slate-300 font-mono cursor-pointer"
              >
                <option value="system">SYS</option>
                <option value="gps">GPS</option>
                <option value="database">DB</option>
                <option value="network">NET</option>
                <option value="payment">PAY</option>
              </select>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow"
              >
                Inject
              </button>
            </form>
          </div>

          {/* BENTO CARD 5: Active System Profiles Inspect list */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-4 font-mono">
              <Database className="w-4 h-4 text-slate-500" />
              Users & System Components
            </h3>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {users.map((u) => (
                <div key={u.id} className="border border-slate-100 bg-slate-50/50 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">{u.name}</span>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded ${
                        u.role === 'driver' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {u.role}
                      </span>
                      {u.role === 'driver' && u.driverProfile?.isOnline && (
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" title="Online" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{u.email}</p>
                    
                    {u.role === 'driver' && u.driverProfile && (
                      <div className="text-[9px] text-slate-400 font-mono mt-1 space-y-0.5">
                        <p>🚙 Model: {u.driverProfile.vehicleModel}</p>
                        <p>🏷️ Plate: {u.driverProfile.vehiclePlate}</p>
                        <p>💵 Rate: ${(u.driverProfile.baseRate ?? 2.0).toFixed(2)}/km</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase">Rating</span>
                    <span className="font-mono text-xs font-bold text-slate-800">
                      ⭐ {(u.rating ?? 5.0).toFixed(1)} ({u.ratingCount ?? 0})
                    </span>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                      {u.location ? `${(u.location.lat ?? 0).toFixed(3)}, ${(u.location.lng ?? 0).toFixed(3)}` : 'No GPS coords'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
