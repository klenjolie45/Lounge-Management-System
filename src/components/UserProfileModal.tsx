import React, { useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { CloudSystemState, StaffUser, SyncOperationType } from '../types/lounge';
import { getRoleBadgeLabel, PERMISSION_LABELS, ROLE_DEFAULT_PERMISSIONS } from '../utils/formatters';

interface UserProfileModalProps {
  user: StaffUser;
  state: CloudSystemState;
  onClose: () => void;
  onDispatch: (type: SyncOperationType, payload: any, description: string) => Promise<void>;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  state,
  onClose,
  onDispatch,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'pin' | 'password' | 'permissions'>('profile');

  // Profile fields
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || '');

  // PIN fields
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // General profile update
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Role permissions
  const rolePermissions = state.settings?.rolePermissions?.[user.role] || ROLE_DEFAULT_PERMISSIONS[user.role] || [];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim()) {
      setProfileError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setProfileError('Please enter a valid email address.');
      return;
    }

    await onDispatch(
      'UPDATE_STAFF_USER',
      {
        userId: user.id,
        updates: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
        },
      },
      `Updated user profile for ${name.trim()}`
    );

    setProfileSuccess('Profile information saved successfully!');
    setTimeout(() => setProfileSuccess(''), 3000);
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    if (oldPin !== user.pin) {
      setPinError('Current 4-digit PIN is incorrect.');
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('New PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PIN and confirmation do not match.');
      return;
    }

    await onDispatch(
      'UPDATE_STAFF_USER',
      {
        userId: user.id,
        updates: { pin: newPin },
      },
      `Changed access PIN for ${user.name}`
    );

    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    setPinSuccess('4-digit POS access PIN updated successfully!');
    setTimeout(() => setPinSuccess(''), 3000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (currentPassword !== (user.password || 'password') && user.password) {
      setPasswordError('Current password does not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    await onDispatch(
      'UPDATE_STAFF_USER',
      {
        userId: user.id,
        updates: { password: newPassword },
      },
      `Changed login password for ${user.name}`
    );

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordSuccess('Account portal password updated successfully!');
    setTimeout(() => setPasswordSuccess(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center justify-center text-base">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">{user.name}</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
                  {getRoleBadgeLabel(user.role)}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-5 pt-3 gap-2 bg-slate-950/50 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Personal Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pin')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'pin'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Change PIN
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'password'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Change Password
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'permissions'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            My Privileges ({user.role === 'admin' ? 'All' : rolePermissions.length})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: PERSONAL DETAILS */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {profileSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{profileSuccess}</span>
                </div>
              )}
              {profileError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300">
                  {profileError}
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Legal Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Phone Number (SMS / OTP)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 803 123 4567"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Assigned System Role:</span>
                  <span className="font-semibold text-slate-200">{getRoleBadgeLabel(user.role)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Account Status:</span>
                  <span className="text-emerald-400 font-semibold">Active & Authorized</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs cursor-pointer shadow-xs"
                >
                  Save Profile Details
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: CHANGE 4-DIGIT PIN */}
          {activeTab === 'pin' && (
            <form onSubmit={handleUpdatePin} className="space-y-4 max-w-md mx-auto">
              <div className="text-center space-y-1">
                <h4 className="text-sm font-semibold text-slate-200">Update Terminal POS PIN</h4>
                <p className="text-[11px] text-slate-400">
                  Your 4-digit PIN is used to quickly unlock the POS register and log shift actions.
                </p>
              </div>

              {pinSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{pinSuccess}</span>
                </div>
              )}
              {pinError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300">
                  {pinError}
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Current 4-Digit PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 text-center text-lg font-mono tracking-widest bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">New 4-Digit PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 text-center text-lg font-mono tracking-widest bg-slate-950 border border-slate-800 rounded-xl text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Confirm New 4-Digit PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 text-center text-lg font-mono tracking-widest bg-slate-950 border border-slate-800 rounded-xl text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs cursor-pointer shadow-xs"
                >
                  Save New Access PIN
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md mx-auto">
              <div className="text-center space-y-1">
                <h4 className="text-sm font-semibold text-slate-200">Change Portal Password</h4>
                <p className="text-[11px] text-slate-400">
                  Used for system administration, reports, and portal management sign-in.
                </p>
              </div>

              {passwordSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{passwordSuccess}</span>
                </div>
              )}
              {passwordError && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300">
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 pr-10 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Password (min 6 chars)</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 pr-10 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs cursor-pointer shadow-xs"
                >
                  Update Portal Password
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: MY PRIVILEGES */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">
                    Role Authority: {getRoleBadgeLabel(user.role)}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {user.role === 'admin'
                      ? 'Super-Admin has full unrestricted access across all lounge modules.'
                      : 'Privileges managed dynamically in Users & Permissions matrix.'}
                  </div>
                </div>
                <ShieldCheck className="w-6 h-6 text-amber-400" />
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  Active Capabilities Granted:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {user.role === 'admin' ? (
                    <div className="col-span-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                      ★ Unrestricted Super-Admin privileges granted across all terminal orders, recipe modifications, financial analytics, and system settings.
                    </div>
                  ) : (
                    rolePermissions.map((permKey) => {
                      const meta = PERMISSION_LABELS[permKey as any];
                      return (
                        <div
                          key={permKey}
                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-200 truncate">
                              {meta?.title || permKey}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {meta?.description || 'Active capability'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 rounded-xl cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
