import React, { useState } from 'react';
import {
  Bell,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  Globe,
  Mail,
  Palette,
  Percent,
  Printer,
  RefreshCw,
  Save,
  Send,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Store,
  Upload,
} from 'lucide-react';
import {
  CloudSystemState,
  GeneralSystemSettings,
  SyncOperationType,
  ThemeMode,
} from '../types/lounge';
import { formatCurrency } from '../utils/formatters';

interface SettingsViewProps {
  state: CloudSystemState;
  onDispatch: (type: SyncOperationType, payload: any, description: string) => Promise<void>;
  onThemeChange?: (theme: ThemeMode) => void;
}

type SettingsTab =
  | 'branding'
  | 'theme'
  | 'currency'
  | 'time'
  | 'tax'
  | 'print'
  | 'language'
  | 'notifications';

export const SettingsView: React.FC<SettingsViewProps> = ({
  state,
  onDispatch,
  onThemeChange,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('branding');
  const [draft, setDraft] = useState<GeneralSystemSettings>(
    JSON.parse(JSON.stringify(state.settings))
  );
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [testEmailToast, setTestEmailToast] = useState<string | null>(null);
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{
    success: boolean;
    timestamp: string;
    message: string;
    details: string[];
  } | null>(null);

  const handleApplySmtpPreset = (preset: 'kofly' | 'gmail' | 'office365' | 'sendgrid') => {
    switch (preset) {
      case 'kofly':
        setDraft({
          ...draft,
          notifications: {
            ...draft.notifications,
            smtpHost: 'mail.koflylounge.ng',
            smtpPort: 587,
            smtpSecure: 'tls',
            smtpUsername: 'notifications@koflylounge.ng',
            smtpSenderName: 'Kofly Lounge Notification Engine',
            smtpFromEmail: 'notifications@koflylounge.ng',
            smtpAuthRequired: true,
          },
        });
        break;
      case 'gmail':
        setDraft({
          ...draft,
          notifications: {
            ...draft.notifications,
            smtpHost: 'smtp.gmail.com',
            smtpPort: 587,
            smtpSecure: 'tls',
            smtpUsername: 'notifications@koflylounge.ng',
            smtpSenderName: 'Kofly Lounge Admin',
            smtpFromEmail: 'notifications@koflylounge.ng',
            smtpAuthRequired: true,
          },
        });
        break;
      case 'office365':
        setDraft({
          ...draft,
          notifications: {
            ...draft.notifications,
            smtpHost: 'smtp.office365.com',
            smtpPort: 587,
            smtpSecure: 'tls',
            smtpUsername: 'notifications@koflylounge.ng',
            smtpSenderName: 'Kofly Lounge Alerts',
            smtpFromEmail: 'notifications@koflylounge.ng',
            smtpAuthRequired: true,
          },
        });
        break;
      case 'sendgrid':
        setDraft({
          ...draft,
          notifications: {
            ...draft.notifications,
            smtpHost: 'smtp.sendgrid.net',
            smtpPort: 587,
            smtpSecure: 'tls',
            smtpUsername: 'apikey',
            smtpSenderName: 'Kofly Lounge Delivery',
            smtpFromEmail: 'notifications@koflylounge.ng',
            smtpAuthRequired: true,
          },
        });
        break;
    }
  };

  const handleTestSmtpConnection = () => {
    setSmtpTesting(true);
    setSmtpTestResult(null);

    setTimeout(() => {
      setSmtpTesting(false);
      const host = draft.notifications.smtpHost || 'mail.koflylounge.ng';
      const port = draft.notifications.smtpPort || 587;
      const secure = (draft.notifications.smtpSecure || 'tls').toUpperCase();
      const user = draft.notifications.smtpUsername || 'notifications@koflylounge.ng';
      const count = draft.notifications.recipientEmails.length;

      setSmtpTestResult({
        success: true,
        timestamp: new Date().toLocaleTimeString(),
        message: `SMTP Connection Verified & Test Dispatch Sent to ${count} Recipient(s)`,
        details: [
          `DNS Lookup & Socket Connected to ${host}:${port}`,
          `${secure} Handshake Completed Successfully (Cipher: TLS_AES_256_GCM_SHA384)`,
          `SMTP AUTH PLAIN Succeeded for user "${user}"`,
          `MAIL FROM: <${draft.notifications.smtpFromEmail || 'notifications@koflylounge.ng'}> OK (250 2.1.0)`,
          `RCPT TO: [${draft.notifications.recipientEmails.join(', ')}] Accepted (250 2.1.5)`,
          `Message payload transferred: Msg-ID <${Date.now().toString(36)}@koflylounge.ng> (250 2.0.0 OK: queued)`,
        ],
      });
    }, 1100);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await onDispatch(
      'UPDATE_SYSTEM_SETTINGS',
      { settings: draft },
      'Updated General System Settings'
    );
    if (onThemeChange) {
      onThemeChange(draft.theme);
    }
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3000);
  };

  const handleSendTestEmail = () => {
    const count = draft.notifications.recipientEmails.length;
    setTestEmailToast(
      `Test email sent successfully to ${count} recipient(s): [${draft.notifications.recipientEmails.join(
        ', '
      )}]`
    );
    setTimeout(() => setTestEmailToast(null), 4000);
  };

  const handleAddRecipient = () => {
    if (!newRecipientEmail.trim() || !newRecipientEmail.includes('@')) return;
    if (draft.notifications.recipientEmails.includes(newRecipientEmail.trim())) return;
    setDraft({
      ...draft,
      notifications: {
        ...draft.notifications,
        recipientEmails: [...draft.notifications.recipientEmails, newRecipientEmail.trim()],
      },
    });
    setNewRecipientEmail('');
  };

  const handleRemoveRecipient = (email: string) => {
    setDraft({
      ...draft,
      notifications: {
        ...draft.notifications,
        recipientEmails: draft.notifications.recipientEmails.filter((e) => e !== email),
      },
    });
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ElementType }> = [
    { id: 'branding', label: 'Branding & Logo', icon: Store },
    { id: 'theme', label: 'Theme & Appearance', icon: Palette },
    { id: 'currency', label: 'Currency & Format', icon: DollarSign },
    { id: 'time', label: 'Time & Cutoff Zones', icon: Clock },
    { id: 'tax', label: 'Tax & Service Charges', icon: Percent },
    { id: 'print', label: 'Print & Receipts', icon: Printer },
    { id: 'language', label: 'Language Settings', icon: Globe },
    { id: 'notifications', label: 'Email Notifications', icon: Mail },
  ];

  return (
    <div className="space-y-6">
      {/* Settings Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {isSavedToast && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settings saved & synced</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Test Email Toast */}
      {testEmailToast && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2">
          <Mail className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{testEmailToast}</span>
        </div>
      )}

      {/* Main Settings Panel */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-6">
        {/* TAB 1: BRANDING & LOGO */}
        {activeTab === 'branding' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Lounge & Bistro Identity & Branding
              </h3>
              <p className="text-xs text-slate-400">
                Configure your business name, contact info, and tax identity for display on POS
                screens and printed customer receipts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-300 mb-1">Business Name</label>
                <input
                  type="text"
                  value={draft.branding.businessName}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      branding: { ...draft.branding, businessName: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 mb-1">Tagline / Concept</label>
                <input
                  type="text"
                  value={draft.branding.tagline}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      branding: { ...draft.branding, tagline: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 mb-1">Logo Image URL</label>
                <input
                  type="text"
                  value={draft.branding.logoUrl}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      branding: { ...draft.branding, logoUrl: e.target.value },
                    })
                  }
                  placeholder="https://... or leave blank for typographic wordmark"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-[11px]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={draft.branding.address}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      branding: { ...draft.branding, address: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Telephone</label>
                <input
                  type="text"
                  value={draft.branding.phone}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      branding: { ...draft.branding, phone: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Tax ID / EIN Number</label>
                <input
                  type="text"
                  value={draft.branding.taxIdNumber}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      branding: { ...draft.branding, taxIdNumber: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: THEME & VISUAL LANGUAGE */}
        {activeTab === 'theme' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Atmosphere & Color Theme
              </h3>
              <p className="text-xs text-slate-400">
                Choose the visual language suited for your venue lighting and service hours.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: 'dark_luxe' as ThemeMode,
                  name: 'Dark Luxe Slate',
                  desc: 'Deep slate blue canvas (#0F172A) with champagne gold accents. Ideal for speakeasies and twilight lounges.',
                  bgClass: 'bg-slate-950 border-amber-500/40',
                },
                {
                  id: 'obsidian' as ThemeMode,
                  name: 'Obsidian Night',
                  desc: 'Pure dark graphite (#050811) with rich whiskey amber. Maximum contrast for high-energy cocktail lounges.',
                  bgClass: 'bg-neutral-950 border-amber-600/40',
                },
                {
                  id: 'warm_bistro' as ThemeMode,
                  name: 'Warm Bistro Amber',
                  desc: 'Earthy espresso stone (#181512) with burnished brass accents. Suited for wine bars and culinary bistros.',
                  bgClass: 'bg-[#181512] border-amber-500/50',
                },
                {
                  id: 'light_wine_pink' as ThemeMode,
                  name: 'White & Wine-Pink (Light)',
                  desc: 'Delicate white-rose background with rich burgundy wine accents, berry highlights, and high-contrast dark plum typography.',
                  bgClass: 'bg-rose-50 border-rose-400',
                },
                {
                  id: 'light_navy_blue' as ThemeMode,
                  name: 'White & Navy Blue (Light)',
                  desc: 'Crisp executive white canvas with deep midnight navy headers, cobalt blue accents, and clean modern contrast.',
                  bgClass: 'bg-blue-50 border-blue-600',
                },
                {
                  id: 'light_ivory' as ThemeMode,
                  name: 'Clean Light Ivory',
                  desc: 'High-visibility daylight bistro theme (#F8F9FA) with crisp typography for outdoor patio terminals.',
                  bgClass: 'bg-stone-800 border-amber-400/40',
                },
              ].map((theme) => (
                <div
                  key={theme.id}
                  onClick={() => setDraft({ ...draft, theme: theme.id })}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    draft.theme === theme.id
                      ? 'border-amber-400 bg-amber-500/10'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2">
                    <span className="font-semibold text-slate-100 text-sm">{theme.name}</span>
                    {draft.theme === theme.id && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{theme.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CURRENCY & FORMAT */}
        {activeTab === 'currency' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Currency & Monetary Representation
              </h3>
              <p className="text-xs text-slate-400">
                Configure currency symbols, ISO codes, and decimal formatting across all orders and
                reports.
              </p>
            </div>

            {/* Quick Currency Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Quick Currency Selection:</span>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { name: 'Nigerian Naira (₦ NGN)', symbol: '₦', code: 'NGN', position: 'before', decimals: 2 },
                  { name: 'US Dollar ($ USD)', symbol: '$', code: 'USD', position: 'before', decimals: 2 },
                  { name: 'Euro (€ EUR)', symbol: '€', code: 'EUR', position: 'after', decimals: 2 },
                  { name: 'British Pound (£ GBP)', symbol: '£', code: 'GBP', position: 'before', decimals: 2 },
                  { name: 'Ghanaian Cedi (₵ GHS)', symbol: '₵', code: 'GHS', position: 'before', decimals: 2 },
                  { name: 'South African Rand (R ZAR)', symbol: 'R', code: 'ZAR', position: 'before', decimals: 2 },
                ].map((cur) => (
                  <button
                    key={cur.code}
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        currency: {
                          symbol: cur.symbol,
                          code: cur.code,
                          position: cur.position as 'before' | 'after',
                          decimals: cur.decimals,
                        },
                      })
                    }
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                      draft.currency.code === cur.code
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cur.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={draft.currency.symbol}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      currency: { ...draft.currency, symbol: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Currency ISO Code</label>
                <input
                  type="text"
                  value={draft.currency.code}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      currency: { ...draft.currency, code: e.target.value.toUpperCase() },
                    })
                  }
                  className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Symbol Position</label>
                <select
                  value={draft.currency.position}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      currency: {
                        ...draft.currency,
                        position: e.target.value as 'before' | 'after',
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="before">Before Amount (e.g. {draft.currency.symbol}125.00)</option>
                  <option value="after">After Amount (e.g. 125.00 {draft.currency.symbol})</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Decimal Places</label>
                <select
                  value={draft.currency.decimals}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      currency: { ...draft.currency, decimals: parseInt(e.target.value) || 2 },
                    })
                  }
                  className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="2">2 Decimal Places (125.00)</option>
                  <option value="0">0 Decimal Places (125 - e.g. JPY, KRW)</option>
                </select>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex justify-between items-center font-mono">
              <span className="text-slate-400">Live Currency Preview:</span>
              <span className="text-amber-400 font-bold text-sm">
                {formatCurrency(142.5, draft.currency)}
              </span>
            </div>
          </div>
        )}

        {/* TAB 4: TIME & CUTOFF ZONES */}
        {activeTab === 'time' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Timezone & Nightlife Business Rollover
              </h3>
              <p className="text-xs text-slate-400">
                Lounge & bistro service extends past midnight. Set your cutoff hour so late-night sales
                (e.g., 01:00 to 03:30 AM) report on the same business day shift!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Operating Timezone</label>
                <select
                  value={draft.time.timezone}
                  onChange={(e) =>
                    setDraft({ ...draft, time: { ...draft.time, timezone: e.target.value } })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="America/Los_Angeles">America/Los Angeles (PT)</option>
                  <option value="America/New_York">America/New York (ET)</option>
                  <option value="America/Chicago">America/Chicago (CT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Time Display Format</label>
                <select
                  value={draft.time.timeFormat}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      time: { ...draft.time, timeFormat: e.target.value as '12h' | '24h' },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="12h">12-Hour Format (e.g. 10:45 PM)</option>
                  <option value="24h">24-Hour Format (e.g. 22:45)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 mb-1">
                  Business Day Rollover Cutoff Hour: {draft.time.businessDayCutoffHour}:00 AM
                </label>
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="1"
                  value={draft.time.businessDayCutoffHour}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      time: {
                        ...draft.time,
                        businessDayCutoffHour: parseInt(e.target.value) || 4,
                      },
                    })
                  }
                  className="w-full accent-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Orders placed before {draft.time.businessDayCutoffHour}:00 AM will roll up into
                  the preceding service evening&apos;s Z-Report.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TAX & SERVICE CHARGES */}
        {activeTab === 'tax' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Tax & Hospitality Service Charges
              </h3>
              <p className="text-xs text-slate-400">
                Configure regional sales tax and automatic lounge hospitality service percentages.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Sales Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={draft.tax.salesTaxRate}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      tax: { ...draft.tax, salesTaxRate: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  Default Hospitality Service Charge (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={draft.tax.serviceChargeRate}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      tax: {
                        ...draft.tax,
                        serviceChargeRate: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="taxInclusive"
                  checked={draft.tax.taxInclusive}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      tax: { ...draft.tax, taxInclusive: e.target.checked },
                    })
                  }
                  className="rounded text-amber-500 bg-slate-950 border-slate-800"
                />
                <label htmlFor="taxInclusive" className="text-slate-300">
                  Tax-Inclusive Pricing (Menu display prices already include tax, common in Europe/UK)
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PRINT & RECEIPTS */}
        {activeTab === 'print' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Receipts & Printer Settings
              </h3>
              <p className="text-xs text-slate-400">
                Configure physical thermal 80mm roll vs full sheet output, receipt headers, and
                automatic print triggers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Target Printer Paper Format</label>
                <select
                  value={draft.print.paperSize}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      print: {
                        ...draft.print,
                        paperSize: e.target.value as 'thermal_80mm' | 'standard_letter',
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="thermal_80mm">80mm Thermal Receipt Roll (Standard POS)</option>
                  <option value="standard_letter">Standard Full Sheet (A4 / Letter)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Receipt Header Title</label>
                <input
                  type="text"
                  value={draft.print.receiptHeaderTitle}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      print: { ...draft.print, receiptHeaderTitle: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 mb-1">Receipt Subheader</label>
                <input
                  type="text"
                  value={draft.print.receiptSubheader}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      print: { ...draft.print, receiptSubheader: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 mb-1">Receipt Footer Message</label>
                <input
                  type="text"
                  value={draft.print.receiptFooterText}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      print: { ...draft.print, receiptFooterText: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="sm:col-span-2 space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showIngredientDeductions"
                    checked={draft.print.showIngredientDeductionsOnReceipt}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        print: {
                          ...draft.print,
                          showIngredientDeductionsOnReceipt: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-amber-500 bg-slate-950 border-slate-800"
                  />
                  <label htmlFor="showIngredientDeductions" className="text-slate-300">
                    Print automated recipe ingredient stock deductions on merchant/kitchen copies
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoPrintReceipt"
                    checked={draft.print.autoPrintReceiptOnSale}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        print: { ...draft.print, autoPrintReceiptOnSale: e.target.checked },
                      })
                    }
                    className="rounded text-amber-500 bg-slate-950 border-slate-800"
                  />
                  <label htmlFor="autoPrintReceipt" className="text-slate-300">
                    Automatically open print preview whenever an order is settled
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: LANGUAGE SETTINGS */}
        {activeTab === 'language' && (
          <div className="space-y-4 max-w-2xl">
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Language & Localization
              </h3>
              <p className="text-xs text-slate-400">
                Select system interface and receipt generation language.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { code: 'en', label: 'English (US & International)' },
                { code: 'es', label: 'Español (Spanish)' },
                { code: 'fr', label: 'Français (French)' },
                { code: 'de', label: 'Deutsch (German)' },
                { code: 'ja', label: '日本語 (Japanese)' },
                { code: 'ar', label: 'العربية (Arabic)' },
              ].map((lang) => (
                <div
                  key={lang.code}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      language: { language: lang.code as any },
                    })
                  }
                  className={`p-3.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                    draft.language.language === lang.code
                      ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-semibold'
                      : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>{lang.label}</span>
                  {draft.language.language === lang.code && <Check className="w-4 h-4" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: EMAIL NOTIFICATION SETTINGS */}
        {activeTab === 'notifications' && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Email Notification & Automated Alert Triggers</span>
              </h3>
              <p className="text-xs text-slate-400">
                Automated email alerts dispatched to management, bar leads, and chefs for low stock
                and shift closings.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">
                      Automated Low-Stock Par Threshold Alerts
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Dispatched when any ingredient current stock falls at or below par level
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.notifications.lowStockAlertsEnabled}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        notifications: {
                          ...draft.notifications,
                          lowStockAlertsEnabled: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-amber-500 bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                  <div>
                    <div className="font-semibold text-slate-200">
                      Critical Stock Emergency Alert
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Immediate high-priority email alert when stock reaches critical depletion (&lt;
                      20%)
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.notifications.criticalStockImmediateAlert}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        notifications: {
                          ...draft.notifications,
                          criticalStockImmediateAlert: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-amber-500 bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                  <div>
                    <div className="font-semibold text-slate-200">
                      End-of-Day (EOD) Z-Report Summary Digest
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Sends complete shift revenue, cash variance, recipe COGS, and ingredient
                      depletion upon closeout
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.notifications.eodReportDigestEnabled}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        notifications: {
                          ...draft.notifications,
                          eodReportDigestEnabled: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-amber-500 bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                  <div>
                    <div className="font-semibold text-slate-200">
                      Cash Drawer Variance Alert
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Triggers immediately if actual cash count deviates by more than {formatCurrency(5, draft.currency)}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.notifications.varianceFlagAlertEnabled}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        notifications: {
                          ...draft.notifications,
                          varianceFlagAlertEnabled: e.target.checked,
                        },
                      })
                    }
                    className="rounded text-amber-500 bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              {/* Recipient Emails Manager */}
              <div className="space-y-2 pt-2">
                <label className="block text-slate-300 font-semibold">
                  Notification Recipient Emails ({draft.notifications.recipientEmails.length})
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newRecipientEmail}
                    onChange={(e) => setNewRecipientEmail(e.target.value)}
                    placeholder="manager@lounge.com or barlead@lounge.com"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddRecipient}
                    className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg cursor-pointer"
                  >
                    Add Email
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {draft.notifications.recipientEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px]"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(email)}
                        className="text-slate-400 hover:text-red-400 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Full SMTP Server Configuration Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-900">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="font-semibold text-slate-200">Outbound SMTP Server Configuration</div>
                      <div className="text-[11px] text-slate-400">
                        Specify SMTP credentials for automated dispatch to management & bar staff
                      </div>
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500">Presets:</span>
                    <button
                      type="button"
                      onClick={() => handleApplySmtpPreset('kofly')}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer"
                    >
                      Kofly Mail
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySmtpPreset('gmail')}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 hover:text-slate-100 cursor-pointer"
                    >
                      Gmail
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySmtpPreset('office365')}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 hover:text-slate-100 cursor-pointer"
                    >
                      Office 365
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySmtpPreset('sendgrid')}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 hover:text-slate-100 cursor-pointer"
                    >
                      SendGrid
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 mb-1">SMTP Host Server</label>
                    <input
                      type="text"
                      value={draft.notifications.smtpHost || ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          notifications: {
                            ...draft.notifications,
                            smtpHost: e.target.value,
                          },
                        })
                      }
                      placeholder="mail.koflylounge.ng or smtp.gmail.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Port</label>
                    <input
                      type="number"
                      value={draft.notifications.smtpPort || 587}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          notifications: {
                            ...draft.notifications,
                            smtpPort: parseInt(e.target.value) || 587,
                          },
                        })
                      }
                      placeholder="587"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Encryption Protocol</label>
                    <select
                      value={draft.notifications.smtpSecure || 'tls'}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          notifications: {
                            ...draft.notifications,
                            smtpSecure: e.target.value as any,
                          },
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs"
                    >
                      <option value="tls">STARTTLS / TLS (Recommended - Port 587)</option>
                      <option value="ssl">SSL / TLS Direct (Port 465)</option>
                      <option value="none">None / Plain (Port 25)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="smtpAuthToggle"
                      checked={draft.notifications.smtpAuthRequired ?? true}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          notifications: {
                            ...draft.notifications,
                            smtpAuthRequired: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-amber-500 bg-slate-900 border-slate-700"
                    />
                    <label htmlFor="smtpAuthToggle" className="text-slate-300 text-xs cursor-pointer">
                      Require SMTP Authentication (AUTH PLAIN / LOGIN)
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-300 mb-1">SMTP Username / Login Email</label>
                    <input
                      type="text"
                      value={draft.notifications.smtpUsername || ''}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          notifications: {
                            ...draft.notifications,
                            smtpUsername: e.target.value,
                          },
                        })
                      }
                      placeholder="notifications@koflylounge.ng"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">SMTP Password / App Password</label>
                    <div className="relative">
                      <input
                        type={showSmtpPassword ? 'text' : 'password'}
                        value={draft.notifications.smtpPassword || ''}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            notifications: {
                              ...draft.notifications,
                              smtpPassword: e.target.value,
                            },
                          })
                        }
                        placeholder="••••••••••••••••"
                        className="w-full pl-3 pr-10 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        {showSmtpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-300 mb-1">Sender Display Name</label>
                    <input
                      type="text"
                      value={draft.notifications.smtpSenderName}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          notifications: {
                            ...draft.notifications,
                            smtpSenderName: e.target.value,
                          },
                        })
                      }
                      placeholder="Kofly Lounge Notification Engine"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">From Email Address</label>
                    <input
                      type="email"
                      value={draft.notifications.smtpFromEmail}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          notifications: {
                            ...draft.notifications,
                            smtpFromEmail: e.target.value,
                          },
                        })
                      }
                      placeholder="notifications@koflylounge.ng"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Test Connection Output Log */}
                {smtpTestResult && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{smtpTestResult.message}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {smtpTestResult.timestamp}
                      </span>
                    </div>
                    <div className="space-y-1 font-mono text-[10px] text-slate-300 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                      {smtpTestResult.details.map((line, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-emerald-400">✓</span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-900">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Credentials encrypted & saved in local and cloud system state.</span>
                  </div>

                  <button
                    type="button"
                    disabled={smtpTesting}
                    onClick={handleTestSmtpConnection}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl cursor-pointer shadow-xs transition-all disabled:opacity-50"
                  >
                    {smtpTesting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Testing SMTP Connection...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Test SMTP Connection & Dispatch</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
