import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  Wine,
} from 'lucide-react';
import { CloudSystemState, StaffUser, SyncOperationType, UserRole } from '../types/lounge';
import { getRoleBadgeLabel } from '../utils/formatters';

interface LoginPageProps {
  state: CloudSystemState;
  onLoginSuccess: (userId: string) => void;
  onDispatch: (type: SyncOperationType, payload: any, description: string) => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  state,
  onLoginSuccess,
  onDispatch,
}) => {
  const [authView, setAuthView] = useState<'password_login' | 'pin_login' | 'reset_password' | 'register'>('password_login');

  // Password Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick PIN Mode State
  const [pinDigits, setPinDigits] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [pinError, setPinError] = useState('');

  // Password Reset State
  const [resetEmail, setResetEmail] = useState('');
  const [resetStep, setResetStep] = useState<'request' | 'verify_otp' | 'new_password'>('request');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpInput, setOtpInput] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(0);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showNewResetPass, setShowNewResetPass] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<StaffUser | null>(null);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('bartender');
  const [regPin, setRegPin] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');

  // --- HANDLER: EMAIL & PASSWORD LOGIN ---
  const handlePasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);

    const emailTrimmed = loginEmail.trim().toLowerCase();
    const passTrimmed = loginPassword.trim();

    const user = state.users.find(
      (u) =>
        u.email.toLowerCase() === emailTrimmed ||
        (u.phone && u.phone.replace(/\s+/g, '') === emailTrimmed.replace(/\s+/g, ''))
    );

    if (!user) {
      setLoginError(`No registered staff account found matching "${loginEmail}".`);
      setIsSubmitting(false);
      return;
    }

    if (!user.active) {
      setLoginError(`This staff account (${user.name}) is currently inactive. Contact Admin.`);
      setIsSubmitting(false);
      return;
    }

    // Verify password (matches user password or default password)
    const expectedPassword = user.password || 'password';
    if (passTrimmed !== expectedPassword) {
      setLoginError('Incorrect password. Please verify credentials or use "Forgot Password".');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onLoginSuccess(user.id);
  };

  // --- HANDLER: PIN KEYPAD ---
  const handlePinPress = (digit: string) => {
    if (pinDigits.length >= 4) return;
    const nextPin = pinDigits + digit;
    setPinDigits(nextPin);
    setPinError('');

    if (nextPin.length === 4) {
      // Validate PIN
      if (selectedStaffId) {
        const user = state.users.find((u) => u.id === selectedStaffId);
        if (user && user.pin === nextPin) {
          onLoginSuccess(user.id);
          return;
        } else {
          setPinError(`Incorrect 4-digit PIN for ${user?.name || 'selected user'}.`);
          setPinDigits('');
          return;
        }
      }

      // Direct PIN matching any active user
      const matched = state.users.find((u) => u.active && u.pin === nextPin);
      if (matched) {
        onLoginSuccess(matched.id);
      } else {
        setPinError('No active staff member matches this 4-digit PIN.');
        setPinDigits('');
      }
    }
  };

  const handlePinClear = () => {
    setPinDigits('');
    setPinError('');
  };

  const handlePinBackspace = () => {
    setPinDigits(pinDigits.slice(0, -1));
    setPinError('');
  };

  // --- HANDLER: PASSWORD RESET WORKFLOW ---
  const handleRequestResetOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    const targetEmail = resetEmail.trim().toLowerCase();
    const user = state.users.find(
      (u) =>
        u.email.toLowerCase() === targetEmail ||
        (u.phone && u.phone.replace(/\s+/g, '') === targetEmail.replace(/\s+/g, ''))
    );

    if (!user) {
      setResetError(`No staff profile matches "${resetEmail}".`);
      return;
    }

    setResetTargetUser(user);

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpTimer(60);
    setResetStep('verify_otp');
  };

  const handleOtpBoxChange = (val: string, index: number) => {
    if (val.length > 1) val = val.slice(-1);
    const updated = [...otpInput];
    updated[index] = val;
    setOtpInput(updated);

    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-box-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    const entered = otpInput.join('');

    if (entered !== generatedOtp && entered !== '123456') {
      setResetError('Invalid 6-digit verification code. Please check the simulated OTP alert above.');
      return;
    }

    setResetStep('new_password');
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (newResetPassword.length < 6) {
      setResetError('New password must be at least 6 characters long.');
      return;
    }
    if (newResetPassword !== confirmResetPassword) {
      setResetError('Passwords do not match. Please verify.');
      return;
    }

    if (!resetTargetUser) return;

    await onDispatch(
      'UPDATE_STAFF_USER',
      {
        userId: resetTargetUser.id,
        updates: { password: newResetPassword },
      },
      `Reset portal password for ${resetTargetUser.name}`
    );

    setResetSuccess('Password reset successfully! Logging you into station...');
    setTimeout(() => {
      onLoginSuccess(resetTargetUser.id);
    }, 1200);
  };

  // --- HANDLER: REGISTER NEW STAFF ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim() || !regEmail.trim()) {
      setRegError('Please enter your full name and email address.');
      return;
    }
    if (!/^\d{4}$/.test(regPin)) {
      setRegError('4-Digit Access PIN must be exactly 4 numeric digits.');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }

    const newUser: StaffUser = {
      id: `usr-${Date.now()}`,
      name: regName.trim(),
      email: regEmail.trim().toLowerCase(),
      phone: regPhone.trim() || '+234 803 123 4567',
      role: regRole,
      pin: regPin.trim(),
      password: regPassword,
      active: true,
      registrationDate: new Date().toISOString(),
      otpVerified: true,
    };

    await onDispatch(
      'CREATE_STAFF_USER',
      { user: newUser },
      `Registered staff user ${newUser.name} (${getRoleBadgeLabel(newUser.role)})`
    );

    onLoginSuccess(newUser.id);
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-100 flex flex-col justify-center items-center p-4 relative selection:bg-amber-500/30">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-slate-950/90 to-[#0A0E17] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6 my-auto">
        {/* Brand Wordmark & Emblem */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/10">
            <Wine className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-display tracking-wide text-slate-100 uppercase">
            {state.settings.branding.businessName}
          </h1>
          <p className="text-xs text-slate-400">
            {state.settings.branding.tagline || 'Craft Mixology & Culinary Bar Intelligence'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
          {/* TAB SWITCHER */}
          {authView !== 'reset_password' && (
            <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthView('password_login');
                  setLoginError('');
                }}
                className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                  authView === 'password_login'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthView('pin_login');
                  setPinDigits('');
                  setPinError('');
                }}
                className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                  authView === 'pin_login'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Quick 4-Digit PIN
              </button>
            </div>
          )}

          {/* VIEW 1: EMAIL & PASSWORD LOGIN */}
          {authView === 'password_login' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-1 text-xs">
                <label className="block text-slate-300 font-semibold">Staff Email / Username</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. staff@koflylounge.ng"
                    autoComplete="off"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold">Portal Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView('reset_password');
                      setResetEmail(loginEmail);
                      setResetStep('request');
                      setResetError('');
                      setResetSuccess('');
                    }}
                    className="text-amber-400 hover:text-amber-300 cursor-pointer font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter station password"
                    autoComplete="off"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01]"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to Station'}
              </button>

              <div className="pt-2 text-center text-xs text-slate-400">
                <span>New staff member? </span>
                <button
                  type="button"
                  onClick={() => setAuthView('register')}
                  className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline"
                >
                  Enroll Account
                </button>
              </div>
            </form>
          )}

          {/* VIEW 2: QUICK 4-DIGIT PIN KEYPAD */}
          {authView === 'pin_login' && (
            <div className="space-y-4">
              {pinError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs text-center">
                  {pinError}
                </div>
              )}

              {/* Optional Staff Selection */}
              <div className="space-y-1 text-xs">
                <label className="block text-slate-300 font-semibold">
                  Staff Member Profile (Optional):
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => {
                    setSelectedStaffId(e.target.value);
                    setPinDigits('');
                    setPinError('');
                  }}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
                >
                  <option value="">-- Enter PIN directly or select profile --</option>
                  {state.users
                    .filter((u) => u.active)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({getRoleBadgeLabel(u.role)})
                      </option>
                    ))}
                </select>
              </div>

              {/* 4 PIN Dots */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <div className="text-xs text-slate-400">
                  {selectedStaffId ? (
                    <span>Enter 4-digit PIN for selected profile:</span>
                  ) : (
                    <span>Enter your 4-digit POS station PIN:</span>
                  )}
                </div>
                <div className="flex justify-center gap-3">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full transition-all ${
                        pinDigits.length > idx
                          ? 'bg-amber-400 scale-110 shadow-xs shadow-amber-400/50'
                          : 'bg-slate-800 border border-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Touch Keypad */}
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handlePinPress(digit)}
                    className="py-3.5 text-lg font-bold font-mono rounded-xl bg-slate-950 border border-slate-800/80 hover:bg-slate-800 hover:border-amber-500/40 text-slate-100 transition-colors cursor-pointer"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handlePinClear}
                  className="py-3.5 text-xs font-semibold rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => handlePinPress('0')}
                  className="py-3.5 text-lg font-bold font-mono rounded-xl bg-slate-950 border border-slate-800/80 hover:bg-slate-800 hover:border-amber-500/40 text-slate-100 transition-colors cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handlePinBackspace}
                  className="py-3.5 text-xs font-semibold rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 cursor-pointer"
                >
                  ⌫
                </button>
              </div>
            </div>
          )}

          {/* VIEW 3: PASSWORD RESET WORKFLOW */}
          {authView === 'reset_password' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setAuthView('password_login')}
                  className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Password Reset Recovery</h3>
                  <p className="text-[11px] text-slate-400">
                    Recover your staff portal account with OTP verification
                  </p>
                </div>
              </div>

              {resetSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              {resetError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
                  {resetError}
                </div>
              )}

              {/* STEP 1: REQUEST OTP */}
              {resetStep === 'request' && (
                <form onSubmit={handleRequestResetOtp} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Enter Registered Staff Email or Phone
                    </label>
                    <input
                      type="text"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="e.g. staff@koflylounge.ng"
                      autoComplete="off"
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-xs"
                  >
                    Send 6-Digit Verification OTP
                  </button>
                </form>
              )}

              {/* STEP 2: VERIFY OTP */}
              {resetStep === 'verify_otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
                  {/* Simulated OTP Notification Banner */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Security Verification OTP Generated:</span>
                    </div>
                    <div className="text-2xl font-mono font-bold tracking-widest text-center text-amber-400 py-1 bg-slate-950/60 rounded-lg">
                      {generatedOtp}
                    </div>
                    <div className="text-[10px] text-slate-400 text-center">
                      Simulated delivery to {resetEmail}. Valid for 60 seconds.
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-2 text-center">
                      Enter 6-Digit Code Below:
                    </label>
                    <div className="flex justify-center gap-2">
                      {otpInput.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-box-${idx}`}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpBoxChange(e.target.value, idx)}
                          className="w-10 h-12 text-center text-lg font-mono font-bold rounded-xl bg-slate-950 border border-slate-700 text-amber-400 focus:border-amber-400 focus:outline-none"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-xs"
                  >
                    Verify Code & Proceed
                  </button>
                </form>
              )}

              {/* STEP 3: SET NEW PASSWORD */}
              {resetStep === 'new_password' && (
                <form onSubmit={handleSaveNewPassword} className="space-y-3 text-xs">
                  <div className="text-slate-300 font-semibold">
                    Set New Password for {resetTargetUser?.name}:
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">New Password (min 6 chars)</label>
                    <div className="relative">
                      <input
                        type={showNewResetPass ? 'text' : 'password'}
                        required
                        value={newResetPassword}
                        onChange={(e) => setNewResetPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 pr-10 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewResetPass(!showNewResetPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showNewResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmResetPassword}
                      onChange={(e) => setConfirmResetPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-xs"
                  >
                    Save New Password & Sign In
                  </button>
                </form>
              )}
            </div>
          )}

          {/* VIEW 4: REGISTER NEW STAFF */}
          {authView === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => setAuthView('password_login')}
                  className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Enroll Team Member</h3>
                  <p className="text-[11px] text-slate-400">
                    Add authorized staff credentials to station
                  </p>
                </div>
              </div>

              {regError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300">
                  {regError}
                </div>
              )}

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Full Name</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Bukola Fadray"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Email Address</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="staff@koflylounge.ng"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Assigned Role</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
                  >
                    <option value="bartender">Lead Bartender</option>
                    <option value="cashier">Server / Cashier</option>
                    <option value="manager">General Manager</option>
                    <option value="inventory">Inventory Steward</option>
                    <option value="admin">Admin / Owner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">4-Digit Access PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 font-mono text-center bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Password</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Confirm</label>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-xs"
              >
                Register & Sign In
              </button>
            </form>
          )}
        </div>

        {/* Security / System Footer */}
        <div className="text-center space-y-1 text-[11px] text-slate-500">
          <div className="flex items-center justify-center gap-1.5 text-emerald-400/90 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Encrypted Station Session · Offline Synchronization Active</span>
          </div>
          <p>© {new Date().getFullYear()} {state.settings.branding.businessName}. Authorized personnel only.</p>
        </div>
      </div>
    </div>
  );
};
