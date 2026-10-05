export type IngredientCategory =
  | 'Spirits & Liqueurs'
  | 'Mixers & Garnishes'
  | 'Wagyu & Proteins'
  | 'Artisanal Dairy & Produce'
  | 'Dry Pantry & Bakery'
  | 'Cellar Wines';

export type StorageZone =
  | 'Main Backbar'
  | 'Walk-in Cold Room'
  | 'Dry Bistro Pantry'
  | 'Temperature Cellar';

export type UnitType = 'ml' | 'g' | 'pc' | 'oz';

export interface Ingredient {
  id: string;
  name: string;
  sku: string;
  category: IngredientCategory;
  storageZone: StorageZone;
  currentStock: number;
  parLevel: number; // Automated alert triggers when currentStock <= parLevel
  criticalLevel: number; // Critical alert triggers when currentStock <= criticalLevel
  maxCapacity: number;
  unit: UnitType;
  costPerUnit: number;
  supplier: string;
  lastRestockedAt: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
}

export type MenuCategory =
  | 'Signature Cocktails'
  | 'Bistro Plates'
  | 'Artisanal Shareables'
  | 'Cellar & Reserve';

export type PrepStation =
  | 'Lounge Mixology Bar'
  | 'Bistro Hot Kitchen'
  | 'Garde Manger & Charcuterie'
  | 'Sommelier Cellar';

export interface MenuItem {
  id: string;
  name: string;
  sku: string;
  category: MenuCategory;
  price: number;
  description: string;
  prepStation: PrepStation;
  imageKey?: 'old_fashioned' | 'wagyu_sliders' | 'espresso_martini' | 'burrata_charcuterie';
  recipe: RecipeIngredient[];
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  notes?: string;
}

export interface IngredientDeductionRecord {
  ingredientId: string;
  ingredientName: string;
  quantityDeducted: number;
  unit: UnitType;
  remainingStockAfter: number;
  costImpact: number;
}

export type ServiceMode = 'Lounge Table' | 'Bar Tab' | 'Bistro Dining' | 'VIP Booth';
export type PaymentMethod = 'Card Terminal' | 'Cash Drawer' | 'VIP House Account' | 'Split Tender';

export interface SaleOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  tableOrTab: string;
  serviceMode: ServiceMode;
  customerId?: string;
  customerName?: string;
  serverName: string;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  serviceCharge: number;
  discountAmount: number;
  totalAmount: number;
  totalCogs: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  changeGiven?: number;
  deductions: IngredientDeductionRecord[];
  syncedFromOffline?: boolean;
  deviceOrigin: string;
}

export type StockMovementType =
  | 'SALE_DEDUCTION'
  | 'RESTOCK_RECEIPT'
  | 'WASTE_SPILLAGE'
  | 'AUDIT_ADJUSTMENT';

export interface StockMovement {
  id: string;
  timestamp: string;
  ingredientId: string;
  ingredientName: string;
  type: StockMovementType;
  delta: number;
  unit: UnitType;
  balanceAfter: number;
  costImpact: number;
  reference: string;
  actor: string;
}

export type CustomerTier = 'Obsidian VIP' | 'Gold Reserve' | 'Silver Patron' | 'Standard Guest';

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: CustomerTier;
  loyaltyPoints: number;
  lifetimeSpend: number;
  visitsCount: number;
  lastVisitAt: string;
  favoriteItem: string;
  seatingPreference: string;
  dietaryNotes: string;
  houseAccountBalance: number;
}

export type UserRole =
  | 'admin'
  | 'manager'
  | 'bartender'
  | 'cashier'
  | 'inventory';

export type PermissionKey =
  | 'pos_sales'
  | 'pos_discounts'
  | 'inventory_view'
  | 'inventory_restock'
  | 'inventory_adjust'
  | 'recipe_edit'
  | 'analytics_view'
  | 'eod_closeout'
  | 'crm_manage'
  | 'manage_users'
  | 'system_settings'
  | 'purchase_orders_manage'
  | (string & {});

export interface PermissionDefinition {
  key: string;
  title: string;
  description: string;
  category?: string;
  isCustom?: boolean;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  pin: string;
  password?: string;
  active: boolean;
  avatarUrl?: string;
  customPermissions?: PermissionKey[];
  lastLoginAt?: string;
  registrationDate?: string;
  otpVerified?: boolean;
}

export type ThemeMode =
  | 'dark_luxe'
  | 'obsidian'
  | 'warm_bistro'
  | 'light_ivory'
  | 'light_wine_pink'
  | 'light_navy_blue';

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: 'Net 15' | 'Net 30' | 'Net 60' | 'COD' | 'Prepaid';
  categories: IngredientCategory[];
  leadTimeDays: number;
  notes?: string;
  active: boolean;
}

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'ORDERED_SENT'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED_COMPLETED'
  | 'CANCELLED';

