import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  KeyRound,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { CloudSystemState, StaffUser, SyncOperationType, UserRole } from '../types/lounge';
import { getRoleBadgeLabel } from '../utils/formatters';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: CloudSystemState;
  onDispatch: (type: SyncOperationType, payload: any, description: string) => Promise<void>;
  onSwitchUser: (userId: string) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  state,
  onDispatch,
  onSwitchUser,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loginMethod, setLoginMethod] = useState<'otp' | 'pin'>('otp');

  // Login with OTP state
  const [loginIdentifier, setLoginIdentifier] = useState(''); // email or phone
  const [loginOtpCode, setLoginOtpCode] = useState<string[]>(['', '', '', '', '', '']);
  const [generatedLoginOtp, setGeneratedLoginOtp] = useState<string | null>(null);
  const [loginOtpCountdown, setLoginOtpCountdown] = useState<number>(0);
  const [matchedUserForOtp, setMatchedUserForOtp] = useState<StaffUser | null>(null);
  const [loginError, setLoginError] = useState<string>('');

  // Login with PIN / Quick staff selection
  const [selectedStaffForPin, setSelectedStaffForPin] = useState<StaffUser | null>(null);
  const [pinDigits, setPinDigits] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('bartender');
  const [regPin, setRegPin] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [requireOtpForReg, setRequireOtpForReg] = useState<boolean>(true);
  const [regOtpCode, setRegOtpCode] = useState<string[]>(['', '', '', '', '', '']);
  const [generatedRegOtp, setGeneratedRegOtp] = useState<string | null>(null);
  const [regOtpCountdown, setRegOtpCountdown] = useState<number>(0);
  const [regStep, setRegStep] = useState<'form' | 'verify_otp'>('form');
  const [regError, setRegError] = useState<string>('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Countdown timer for OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loginOtpCountdown > 0) {
      timer = setTimeout(() => setLoginOtpCountdown(loginOtpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [loginOtpCountdown]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (regOtpCountdown > 0) {
      timer = setTimeout(() => setRegOtpCountdown(regOtpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [regOtpCountdown]);

  if (!isOpen) return null;

  // Handle Send OTP for Login
  const handleSendLoginOtp = () => {
    setLoginError('');
    const idClean = loginIdentifier.trim().toLowerCase();
    if (!idClean) {
      setLoginError('Please enter your work email or phone number.');
      return;
    }

    // Match against state.users
    const user = state.users.find(
      (u) =>
        u.email.toLowerCase() === idClean ||
        (u.phone && u.phone.replace(/\D/g, '') === idClean.replace(/\D/g, ''))
    );

    if (!user) {
      setLoginError(
        `Staff profile not found for "${loginIdentifier}". Please verify your email or phone number.`
      );
      return;
    }

    // Generate 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedLoginOtp(code);
    setMatchedUserForOtp(user);
    setLoginOtpCountdown(60);
    setLoginOtpCode(['', '', '', '', '', '']);
  };

  // Handle verify Login OTP
  const handleVerifyLoginOtp = (codeArr: string[]) => {
    const fullCode = codeArr.join('');
    if (fullCode.length === 6) {
      if (fullCode === generatedLoginOtp && matchedUserForOtp) {
        onSwitchUser(matchedUserForOtp.id);
        onClose();
      } else {
        setLoginError('Incorrect 6-digit OTP code. Please check and try again.');
      }
    }
  };

  // Handle OTP Box input
  const handleOtpBoxChange = (
    val: string,
    idx: number,
    target: 'login' | 'reg'
  ) => {
    const char = val.slice(-1).replace(/\D/g, '');
    const currentCode = target === 'login' ? [...loginOtpCode] : [...regOtpCode];
    currentCode[idx] = char;

    if (target === 'login') {
      setLoginOtpCode(currentCode);
      if (char && idx < 5) {
        inputRefs.current[idx + 1]?.focus();
      }
      if (currentCode.join('').length === 6) {
        handleVerifyLoginOtp(currentCode);
      }
    } else {
      setRegOtpCode(currentCode);
      if (char && idx < 5) {
        inputRefs.current[idx + 1]?.focus();
      }
    }
  };

  // Quick autofill OTP button
  const handleAutofillLoginOtp = () => {
    if (generatedLoginOtp) {
      const arr = generatedLoginOtp.split('');
      setLoginOtpCode(arr);
      handleVerifyLoginOtp(arr);
    }
  };

  const handleAutofillRegOtp = () => {
    if (generatedRegOtp) {
      setRegOtpCode(generatedRegOtp.split(''));
    }
  };

  // Handle PIN Pad press
  const handlePinPress = (num: string) => {
    if (pinDigits.length < 4) {
      const nextPin = pinDigits + num;
      setPinDigits(nextPin);
      if (nextPin.length === 4) {
        if (selectedStaffForPin) {
          if (nextPin === selectedStaffForPin.pin) {
            onSwitchUser(selectedStaffForPin.id);
            onClose();
          } else {
            setPinError(`Incorrect 4-digit PIN for ${selectedStaffForPin.name}`);
          }
        } else {
          // Direct PIN match across active staff accounts
          const matched = state.users.find((u) => u.pin === nextPin && u.active);
          if (matched) {
            onSwitchUser(matched.id);
            onClose();
          } else {
            setPinError('Invalid 4-digit POS PIN. Please try again.');
          }
        }
      }
    }
  };

  const handlePinBackspace = () => {
    setPinDigits(pinDigits.slice(0, -1));
    setPinError('');
  };

  // Handle Registration Step 1
  const handleStartRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regName.trim() || !regEmail.trim() || !regPin.trim()) {
      setRegError('Please provide your name, email, and 4-digit POS PIN.');
      return;
    }

    if (state.users.some((u) => u.email.toLowerCase() === regEmail.trim().toLowerCase())) {
      setRegError('A staff account with this email address already exists.');
      return;
    }

    if (requireOtpForReg) {
      // Generate OTP and move to step 2
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedRegOtp(code);
      setRegOtpCountdown(60);
      setRegStep('verify_otp');
      setRegOtpCode(['', '', '', '', '', '']);
    } else {
      finalizeRegistration(false);
    }
  };

  // Finalize Registration
  const finalizeRegistration = async (isOtpVerified: boolean) => {
    const newUser: StaffUser = {
      id: `usr-${Date.now()}`,
      name: regName.trim(),
      email: regEmail.trim(),
      phone: regPhone.trim() || '+1 (415) 555-0199',
      role: regRole,
      pin: regPin.trim(),
      password: regPassword.trim() || 'password',
      active: true,
      registrationDate: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      otpVerified: isOtpVerified,
    };

    await onDispatch(
      'CREATE_STAFF_USER',
      { user: newUser },
      `Registered staff user ${newUser.name} (${getRoleBadgeLabel(newUser.role)})${
        isOtpVerified ? ' via verified OTP' : ''
      }`
    );

    onSwitchUser(newUser.id);
    onClose();
  };

  const handleVerifyRegOtpAndComplete = () => {
    const fullCode = regOtpCode.join('');
    if (fullCode === generatedRegOtp) {
      finalizeRegistration(true);
    } else {
      setRegError('Invalid 6-digit registration verification code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 my-8 shadow-2xl">
        {/* Header with Title and Mode Switcher */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              {mode === 'login' ? <Lock className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-display">
                {mode === 'login' ? 'Staff Authentication & Login' : 'Register New Staff Account'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {mode === 'login'
                  ? 'Access POS terminal, cellars, and manager reports'
                  : 'Onboard a new server, bartender, or manager'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher: Login vs Register */}
        <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setLoginError('');
            }}
            className={`flex-1 py-1.5 font-semibold rounded-md transition-colors cursor-pointer text-center ${
              mode === 'login'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Staff Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setRegStep('form');
              setRegError('');
            }}
            className={`flex-1 py-1.5 font-semibold rounded-md transition-colors cursor-pointer text-center ${
              mode === 'register'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register Account
          </button>
        </div>

        {/* MODE 1: STAFF LOGIN */}
        {mode === 'login' && (
          <div className="space-y-4">
            {/* Login Method Sub-tabs: OTP vs Quick PIN */}
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Select Login Option:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLoginMethod('otp')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    loginMethod === 'otp'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  One-Time Password (OTP)
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('pin')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    loginMethod === 'pin'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Quick PIN / Keypad
                </button>
              </div>
            </div>

            {/* SUB-MODE A: LOGIN WITH OTP */}
            {loginMethod === 'otp' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 mb-1 text-xs font-semibold">
                    Work Email or Mobile Phone
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. henri.gm@lounge.internal or +1 (415)..."
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSendLoginOtp}
                      disabled={loginOtpCountdown > 0}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      {loginOtpCountdown > 0 ? `${loginOtpCountdown}s` : 'Send OTP'}
                    </button>
                  </div>
                </div>

                {/* Simulated OTP Notification Banner */}
                {generatedLoginOtp && (
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/50 text-xs text-amber-200 space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Simulated SMS / Email OTP Dispatched
                      </span>
                      <span className="font-mono text-amber-300 font-bold text-sm tracking-wider">
                        {generatedLoginOtp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Sent to <strong>{loginIdentifier}</strong> for staff member{' '}
                      <strong>{matchedUserForOtp?.name}</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={handleAutofillLoginOtp}
                      className="w-full py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded cursor-pointer mt-1"
                    >
                      Tap here to Autofill OTP ({generatedLoginOtp}) & Sign In
                    </button>
                  </div>
                )}

                {/* 6 Digits Boxes */}
                {generatedLoginOtp && (
                  <div className="space-y-2">
                    <label className="block text-slate-300 text-xs font-semibold text-center">
                      Enter 6-Digit Verification Code:
                    </label>
                    <div className="flex justify-center gap-2">
                      {loginOtpCode.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            inputRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpBoxChange(e.target.value, idx, 'login')}
                          className="w-10 h-12 text-center text-lg font-mono font-bold rounded-lg bg-slate-950 border border-slate-700 text-amber-400 focus:border-amber-400 focus:outline-none"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {loginError && (
                  <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800">
                    {loginError}
                  </p>
                )}
              </div>
            )}

            {/* SUB-MODE B: LOGIN WITH QUICK PIN */}
            {loginMethod === 'pin' && (
              <div className="space-y-4">
                {/* Clean Staff Selection Dropdown (No PIN display) */}
                <div className="space-y-1">
                  <label className="block text-xs text-slate-300 font-semibold">
                    Staff Member (Optional):
                  </label>
                  <select
                    value={selectedStaffForPin?.id || ''}
                    onChange={(e) => {
                      const found = state.users.find((u) => u.id === e.target.value) || null;
                      setSelectedStaffForPin(found);
                      setPinDigits('');
                      setPinError('');
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    <option value="">-- Enter 4-digit PIN directly or select profile --</option>
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
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <div className="text-xs text-slate-400">
                    {selectedStaffForPin ? (
                      <span>
                        Enter 4-digit POS PIN for <strong>{selectedStaffForPin.name}</strong>:
                      </span>
                    ) : (
                      <span>Enter your registered 4-digit POS PIN below:</span>
                    )}
                  </div>
                  <div className="flex justify-center gap-3">
                    {[0, 1, 2, 3].map((idx) => (
                      <div
                        key={idx}
                        className={`w-3.5 h-3.5 rounded-full transition-all ${
                          pinDigits.length > idx
                            ? 'bg-amber-400 scale-110 shadow-xs shadow-amber-400/50'
                            : 'bg-slate-800 border border-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Touch-Friendly Numeric Keypad */}
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handlePinPress(num)}
                      className="py-3 text-base font-bold font-mono rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-100 transition-colors cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPinDigits('')}
                    className="py-3 text-xs font-semibold rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-800 cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePinPress('0')}
                    className="py-3 text-base font-bold font-mono rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-100 cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handlePinBackspace}
                    className="py-3 text-xs font-semibold rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-800 cursor-pointer"
                  >
                    ⌫
                  </button>
                </div>

                {pinError && (
                  <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800 text-center">
                    {pinError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* MODE 2: REGISTRATION FORM */}
        {mode === 'register' && (
          <div>
            {regStep === 'form' ? (
              <form onSubmit={handleStartRegistration} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g., Genevieve Beaumont"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Staff Work Email *</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="genevieve@lounge.internal"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Mobile Phone (for OTP)</label>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+1 (415) 555-0188"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">System Access Role *</label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                    >
                      <option value="bartender">Bartender (POS, Recipes)</option>
                      <option value="cashier">Cashier (POS, Tender)</option>
                      <option value="inventory">Inventory Lead (POs, Stock)</option>
                      <option value="manager">Manager (Discounts, EOD)</option>
                      <option value="admin">Administrator (All Access)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">4-Digit POS Quick PIN *</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 5566"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">
                    Portal Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Account password"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>

                {/* OTP Verification Toggle */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-200">
                      Two-Factor OTP Verification
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Send a 6-digit confirmation code to mobile/email before account activation.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireOtpForReg}
                    onChange={(e) => setRequireOtpForReg(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>

                {regError && (
                  <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800">
                    {regError}
                  </p>
                )}

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{requireOtpForReg ? 'Continue to OTP Verification' : 'Register Account'}</span>
                    <UserPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              /* REGISTRATION STEP 2: VERIFY OTP */
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Registration OTP Code
                    </span>
                    <span className="font-mono text-amber-300 font-bold text-sm tracking-wider">
                      {generatedRegOtp}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Dispatched to <strong>{regPhone || regEmail}</strong> for {regName}.
                  </p>
                  <button
                    type="button"
                    onClick={handleAutofillRegOtp}
                    className="w-full py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded cursor-pointer mt-1"
                  >
                    Tap to Autofill OTP ({generatedRegOtp})
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-300 text-xs font-semibold text-center">
                    Enter 6-Digit Code to Activate Account:
                  </label>
                  <div className="flex justify-center gap-2">
                    {regOtpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          inputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpBoxChange(e.target.value, idx, 'reg')}
                        className="w-10 h-12 text-center text-lg font-mono font-bold rounded-lg bg-slate-950 border border-slate-700 text-amber-400 focus:border-amber-400 focus:outline-none"
                      />
                    ))}
                  </div>
                </div>

                {regError && (
                  <p className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-800 text-center">
                    {regError}
                  </p>
                )}

                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setRegStep('form')}
                    className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    ← Edit Information
                  </button>

                  <button
                    type="button"
                    onClick={handleVerifyRegOtpAndComplete}
                    disabled={regOtpCode.join('').length !== 6}
                    className="px-4 py-2 font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer disabled:opacity-40"
                  >
                    Verify & Create Account
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
