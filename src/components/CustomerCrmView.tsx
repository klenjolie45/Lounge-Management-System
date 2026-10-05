import React, { useMemo, useState } from 'react';
import {
  Award,
  CreditCard,
  Plus,
  Search,
  Sparkles,
  UserPlus,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import {
  CloudSystemState,
  CustomerProfile,
  CustomerTier,
  SyncOperationType,
} from '../types/lounge';
import { formatCurrency } from '../utils/formatters';

interface CustomerCrmViewProps {
  state: CloudSystemState;
  onDispatch: (type: SyncOperationType, payload: any, description: string) => Promise<void>;
  onStartOrderForCustomer: (customer: CustomerProfile) => void;
}

export const CustomerCrmView: React.FC<CustomerCrmViewProps> = ({
  state,
  onDispatch,
  onStartOrderForCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'All' | CustomerTier>('All');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    state.customers[0]?.id || ''
  );

  // Add new customer modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTier, setNewTier] = useState<CustomerTier>('Gold Reserve');
  const [newSeating, setNewSeating] = useState('Booth 02 · Amber Alcove');
  const [newDietary, setNewDietary] = useState('');
  const [newFavorite, setNewFavorite] = useState('Smoked Bourbon Old Fashioned');

  const filteredCustomers = useMemo(() => {
    return state.customers.filter((c) => {
      const matchesTier = tierFilter === 'All' || c.tier === tierFilter;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesTier;
      return (
        matchesTier &&
        (c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.favoriteItem.toLowerCase().includes(q))
      );
    });
  }, [state.customers, tierFilter, searchQuery]);

  const activeCustomer = useMemo(
    () =>
      state.customers.find((c) => c.id === selectedCustomerId) ||
      filteredCustomers[0] ||
      null,
    [state.customers, selectedCustomerId, filteredCustomers]
  );

  const guestOrders = useMemo(() => {
    if (!activeCustomer) return [];
    return state.orders.filter((o) => o.customerId === activeCustomer.id);
  }, [state.orders, activeCustomer]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const cust: CustomerProfile = {
      id: `cust-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim() || 'guest@loungepatron.io',
      phone: newPhone.trim() || '+1 (415) 555-0192',
      tier: newTier,
      loyaltyPoints: newTier === 'Obsidian VIP' ? 2500 : newTier === 'Gold Reserve' ? 1000 : 250,
      lifetimeSpend: 0,
      visitsCount: 1,
      lastVisitAt: new Date().toISOString(),
      favoriteItem: newFavorite,
      seatingPreference: newSeating,
      dietaryNotes: newDietary.trim() || 'None specified.',
      houseAccountBalance: 0,
    };

    await onDispatch(
      'CREATE_CUSTOMER',
      { customer: cust },
      `Enrolled guest ${cust.name} (${cust.tier})`
    );
    setSelectedCustomerId(cust.id);
    setShowNewModal(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewDietary('');
  };

  const handleSettleHouseAccount = async (cust: CustomerProfile) => {
    if (cust.houseAccountBalance <= 0) return;
    await onDispatch(
      'UPDATE_CUSTOMER',
      {
        customerId: cust.id,
        updates: { houseAccountBalance: 0 },
      },
      `Settled VIP House Account balance (${formatCurrency(cust.houseAccountBalance, state.settings?.currency)}) for ${cust.name}`
    );
  };

  const handleGrantLoyaltyBonus = async (cust: CustomerProfile, pts: number) => {
    await onDispatch(
      'UPDATE_CUSTOMER',
      {
        customerId: cust.id,
        updates: { loyaltyPoints: cust.loyaltyPoints + pts },
      },
      `Granted +${pts} hospitality loyalty points to ${cust.name}`
    );
  };

  const totalLifetimeSpend = state.customers.reduce((acc, c) => acc + c.lifetimeSpend, 0);
  const totalHouseReceivables = state.customers.reduce(
    (acc, c) => acc + c.houseAccountBalance,
    0
  );

  return (
    <div className="space-y-6">
      {/* CRM Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Registered Lounge Patrons</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-100">
            {state.customers.length} Guests
          </div>
          <p className="text-xs text-slate-400">
            {state.customers.filter((c) => c.tier === 'Obsidian VIP').length} Obsidian VIP members
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Tracked Member Lifetime Spend</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-amber-400">
            {formatCurrency(totalLifetimeSpend, state.settings?.currency)}
          </div>
          <p className="text-xs text-slate-400">
            Synchronized across lounge & bistro POS
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">VIP House Account Receivables</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-slate-100">
            {formatCurrency(totalHouseReceivables, state.settings?.currency)}
          </div>
          <p className="text-xs text-slate-400">
            Monthly member tab billing active
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Active Loyalty Privileges</span>
          <div className="text-2xl font-semibold font-mono tabular-nums text-emerald-400">
            10% / 5%
          </div>
          <p className="text-xs text-slate-400">
            Obsidian VIP (10%) · Gold Reserve (5%)
          </p>
        </div>
      </div>

      {/* Filter Bar & New Guest Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
          {(
            ['All', 'Obsidian VIP', 'Gold Reserve', 'Silver Patron', 'Standard Guest'] as const
          ).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                tierFilter === tier
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest name, email, drink..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Enroll VIP Guest</span>
          </button>
        </div>
      </div>

      {/* Master-Detail Guest Directory & Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Guest Table */}
        <div className="lg:col-span-7 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4 font-medium">Guest & Contact</th>
                  <th className="py-3 px-4 font-medium">Membership Tier</th>
                  <th className="py-3 px-4 font-medium text-right">Lifetime Spend</th>
                  <th className="py-3 px-4 font-medium text-right">Loyalty Points</th>
                  <th className="py-3 px-4 font-medium text-right">House Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-xs">
                {filteredCustomers.map((cust) => {
                  const isSelected = activeCustomer?.id === cust.id;
                  return (
                    <tr
                      key={cust.id}
                      onClick={() => setSelectedCustomerId(cust.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-500/10'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100">{cust.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {cust.phone} · {cust.visitsCount} visits
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-medium ${
                            cust.tier === 'Obsidian VIP'
                              ? 'text-amber-400'
                              : cust.tier === 'Gold Reserve'
                              ? 'text-amber-200'
                              : 'text-slate-300'
                          }`}
                        >
                          {cust.tier}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-100">
                        {formatCurrency(cust.lifetimeSpend, state.settings?.currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-300">
                        {cust.loyaltyPoints.toLocaleString()} pts
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                        {formatCurrency(cust.houseAccountBalance, state.settings?.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5 Columns: Active Guest Hospitality Dossier */}
        {activeCustomer && (
          <div className="lg:col-span-5 rounded-xl bg-slate-900 border border-slate-800 p-5 space-y-5">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-amber-400 font-medium">
                  {activeCustomer.tier} · {activeCustomer.visitsCount} Recorded Visits
                </span>
                <h3 className="text-lg font-semibold text-slate-100 mt-0.5">
                  {activeCustomer.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {activeCustomer.email} · {activeCustomer.phone}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onStartOrderForCustomer(activeCustomer)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg whitespace-nowrap cursor-pointer"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Open POS Ticket</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Lifetime Spend</div>
                <div className="text-sm font-semibold font-mono tabular-nums text-slate-100 mt-0.5">
                  {formatCurrency(activeCustomer.lifetimeSpend, state.settings?.currency)}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Loyalty Balance</div>
                <div className="text-sm font-semibold font-mono tabular-nums text-amber-400 mt-0.5">
                  {activeCustomer.loyaltyPoints.toLocaleString()} pts
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">House Account</div>
                <div className="text-sm font-semibold font-mono tabular-nums text-slate-100 mt-0.5">
                  {formatCurrency(activeCustomer.houseAccountBalance, state.settings?.currency)}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div>
                <span className="text-slate-400">Preferred Table / Seating: </span>
                <span className="text-slate-200 font-medium">
                  {activeCustomer.seatingPreference}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Signature Order: </span>
                <span className="text-amber-300 font-medium">
                  {activeCustomer.favoriteItem}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Hospitality & Dietary Notes: </span>
                <span className="text-slate-200">{activeCustomer.dietaryNotes}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleGrantLoyaltyBonus(activeCustomer, 250)}
                className="flex-1 py-2 px-3 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Grant +250 Bonus Pts</span>
              </button>

              {activeCustomer.houseAccountBalance > 0 && (
                <button
                  type="button"
                  onClick={() => handleSettleHouseAccount(activeCustomer)}
                  className="flex-1 py-2 px-3 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Settle House Tab ({formatCurrency(activeCustomer.houseAccountBalance, state.settings?.currency)})</span>
                </button>
              )}
            </div>

            {/* Guest Historical Orders */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-xs font-semibold text-slate-300">
                Recent Lounge & Bistro Orders ({guestOrders.length})
              </div>
              {guestOrders.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No orders logged for this guest in the current session.
                </p>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {guestOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono text-amber-400 font-medium">
                          {ord.orderNumber}
                        </span>{' '}
                        · <span className="text-slate-400">{ord.tableOrTab}</span>
                        <div className="text-[11px] text-slate-300">
                          {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums text-slate-100 font-semibold">
                        {formatCurrency(ord.totalAmount, state.settings?.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Enroll New VIP Guest */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={handleCreateCustomer}
            className="w-full max-w-md rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-slate-100">
                Enroll Lounge & Bistro Patron
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Victoria Kensington"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="victoria@domain.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+1 (415) 555-0199"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Membership Tier</label>
                  <select
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as CustomerTier)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    <option value="Obsidian VIP">Obsidian VIP (10% Off)</option>
                    <option value="Gold Reserve">Gold Reserve (5% Off)</option>
                    <option value="Silver Patron">Silver Patron</option>
                    <option value="Standard Guest">Standard Guest</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Seating Preference</label>
                  <input
                    type="text"
                    value={newSeating}
                    onChange={(e) => setNewSeating(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-300 mb-1">Favorite Cocktail / Dish</label>
                <input
                  type="text"
                  value={newFavorite}
                  onChange={(e) => setNewFavorite(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 mb-1">
                  Allergies & Hospitality Preferences
                </label>
                <input
                  type="text"
                  value={newDietary}
                  onChange={(e) => setNewDietary(e.target.value)}
                  placeholder="e.g., No peanuts; prefers corner booth"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-xs text-slate-300 bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-lg cursor-pointer"
              >
                Save Guest Profile
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