export interface PurchaseOrderItem {
  ingredientId: string;
  ingredientName: string;
  unit: UnitType;
  quantityOrdered: number;
  unitCost: number;
  totalCost: number;
  quantityReceived?: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate: string;
  receivedDate?: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  shippingFee: number;
  totalAmount: number;
  notes: string;
  createdBy: string;
  receivedBy?: string;
}

export interface BrandingSettings {
  businessName: string;
  tagline: string;
  logoUrl: string;
  address: string;
  phone: string;
  website: string;
  taxIdNumber: string;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  position: 'before' | 'after';
  decimals: number;
}

export interface TimezoneConfig {
  timezone: string;
  timeFormat: '12h' | '24h';
  businessDayCutoffHour: number;
}

export interface TaxSettings {
  salesTaxRate: number;
  serviceChargeRate: number;
  taxInclusive: boolean;
}

export interface PrintSettings {
  paperSize: 'thermal_80mm' | 'standard_letter';
  autoPrintReceiptOnSale: boolean;
  showLogoOnReceipt: boolean;
  showIngredientDeductionsOnReceipt: boolean;
  receiptHeaderTitle: string;
  receiptSubheader: string;
  receiptFooterText: string;
}

export interface LanguageConfig {
  language: 'en' | 'es' | 'fr' | 'de' | 'ja' | 'ar';
}

export interface EmailNotificationSettings {
  lowStockAlertsEnabled: boolean;
  criticalStockImmediateAlert: boolean;
  eodReportDigestEnabled: boolean;
  varianceFlagAlertEnabled: boolean;
  recipientEmails: string[];
  smtpSenderName: string;
  smtpFromEmail: string;
  alertFrequency: 'instant' | 'daily_digest';
}

export interface GeneralSystemSettings {
  theme: ThemeMode;
  branding: BrandingSettings;
  currency: CurrencyConfig;
  time: TimezoneConfig;
  tax: TaxSettings;
  print: PrintSettings;
  language: LanguageConfig;
  notifications: EmailNotificationSettings;
  rolePermissions?: Record<UserRole, string[]>;
  customPermissions?: PermissionDefinition[];
}

export interface EodReconciliation {
  id: string;
  businessDate: string;
  closedAt: string;
  closedBy: string;
  shiftLabel: string;
  openingFloat: number;
  cashSalesSystem: number;
  cashPayouts: number;
  expectedCashInDrawer: number;
  actualCashCounted: number;
  cashVariance: number;
  cardSalesSystem: number;
  cardTerminalBatchTotal: number;
  cardVariance: number;
  vipAccountSalesSystem: number;
  totalGrossSales: number;
  totalTaxCollected: number;
  totalServiceCharges: number;
  totalDiscounts: number;
  totalRecipeCogs: number;
  wasteAndSpillageCost: number;
  netOperatingMargin: number;
  ordersCount: number;
  lowStockAlertsAtClose: number;
  notes: string;
  status: 'RECONCILED_BALANCED' | 'VARIANCE_FLAGGED';
}

export type SyncOperationType =
  | 'CREATE_SALE'
  | 'RESTOCK_INGREDIENT'
  | 'ADJUST_INGREDIENT'
  | 'CREATE_INGREDIENT'
  | 'CREATE_MENU_ITEM'
  | 'UPDATE_MENU_RECIPE'
  | 'CREATE_CUSTOMER'
  | 'UPDATE_CUSTOMER'
  | 'CREATE_EOD_RECONCILIATION'
  | 'UPDATE_SYSTEM_SETTINGS'
  | 'UPDATE_ROLE_PERMISSIONS'
  | 'CREATE_CUSTOM_PERMISSION'
  | 'DELETE_CUSTOM_PERMISSION'
  | 'CREATE_STAFF_USER'
  | 'UPDATE_STAFF_USER'
  | 'DELETE_STAFF_USER'
  | 'CREATE_PURCHASE_ORDER'
  | 'UPDATE_PURCHASE_ORDER'
  | 'RECEIVE_PURCHASE_ORDER'
  | 'CREATE_SUPPLIER'
  | 'UPDATE_SUPPLIER';

export interface SyncOperation {
  id: string;
  timestamp: string;
  deviceId: string;
  type: SyncOperationType;
  description: string;
  payload: any;
}

export interface SyncLogEntry {
  id: string;
  syncedAt: string;
  deviceId: string;
  operationsCount: number;
  summary: string;
}

export interface CloudSystemState {
  version: number;
  lastUpdated: string;
  ingredients: Ingredient[];
  menuItems: MenuItem[];
  orders: SaleOrder[];
  stockMovements: StockMovement[];
  customers: CustomerProfile[];
  reconciliations: EodReconciliation[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  appliedOperationIds: string[];
  syncLog: SyncLogEntry[];
  settings: GeneralSystemSettings;
  users: StaffUser[];
  activeUserId: string;
}
