import {
  CloudSystemState,
  GeneralSystemSettings,
  MenuCategoryDefinition,
  MenuItem,
  PurchaseOrder,
  StaffUser,
  Supplier,
  SyncOperation,
  UserRole,
} from '../types/lounge';
import { ROLE_DEFAULT_PERMISSIONS } from '../utils/formatters';

export const DEFAULT_SETTINGS: GeneralSystemSettings = {
  theme: 'dark_luxe',
  branding: {
    businessName: 'Kofly Lounge & Bistro',
    tagline: 'Craft Mixology & Culinary Bar',
    logoUrl: '',
    address: '450 Velvet Boulevard, Suite 100, Lagos',
    phone: '+234 803 123 4567',
    website: 'https://koflylounge.ng',
    taxIdNumber: 'TIN-94-3829104',
  },
  currency: {
    code: 'NGN',
    symbol: '₦',
    position: 'before',
    decimals: 2,
  },
  time: {
    timezone: 'Africa/Lagos',
    timeFormat: '12h',
    businessDayCutoffHour: 4,
  },
  tax: {
    salesTaxRate: 7.5,
    serviceChargeRate: 10.0,
    taxInclusive: false,
  },
  print: {
    paperSize: 'thermal_80mm',
    autoPrintReceiptOnSale: false,
    showLogoOnReceipt: true,
    showIngredientDeductionsOnReceipt: true,
    receiptHeaderTitle: 'KOFLY LOUNGE & BISTRO',
    receiptSubheader: 'Craft Mixology & Culinary Bar',
    receiptFooterText: 'Thank you for dining with us at Kofly Lounge.',
  },
  language: {
    language: 'en',
  },
  notifications: {
    lowStockAlertsEnabled: true,
    criticalStockImmediateAlert: true,
    eodReportDigestEnabled: true,
    varianceFlagAlertEnabled: true,
    recipientEmails: ['fadray@koflylounge.ng', 'manager@koflylounge.ng'],
    smtpSenderName: 'Kofly Lounge Notification Engine',
    smtpFromEmail: 'notifications@koflylounge.ng',
    smtpHost: 'mail.koflylounge.ng',
    smtpPort: 587,
    smtpSecure: 'tls',
    smtpUsername: 'notifications@koflylounge.ng',
    smtpPassword: '••••••••••••',
    smtpAuthRequired: true,
    alertFrequency: 'instant',
  },
  rolePermissions: ROLE_DEFAULT_PERMISSIONS,
  customPermissions: [
    {
      key: 'vip_bottle_service',
      title: 'VIP Bottle Service & Reserve Cellar Access',
      description: 'Authorize uncorking of vintage reserves and complimentary VIP table pours',
      category: 'Service Privileges',
      isCustom: true,
    },
    {
      key: 'manager_comp_void',
      title: 'Manager Hospitality Comps & Line Voids',
      description: 'Void active order line items and grant manager hospitality allowances',
      category: 'Management Privileges',
      isCustom: true,
    },
  ],
};

export const DEFAULT_MENU_CATEGORIES: MenuCategoryDefinition[] = [
  {
    id: 'cat-cocktails',
    name: 'Signature Cocktails',
    description: 'Hand-crafted artisanal cocktails and craft mixology creations',
    badgeColor: 'amber',
    sortOrder: 1,
  },
  {
    id: 'cat-bistro',
    name: 'Bistro Plates',
    description: 'Hot gourmet kitchen entrees, truffle sliders, and chef specialties',
    badgeColor: 'emerald',
    sortOrder: 2,
  },
  {
    id: 'cat-shareables',
    name: 'Artisanal Shareables',
    description: 'Cave-aged charcuterie, burrata boards, and communal tapas',
    badgeColor: 'rose',
    sortOrder: 3,
  },
  {
    id: 'cat-cellar',
    name: 'Cellar & Reserve',
    description: 'Grand Cru Champagnes, Barolo DOCG, and sommelier reserve pours',
    badgeColor: 'purple',
    sortOrder: 4,
  },
  {
    id: 'cat-mocktails',
    name: 'Mocktails & Tonics',
    description: 'Zero-proof botanicals, pressed juices, and craft sodas',
    badgeColor: 'cyan',
    sortOrder: 5,
  },
  {
    id: 'cat-desserts',
    name: 'Desserts & Digestifs',
    description: 'Artisanal confections, espresso desserts, and digestif pours',
    badgeColor: 'amber',
    sortOrder: 6,
  },
];

export const DEFAULT_STAFF_USERS: StaffUser[] = [
  {
    id: 'usr-admin-01',
    name: 'Fadray Bukola',
    email: 'fadray@koflylounge.ng',
    phone: '+234 803 123 4567',
    role: 'admin',
    pin: '1234',
    password: 'KoflyAdmin',
    active: true,
    avatarUrl: '',
  },
  {
    id: 'usr-mgr-02',
    name: 'Mateo Silva',
    email: 'mateo.bar@lounge.internal',
    phone: '+1 (415) 555-0102',
    role: 'manager',
    pin: '2345',
    password: 'bar',
    active: true,
    avatarUrl: '',
  },
  {
    id: 'usr-bar-03',
    name: 'Claire Dupont',
    email: 'claire.mix@lounge.internal',
    phone: '+1 (415) 555-0103',
    role: 'bartender',
    pin: '3456',
    password: 'mix',
    active: true,
    avatarUrl: '',
  },
  {
    id: 'usr-cash-04',
    name: 'Julian Cruz',
    email: 'julian.c@lounge.internal',
    phone: '+1 (415) 555-0104',
    role: 'cashier',
    pin: '4567',
    password: 'cash',
    active: true,
    avatarUrl: '',
  },
  {
    id: 'usr-inv-05',
    name: 'Sora Tanaka',
    email: 'sora.cellar@lounge.internal',
    phone: '+1 (415) 555-0105',
    role: 'inventory',
    pin: '5678',
    password: 'inv',
    active: true,
    avatarUrl: '',
  },
];

export const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-heritage',
    name: 'Heritage Distillers Co.',
    contactPerson: 'Alistair Vance',
    email: 'orders@heritagedistillers.com',
    phone: '+1 (502) 555-0142',
    address: '840 Bourbon Trail Way, Bardstown, KY',
    paymentTerms: 'Net 30',
    categories: ['Spirits & Liqueurs'],
    leadTimeDays: 2,
    notes: 'Primary Kentucky bourbon and dry botanical gin vendor. Delivers Tuesdays & Thursdays.',
    active: true,
  },
  {
    id: 'sup-vesper',
    name: 'Vesper Bar Provisions',
    contactPerson: 'Maeve Thorne',
    email: 'supply@vesperprovisions.com',
    phone: '+1 (415) 555-8921',
    address: '122 Montgomery St, San Francisco, CA',
    paymentTerms: 'Net 15',
    categories: ['Mixers & Garnishes'],
    leadTimeDays: 1,
    notes: 'Artisan aromatic bark bitters, demerara cane syrups, and specialty lounge cocktail mixers.',
    active: true,
  },
  {
    id: 'sup-prime-meats',
    name: 'Prime Alpine Meats',
    contactPerson: 'Roberto Rossi',
    email: 'dispatch@primealpinemeats.com',
    phone: '+1 (310) 555-4309',
    address: '710 Packinghouse Lane, South San Francisco, CA',
    paymentTerms: 'Net 15',
    categories: ['Wagyu & Proteins'],
    leadTimeDays: 1,
    notes: 'Certified A5 Miyazaki Wagyu and aged Parma prosciutto. Daily cold-chain delivery.',
    active: true,
  },
  {
    id: 'sup-fromagerie',
    name: 'Fromagerie des Alpes',
    contactPerson: 'Jean-Luc Blanc',
    email: 'info@fromageriedesalpes.fr',
    phone: '+1 (212) 555-6671',
    address: '45 Rue des Fromagers, Chambery / Bay Area Hub',
    paymentTerms: 'Net 15',
    categories: ['Artisanal Dairy & Produce'],
    leadTimeDays: 2,
    notes: 'Fresh Pugliese burrata balls and cave-aged Swiss Gruyère wheels.',
    active: true,
  },
  {
    id: 'sup-epernay',
    name: 'Maison Épernay Cellars',
    contactPerson: 'Sophie Moreau',
    email: 'cellars@maison-epernay.fr',
    phone: '+1 (415) 555-7782',
    address: '280 Post St, San Francisco, CA',
    paymentTerms: 'Net 30',
    categories: ['Cellar Wines'],
    leadTimeDays: 3,
    notes: 'Grand Cru Champagnes and temperature-controlled Barolo Nebbiolo reserves.',
    active: true,
  },
  {
    id: 'sup-roast-still',
    name: 'Roast & Still Imports',
    contactPerson: 'Kenji Sato',
    email: 'kenji@roastandstill.com',
    phone: '+1 (503) 555-9011',
    address: '900 Industrial Ave, Portland, OR',
    paymentTerms: 'Net 30',
    categories: ['Spirits & Liqueurs', 'Mixers & Garnishes'],
    leadTimeDays: 2,
    notes: 'Cold-brew Arabica coffee liqueur and single-origin whole bean roasts.',
    active: true,
  },
];

export const DEFAULT_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-1041',
    poNumber: 'PO-2026-1041',
    supplierId: 'sup-vesper',
    supplierName: 'Vesper Bar Provisions',
    orderDate: '2026-10-02T10:00:00.000Z',
    expectedDeliveryDate: '2026-10-03T11:00:00.000Z',
    receivedDate: '2026-10-03T11:30:00.000Z',
    status: 'RECEIVED_COMPLETED',
    items: [
      {
        ingredientId: 'ing-demerara',
        ingredientName: 'Rich Demerara Cane Syrup',
        unit: 'ml',
        quantityOrdered: 1000,
        unitCost: 0.012,
        totalCost: 12.0,
        quantityReceived: 1000,
      },
    ],
    subtotal: 12.0,
    tax: 1.05,
    shippingFee: 5.0,
    totalAmount: 18.05,
    notes: 'Scheduled monthly bar syrups replenishment.',
    createdBy: 'Fadray Bukola',
    receivedBy: 'Mateo Silva',
  },
  {
    id: 'po-1042',
    poNumber: 'PO-2026-1042',
    supplierId: 'sup-heritage',
    supplierName: 'Heritage Distillers Co.',
    orderDate: '2026-10-04T15:30:00.000Z',
    expectedDeliveryDate: '2026-10-06T14:00:00.000Z',
    status: 'ORDERED_SENT',
    items: [
      {
        ingredientId: 'ing-bourbon',
        ingredientName: 'Kentucky Small-Batch Bourbon',
        unit: 'ml',
        quantityOrdered: 3000,
        unitCost: 0.065,
        totalCost: 195.0,
      },
      {
        ingredientId: 'ing-gin',
        ingredientName: 'Botanical Dry Gin (Hendrick Reserve)',
        unit: 'ml',
        quantityOrdered: 1500,
        unitCost: 0.062,
        totalCost: 93.0,
      },
    ],
    subtotal: 288.0,
    tax: 25.2,
    shippingFee: 15.0,
    totalAmount: 328.2,
    notes: 'Weekend replenishment order sent via supplier EDI portal.',
    createdBy: 'Fadray Bukola',
  },
  {
    id: 'po-1043',
    poNumber: 'PO-2026-1043',
    supplierId: 'sup-vesper',
    supplierName: 'Vesper Bar Provisions',
    orderDate: '2026-10-05T01:00:00.000Z',
    expectedDeliveryDate: '2026-10-06T11:00:00.000Z',
    status: 'DRAFT',
    items: [
      {
        ingredientId: 'ing-bitters',
        ingredientName: 'Aromatic Angostura & Bark Bitters',
        unit: 'ml',
        quantityOrdered: 400,
        unitCost: 0.09,
        totalCost: 36.0,
      },
    ],
    subtotal: 36.0,
    tax: 3.15,
    shippingFee: 0,
    totalAmount: 39.15,
    notes: 'Draft PO triggered by automated low-stock par alert for Angostura bitters.',
    createdBy: 'Mateo Silva',
  },
];

export const INITIAL_CLOUD_STATE: CloudSystemState = {
  version: 14,
  lastUpdated: '2026-10-05T02:30:00.000Z',
  appliedOperationIds: [],
  ingredients: [
    {
      id: 'ing-bourbon',
      name: 'Kentucky Small-Batch Bourbon',
      sku: 'SPR-BRB-01',
      category: 'Spirits & Liqueurs',
      storageZone: 'Main Backbar',
      currentStock: 1680,
      parLevel: 1500,
      criticalLevel: 750,
      maxCapacity: 6000,
      unit: 'ml',
      costPerUnit: 0.065,
      supplier: 'Heritage Distillers Co.',
      lastRestockedAt: '2026-10-03T14:00:00.000Z',
    },
    {
      id: 'ing-demerara',
      name: 'Rich Demerara Cane Syrup',
      sku: 'MIX-DEM-02',
      category: 'Mixers & Garnishes',
      storageZone: 'Main Backbar',
      currentStock: 820,
      parLevel: 500,
      criticalLevel: 200,
      maxCapacity: 2500,
      unit: 'ml',
      costPerUnit: 0.012,
      supplier: 'Vesper Bar Provisions',
      lastRestockedAt: '2026-10-02T11:30:00.000Z',
    },
    {
      id: 'ing-bitters',
      name: 'Aromatic Angostura & Bark Bitters',
      sku: 'MIX-BIT-03',
      category: 'Mixers & Garnishes',
      storageZone: 'Main Backbar',
      currentStock: 145,
      parLevel: 180, // Currently in LOW STOCK state to demonstrate automated real-time alert!
      criticalLevel: 80,
      maxCapacity: 600,
      unit: 'ml',
      costPerUnit: 0.09,
      supplier: 'Vesper Bar Provisions',
      lastRestockedAt: '2026-09-25T16:15:00.000Z',
    },
    {
      id: 'ing-blood-orange',
      name: 'Dehydrated Blood Orange Wheel',
      sku: 'MIX-GAR-04',
      category: 'Mixers & Garnishes',
      storageZone: 'Main Backbar',
      currentStock: 42,
      parLevel: 30,
      criticalLevel: 12,
      maxCapacity: 150,
      unit: 'pc',
      costPerUnit: 0.35,
      supplier: 'Artisan Citrus Dryers',
      lastRestockedAt: '2026-10-01T10:00:00.000Z',
    },
    {
      id: 'ing-vodka',
      name: 'Single-Estate Winter Wheat Vodka',
      sku: 'SPR-VDK-05',
      category: 'Spirits & Liqueurs',
      storageZone: 'Main Backbar',
      currentStock: 2100,
      parLevel: 1400,
      criticalLevel: 700,
      maxCapacity: 6000,
      unit: 'ml',
      costPerUnit: 0.055,
      supplier: 'Heritage Distillers Co.',
      lastRestockedAt: '2026-10-03T14:00:00.000Z',
    },
    {
      id: 'ing-coffee-liqueur',
      name: 'Cold-Brew Arabica Coffee Liqueur',
      sku: 'SPR-CFL-06',
      category: 'Spirits & Liqueurs',
      storageZone: 'Main Backbar',
      currentStock: 610,
      parLevel: 750, // Currently LOW STOCK
      criticalLevel: 300,
      maxCapacity: 3000,
      unit: 'ml',
      costPerUnit: 0.048,
      supplier: 'Roast & Still Imports',
      lastRestockedAt: '2026-09-29T15:00:00.000Z',
    },
    {
      id: 'ing-espresso',
      name: 'Fresh Pull Single-Origin Espresso',
      sku: 'MIX-ESP-07',
      category: 'Mixers & Garnishes',
      storageZone: 'Main Backbar',
      currentStock: 1250,
      parLevel: 600,
      criticalLevel: 250,
      maxCapacity: 3000,
      unit: 'ml',
      costPerUnit: 0.022,
      supplier: 'Roast & Still Imports',
      lastRestockedAt: '2026-10-04T16:00:00.000Z',
    },
    {
      id: 'ing-gin',
      name: 'Botanical Dry Gin (Hendrick Reserve)',
      sku: 'SPR-GIN-08',
      category: 'Spirits & Liqueurs',
      storageZone: 'Main Backbar',
      currentStock: 1890,
      parLevel: 1200,
      criticalLevel: 600,
      maxCapacity: 4500,
      unit: 'ml',
      costPerUnit: 0.062,
      supplier: 'Heritage Distillers Co.',
      lastRestockedAt: '2026-10-03T14:00:00.000Z',
    },
    {
      id: 'ing-yuzu',
      name: 'Kochi Pressed Yuzu Juice',
      sku: 'MIX-YUZ-09',
      category: 'Mixers & Garnishes',
      storageZone: 'Walk-in Cold Room',
      currentStock: 260,
      parLevel: 350, // Currently LOW STOCK
      criticalLevel: 150,
      maxCapacity: 1500,
      unit: 'ml',
      costPerUnit: 0.085,
      supplier: 'Kyoto Culinary Imports',
      lastRestockedAt: '2026-09-28T09:00:00.000Z',
    },
    {
      id: 'ing-wagyu',
      name: 'A5 Miyazaki Wagyu Ground Chuck',
      sku: 'PRO-WAG-10',
      category: 'Wagyu & Proteins',
      storageZone: 'Walk-in Cold Room',
      currentStock: 2880,
      parLevel: 2000,
      criticalLevel: 900,
      maxCapacity: 8000,
      unit: 'g',
      costPerUnit: 0.038,
      supplier: 'Prime Alpine Meats',
      lastRestockedAt: '2026-10-04T08:30:00.000Z',
    },
    {
      id: 'ing-brioche',
      name: 'Artisanal Glazed Mini Brioche Bun',
      sku: 'DRY-BRI-11',
      category: 'Dry Pantry & Bakery',
      storageZone: 'Dry Bistro Pantry',
      currentStock: 48,
      parLevel: 36,
      criticalLevel: 18,
      maxCapacity: 144,
      unit: 'pc',
      costPerUnit: 0.65,
      supplier: 'Boulangerie Saint-Honoré',
      lastRestockedAt: '2026-10-04T07:00:00.000Z',
    },
    {
      id: 'ing-truffle-aioli',
      name: 'Black Périgord Truffle Aioli',
      sku: 'DAI-TRU-12',
      category: 'Artisanal Dairy & Produce',
      storageZone: 'Walk-in Cold Room',
      currentStock: 340,
      parLevel: 400, // Currently LOW STOCK
      criticalLevel: 180,
      maxCapacity: 1600,
      unit: 'g',
      costPerUnit: 0.045,
      supplier: 'Maison Tartufo',
      lastRestockedAt: '2026-09-30T13:20:00.000Z',
    },
    {
      id: 'ing-gruyere',
      name: 'Cave-Aged 18-Month Gruyère Slice',
      sku: 'DAI-GRU-13',
      category: 'Artisanal Dairy & Produce',
      storageZone: 'Walk-in Cold Room',
      currentStock: 56,
      parLevel: 30,
      criticalLevel: 15,
      maxCapacity: 120,
      unit: 'pc',
      costPerUnit: 0.78,
      supplier: 'Fromagerie des Alpes',
      lastRestockedAt: '2026-10-02T10:00:00.000Z',
    },
    {
      id: 'ing-burrata',
      name: 'Pugliese Fresh Burrata Ball (125g)',
      sku: 'DAI-BUR-14',
      category: 'Artisanal Dairy & Produce',
      storageZone: 'Walk-in Cold Room',
      currentStock: 14,
      parLevel: 12,
      criticalLevel: 6,
      maxCapacity: 40,
      unit: 'pc',
      costPerUnit: 4.2,
      supplier: 'Fromagerie des Alpes',
      lastRestockedAt: '2026-10-04T09:15:00.000Z',
    },
    {
      id: 'ing-prosciutto',
      name: '24-Month Prosciutto di Parma',
      sku: 'PRO-PRS-15',
      category: 'Wagyu & Proteins',
      storageZone: 'Walk-in Cold Room',
      currentStock: 1420,
      parLevel: 1000,
      criticalLevel: 450,
      maxCapacity: 4000,
      unit: 'g',
      costPerUnit: 0.042,
      supplier: 'Prime Alpine Meats',
      lastRestockedAt: '2026-10-03T11:00:00.000Z',
    },
    {
      id: 'ing-scallops',
      name: 'Wild Hokkaido Diver Scallops (U-10)',
      sku: 'PRO-SCL-16',
      category: 'Wagyu & Proteins',
      storageZone: 'Walk-in Cold Room',
      currentStock: 39,
      parLevel: 30,
      criticalLevel: 15,
      maxCapacity: 120,
      unit: 'pc',
      costPerUnit: 2.1,
      supplier: 'Oceanic Harbor Catch',
      lastRestockedAt: '2026-10-04T06:45:00.000Z',
    },
    {
      id: 'ing-champagne',
      name: 'Grand Cru Brut Champagne (By Glass Pour)',
      sku: 'WIN-CHM-17',
      category: 'Cellar Wines',
      storageZone: 'Temperature Cellar',
      currentStock: 2250,
      parLevel: 1500,
      criticalLevel: 750,
      maxCapacity: 6000,
      unit: 'ml',
      costPerUnit: 0.052,
      supplier: 'Maison Épernay Cellars',
      lastRestockedAt: '2026-10-01T17:00:00.000Z',
    },
    {
      id: 'ing-barolo',
      name: 'Pio Cesare Barolo DOCG (By Glass Pour)',
      sku: 'WIN-BAR-18',
      category: 'Cellar Wines',
      storageZone: 'Temperature Cellar',
      currentStock: 1800,
      parLevel: 1200,
      criticalLevel: 600,
      maxCapacity: 4500,
      unit: 'ml',
      costPerUnit: 0.058,
      supplier: 'Piedmont Estates Imports',
      lastRestockedAt: '2026-10-01T17:00:00.000Z',
    },
  ],
  menuItems: [
    {
      id: 'menu-old-fashioned',
      name: 'Smoked Bourbon Old Fashioned',
      sku: 'CKT-001',
      category: 'Signature Cocktails',
      price: 22,
      description: 'Small-batch Kentucky bourbon, rich demerara syrup, aromatic bark bitters, blood orange wheel.',
      prepStation: 'Lounge Mixology Bar',
      imageKey: 'old_fashioned',
      recipe: [
        { ingredientId: 'ing-bourbon', quantity: 60 },
        { ingredientId: 'ing-demerara', quantity: 12 },
        { ingredientId: 'ing-bitters', quantity: 4 },
        { ingredientId: 'ing-blood-orange', quantity: 1 },
      ],
    },
    {
      id: 'menu-espresso-martini',
      name: 'Velvet Crema Espresso Martini',
      sku: 'CKT-002',
      category: 'Signature Cocktails',
      price: 21,
      description: 'Winter wheat vodka, cold-brew arabica liqueur, fresh single-origin espresso, raw demerara.',
      prepStation: 'Lounge Mixology Bar',
      imageKey: 'espresso_martini',
      recipe: [
        { ingredientId: 'ing-vodka', quantity: 45 },
        { ingredientId: 'ing-coffee-liqueur', quantity: 30 },
        { ingredientId: 'ing-espresso', quantity: 35 },
        { ingredientId: 'ing-demerara', quantity: 8 },
      ],
    },
    {
      id: 'menu-yuzu-gimlet',
      name: 'Kyoto Yuzu Botanical Gimlet',
      sku: 'CKT-003',
      category: 'Signature Cocktails',
      price: 20,
      description: 'Botanical dry gin, pressed Kochi yuzu juice, demerara cane reduction, dehydrated citrus.',
      prepStation: 'Lounge Mixology Bar',
      recipe: [
        { ingredientId: 'ing-gin', quantity: 60 },
        { ingredientId: 'ing-yuzu', quantity: 25 },
        { ingredientId: 'ing-demerara', quantity: 15 },
        { ingredientId: 'ing-blood-orange', quantity: 1 },
      ],
    },
    {
      id: 'menu-wagyu-sliders',
      name: 'Truffle A5 Wagyu Brioche Sliders (Trio)',
      sku: 'BST-101',
      category: 'Bistro Plates',
      price: 34,
      description: 'Three seared Miyazaki Wagyu sliders, cave-aged Gruyère, black Périgord truffle aioli, toasted brioche.',
      prepStation: 'Bistro Hot Kitchen',
      imageKey: 'wagyu_sliders',
      recipe: [
        { ingredientId: 'ing-wagyu', quantity: 180 },
        { ingredientId: 'ing-brioche', quantity: 3 },
        { ingredientId: 'ing-gruyere', quantity: 3 },
        { ingredientId: 'ing-truffle-aioli', quantity: 30 },
      ],
    },
    {
      id: 'menu-divergent-scallops',
      name: 'Pan-Seared Hokkaido Scallops & Yuzu Beurre',
      sku: 'BST-102',
      category: 'Bistro Plates',
      price: 38,
      description: 'Three wild U-10 diver scallops, yuzu citrus reduction, black truffle emulsion, crispy prosciutto.',
      prepStation: 'Bistro Hot Kitchen',
      recipe: [
        { ingredientId: 'ing-scallops', quantity: 3 },
        { ingredientId: 'ing-yuzu', quantity: 20 },
        { ingredientId: 'ing-truffle-aioli', quantity: 18 },
        { ingredientId: 'ing-prosciutto', quantity: 25 },
      ],
    },
    {
      id: 'menu-burrata-board',
      name: 'Artisanal Burrata & 24-Mo Prosciutto Board',
      sku: 'SHR-201',
      category: 'Artisanal Shareables',
      price: 32,
      description: 'Creamy Pugliese burrata, ribbons of 24-month Prosciutto di Parma, truffle drizzle, warm brioche.',
      prepStation: 'Garde Manger & Charcuterie',
      imageKey: 'burrata_charcuterie',
      recipe: [
        { ingredientId: 'ing-burrata', quantity: 1 },
        { ingredientId: 'ing-prosciutto', quantity: 85 },
        { ingredientId: 'ing-brioche', quantity: 2 },
        { ingredientId: 'ing-truffle-aioli', quantity: 15 },
      ],
    },
    {
      id: 'menu-champagne-glass',
      name: 'Grand Cru Brut Champagne (150ml Pour)',
      sku: 'CEL-301',
      category: 'Cellar & Reserve',
      price: 28,
      description: 'Chilled Épernay Grand Cru Brut Champagne served in hand-blown crystal flute.',
      prepStation: 'Sommelier Cellar',
      recipe: [
        { ingredientId: 'ing-champagne', quantity: 150 },
      ],
    },
    {
      id: 'menu-barolo-glass',
      name: 'Pio Cesare Barolo DOCG (150ml Pour)',
      sku: 'CEL-302',
      category: 'Cellar & Reserve',
      price: 26,
      description: 'Decanted Piedmont Nebbiolo with notes of dark cherry, leather, and dried violet.',
      prepStation: 'Sommelier Cellar',
      recipe: [
        { ingredientId: 'ing-barolo', quantity: 150 },
      ],
    },
  ],
  customers: [
    {
      id: 'cust-01',
      name: 'Julian Vance',
      email: 'j.vance@meridianventures.io',
      phone: '+1 (415) 891-4402',
      tier: 'Obsidian VIP',
      loyaltyPoints: 4820,
      lifetimeSpend: 14280,
      visitsCount: 38,
      lastVisitAt: '2026-10-04T22:15:00.000Z',
      favoriteItem: 'Smoked Bourbon Old Fashioned',
      seatingPreference: 'Booth 01 · Velvet Corner',
      dietaryNotes: 'No shellfish; prefers single large crystal sphere ice.',
      houseAccountBalance: 420,
    },
    {
      id: 'cust-02',
      name: 'Elena Rostova',
      email: 'elena@atelierrostova.com',
      phone: '+1 (212) 604-9188',
      tier: 'Obsidian VIP',
      loyaltyPoints: 3910,
      lifetimeSpend: 11650,
      visitsCount: 29,
      lastVisitAt: '2026-10-04T21:40:00.000Z',
      favoriteItem: 'Grand Cru Brut Champagne (150ml Pour)',
      seatingPreference: 'Mezzanine Lounge Table 04',
      dietaryNotes: 'Gluten-sensitive when dining; loves Burrata board.',
      houseAccountBalance: 185,
    },
    {
      id: 'cust-03',
      name: 'Marcus Sterling',
      email: 'msterling@sterlinglaw.org',
      phone: '+1 (310) 742-1190',
      tier: 'Gold Reserve',
      loyaltyPoints: 2150,
      lifetimeSpend: 6420,
      visitsCount: 19,
      lastVisitAt: '2026-10-03T20:10:00.000Z',
      favoriteItem: 'Truffle A5 Wagyu Brioche Sliders (Trio)',
      seatingPreference: 'Main Marble Bar · Seats 3-4',
      dietaryNotes: 'None.',
      houseAccountBalance: 0,
    },
    {
      id: 'cust-04',
      name: 'Sora Takahashi',
      email: 'sora@kurokawa-arch.jp',
      phone: '+1 (415) 399-8012',
      tier: 'Gold Reserve',
      loyaltyPoints: 1840,
      lifetimeSpend: 5190,
      visitsCount: 15,
      lastVisitAt: '2026-10-02T23:05:00.000Z',
      favoriteItem: 'Kyoto Yuzu Botanical Gimlet',
      seatingPreference: 'Bistro Window Table 08',
      dietaryNotes: 'Pescatarian on weekdays.',
      houseAccountBalance: 92,
    },
    {
      id: 'cust-05',
      name: 'Camille Laurent',
      email: 'camille.laurent@lumiere-press.fr',
      phone: '+1 (646) 512-3309',
      tier: 'Silver Patron',
      loyaltyPoints: 940,
      lifetimeSpend: 2780,
      visitsCount: 9,
      lastVisitAt: '2026-09-30T19:50:00.000Z',
      favoriteItem: 'Velvet Crema Espresso Martini',
      seatingPreference: 'Terrace Firepit Lounge',
      dietaryNotes: 'Prefers oat crema garnish when available.',
      houseAccountBalance: 0,
    },
  ],
  orders: [
    {
      id: 'ord-1001',
      orderNumber: 'LMS-8491',
      createdAt: '2026-10-05T00:15:00.000Z',
      tableOrTab: 'Booth 01 · Velvet Corner',
      serviceMode: 'VIP Booth',
      customerId: 'cust-01',
      customerName: 'Julian Vance',
      serverName: 'Mateo S.',
      items: [
        {
          menuItemId: 'menu-old-fashioned',
          name: 'Smoked Bourbon Old Fashioned',
          quantity: 2,
          unitPrice: 22,
          unitCost: 4.75,
        },
        {
          menuItemId: 'menu-wagyu-sliders',
          name: 'Truffle A5 Wagyu Brioche Sliders (Trio)',
          quantity: 1,
          unitPrice: 34,
          unitCost: 12.48,
        },
      ],
      subtotal: 78,
      taxAmount: 6.83,
      serviceCharge: 14.04,
      discountAmount: 7.8,
      totalAmount: 91.07,
      totalCogs: 21.98,
      paymentMethod: 'Card Terminal',
      deductions: [
        {
          ingredientId: 'ing-bourbon',
          ingredientName: 'Kentucky Small-Batch Bourbon',
          quantityDeducted: 120,
          unit: 'ml',
          remainingStockAfter: 1740,
          costImpact: 7.8,
        },
        {
          ingredientId: 'ing-wagyu',
          ingredientName: 'A5 Miyazaki Wagyu Ground Chuck',
          quantityDeducted: 180,
          unit: 'g',
          remainingStockAfter: 2880,
          costImpact: 6.84,
        },
      ],
      deviceOrigin: 'Bar-POS-01',
    },
    {
      id: 'ord-1002',
      orderNumber: 'LMS-8492',
      createdAt: '2026-10-05T00:52:00.000Z',
      tableOrTab: 'Mezzanine Table 04',
      serviceMode: 'Lounge Table',
      customerId: 'cust-02',
      customerName: 'Elena Rostova',
      serverName: 'Claire D.',
      items: [
        {
          menuItemId: 'menu-champagne-glass',
          name: 'Grand Cru Brut Champagne (150ml Pour)',
          quantity: 2,
          unitPrice: 28,
          unitCost: 7.8,
        },
        {
          menuItemId: 'menu-burrata-board',
          name: 'Artisanal Burrata & 24-Mo Prosciutto Board',
          quantity: 1,
          unitPrice: 32,
          unitCost: 9.75,
        },
      ],
      subtotal: 88,
      taxAmount: 7.7,
      serviceCharge: 15.84,
      discountAmount: 0,
      totalAmount: 111.54,
      totalCogs: 25.35,
      paymentMethod: 'VIP House Account',
      deductions: [
        {
          ingredientId: 'ing-champagne',
          ingredientName: 'Grand Cru Brut Champagne (By Glass Pour)',
          quantityDeducted: 300,
          unit: 'ml',
          remainingStockAfter: 2250,
          costImpact: 15.6,
        },
        {
          ingredientId: 'ing-burrata',
          ingredientName: 'Pugliese Fresh Burrata Ball (125g)',
          quantityDeducted: 1,
          unit: 'pc',
          remainingStockAfter: 14,
          costImpact: 4.2,
        },
      ],
      deviceOrigin: 'Handheld-Floor-02',
    },
    {
      id: 'ord-1003',
      orderNumber: 'LMS-8493',
      createdAt: '2026-10-05T01:28:00.000Z',
      tableOrTab: 'Main Bar · Seat 03',
      serviceMode: 'Bar Tab',
      customerId: 'cust-03',
      customerName: 'Marcus Sterling',
      serverName: 'Mateo S.',
      items: [
        {
          menuItemId: 'menu-espresso-martini',
          name: 'Velvet Crema Espresso Martini',
          quantity: 2,
          unitPrice: 21,
          unitCost: 4.78,
        },
        {
          menuItemId: 'menu-divergent-scallops',
          name: 'Pan-Seared Hokkaido Scallops & Yuzu Beurre',
          quantity: 1,
          unitPrice: 38,
          unitCost: 9.86,
        },
      ],
      subtotal: 80,
      taxAmount: 7.0,
      serviceCharge: 14.4,
      discountAmount: 0,
      totalAmount: 101.4,
      totalCogs: 19.42,
      paymentMethod: 'Cash Drawer',
      cashReceived: 120,
      changeGiven: 18.6,
      deductions: [
        {
          ingredientId: 'ing-vodka',
          ingredientName: 'Single-Estate Winter Wheat Vodka',
          quantityDeducted: 90,
          unit: 'ml',
          remainingStockAfter: 2100,
          costImpact: 4.95,
        },
        {
          ingredientId: 'ing-coffee-liqueur',
          ingredientName: 'Cold-Brew Arabica Coffee Liqueur',
          quantityDeducted: 60,
          unit: 'ml',
          remainingStockAfter: 610,
          costImpact: 2.88,
        },
        {
          ingredientId: 'ing-scallops',
          ingredientName: 'Wild Hokkaido Diver Scallops (U-10)',
          quantityDeducted: 3,
          unit: 'pc',
          remainingStockAfter: 39,
          costImpact: 6.3,
        },
      ],
      deviceOrigin: 'Bar-POS-01',
    },
    {
      id: 'ord-1004',
      orderNumber: 'LMS-8494',
      createdAt: '2026-10-05T02:05:00.000Z',
      tableOrTab: 'Bistro Window 08',
      serviceMode: 'Bistro Dining',
      customerId: 'cust-04',
      customerName: 'Sora Takahashi',
      serverName: 'Claire D.',
      items: [
        {
          menuItemId: 'menu-yuzu-gimlet',
          name: 'Kyoto Yuzu Botanical Gimlet',
          quantity: 2,
          unitPrice: 20,
          unitCost: 6.37,
        },
        {
          menuItemId: 'menu-old-fashioned',
          name: 'Smoked Bourbon Old Fashioned',
          quantity: 1,
          unitPrice: 22,
          unitCost: 4.75,
        },
      ],
      subtotal: 62,
      taxAmount: 5.43,
      serviceCharge: 11.16,
      discountAmount: 0,
      totalAmount: 78.59,
      totalCogs: 17.49,
      paymentMethod: 'Card Terminal',
      deductions: [
        {
          ingredientId: 'ing-gin',
          ingredientName: 'Botanical Dry Gin (Hendrick Reserve)',
          quantityDeducted: 120,
          unit: 'ml',
          remainingStockAfter: 1890,
          costImpact: 7.44,
        },
        {
          ingredientId: 'ing-yuzu',
          ingredientName: 'Kochi Pressed Yuzu Juice',
          quantityDeducted: 50,
          unit: 'ml',
          remainingStockAfter: 260,
          costImpact: 4.25,
        },
        {
          ingredientId: 'ing-bourbon',
          ingredientName: 'Kentucky Small-Batch Bourbon',
          quantityDeducted: 60,
          unit: 'ml',
          remainingStockAfter: 1680,
          costImpact: 3.9,
        },
      ],
      deviceOrigin: 'Handheld-Floor-02',
    },
  ],
  stockMovements: [
    {
      id: 'mov-01',
      timestamp: '2026-10-05T02:05:00.000Z',
      ingredientId: 'ing-yuzu',
      ingredientName: 'Kochi Pressed Yuzu Juice',
      type: 'SALE_DEDUCTION',
      delta: -50,
      unit: 'ml',
      balanceAfter: 260,
      costImpact: 4.25,
      reference: 'Order LMS-8494 (2x Kyoto Yuzu Botanical Gimlet)',
      actor: 'Claire D. · Handheld-Floor-02',
    },
    {
      id: 'mov-02',
      timestamp: '2026-10-05T02:05:00.000Z',
      ingredientId: 'ing-bourbon',
      ingredientName: 'Kentucky Small-Batch Bourbon',
      type: 'SALE_DEDUCTION',
      delta: -60,
      unit: 'ml',
      balanceAfter: 1680,
      costImpact: 3.9,
      reference: 'Order LMS-8494 (1x Smoked Bourbon Old Fashioned)',
      actor: 'Claire D. · Handheld-Floor-02',
    },
    {
      id: 'mov-03',
      timestamp: '2026-10-05T01:28:00.000Z',
      ingredientId: 'ing-coffee-liqueur',
      ingredientName: 'Cold-Brew Arabica Coffee Liqueur',
      type: 'SALE_DEDUCTION',
      delta: -60,
      unit: 'ml',
      balanceAfter: 610,
      costImpact: 2.88,
      reference: 'Order LMS-8493 (2x Velvet Crema Espresso Martini)',
      actor: 'Mateo S. · Bar-POS-01',
    },
    {
      id: 'mov-04',
      timestamp: '2026-10-05T01:28:00.000Z',
      ingredientId: 'ing-scallops',
      ingredientName: 'Wild Hokkaido Diver Scallops (U-10)',
      type: 'SALE_DEDUCTION',
      delta: -3,
      unit: 'pc',
      balanceAfter: 39,
      costImpact: 6.3,
      reference: 'Order LMS-8493 (1x Pan-Seared Hokkaido Scallops)',
      actor: 'Mateo S. · Bar-POS-01',
    },
    {
      id: 'mov-05',
      timestamp: '2026-10-04T23:40:00.000Z',
      ingredientId: 'ing-bitters',
      ingredientName: 'Aromatic Angostura & Bark Bitters',
      type: 'WASTE_SPILLAGE',
      delta: -15,
      unit: 'ml',
      balanceAfter: 145,
      costImpact: 1.35,
      reference: 'Broken dasher top at Station 2',
      actor: 'Mateo S. · Bar-POS-01',
    },
  ],
  reconciliations: [
    {
      id: 'eod-2026-10-03',
      businessDate: '2026-10-03',
      closedAt: '2026-10-04T03:12:00.000Z',
      closedBy: 'Fadray Bukola (Admin / Owner)',
      shiftLabel: 'Saturday Night Lounge & Bistro Close',
      openingFloat: 500,
      cashSalesSystem: 1140,
      cashPayouts: 65,
      expectedCashInDrawer: 1575,
      actualCashCounted: 1575,
      cashVariance: 0,
      cardSalesSystem: 6820,
      cardTerminalBatchTotal: 6820,
      cardVariance: 0,
      vipAccountSalesSystem: 940,
      totalGrossSales: 8900,
      totalTaxCollected: 778.75,
      totalServiceCharges: 1602,
      totalDiscounts: 185,
      totalRecipeCogs: 2190.4,
      wasteAndSpillageCost: 34.2,
      netOperatingMargin: 6675.4,
      ordersCount: 74,
      lowStockAlertsAtClose: 2,
      notes: 'All card terminals settled cleanly. Bitters and Yuzu flagged for Monday morning purveyor delivery.',
      status: 'RECONCILED_BALANCED',
    },
    {
      id: 'eod-2026-10-02',
      businessDate: '2026-10-02',
      closedAt: '2026-10-03T02:58:00.000Z',
      closedBy: 'Mateo S. (Lead Bartender)',
      shiftLabel: 'Friday Evening Service Close',
      openingFloat: 500,
      cashSalesSystem: 890,
      cashPayouts: 40,
      expectedCashInDrawer: 1350,
      actualCashCounted: 1342,
      cashVariance: -8,
      cardSalesSystem: 5410,
      cardTerminalBatchTotal: 5410,
      cardVariance: 0,
      vipAccountSalesSystem: 620,
      totalGrossSales: 6920,
      totalTaxCollected: 605.5,
      totalServiceCharges: 1245.6,
      totalDiscounts: 110,
      totalRecipeCogs: 1688.2,
      wasteAndSpillageCost: 19.5,
      netOperatingMargin: 5212.3,
      ordersCount: 58,
      lowStockAlertsAtClose: 1,
      notes: 'Minor -₦8.00 cash drawer variance from busy midnight tab change rounding.',
      status: 'VARIANCE_FLAGGED',
    },
  ],
  syncLog: [
    {
      id: 'sync-init-1',
      syncedAt: '2026-10-05T02:05:02.000Z',
      deviceId: 'Handheld-Floor-02',
      operationsCount: 1,
      summary: 'Synced Order LMS-8494 and deducted 3 recipe ingredients',
    },
    {
      id: 'sync-init-2',
      syncedAt: '2026-10-05T01:28:04.000Z',
      deviceId: 'Bar-POS-01',
      operationsCount: 1,
      summary: 'Synced Order LMS-8493 and updated Marcus Sterling loyalty balance',
    },
  ],
  settings: DEFAULT_SETTINGS,
  users: DEFAULT_STAFF_USERS,
  activeUserId: 'usr-admin-01',
  suppliers: DEFAULT_SUPPLIERS,
  purchaseOrders: DEFAULT_PURCHASE_ORDERS,
  menuCategories: DEFAULT_MENU_CATEGORIES,
};

/**
 * Pure state reducer that applies a SyncOperation to a CloudSystemState.
 * Used identically on the client (for instant optimistic / offline execution)
 * and on the Express Cloud Server (for authoritative multi-device synchronization).
 */
export function applySyncOperation(
  state: CloudSystemState,
  op: SyncOperation
): CloudSystemState {
  if (state.appliedOperationIds.includes(op.id)) {
    return state;
  }

  const next: CloudSystemState = JSON.parse(JSON.stringify(state));
  next.version += 1;
  next.lastUpdated = op.timestamp;
  next.appliedOperationIds.push(op.id);
  if (!next.menuCategories) {
    next.menuCategories = JSON.parse(JSON.stringify(DEFAULT_MENU_CATEGORIES));
  }

  switch (op.type) {
    case 'CREATE_SALE': {
      const orderPayload = op.payload.order;
      const deductions: typeof orderPayload.deductions = [];

      // Automatically deduct recipe ingredients for each item sold
      for (const lineItem of orderPayload.items) {
        const menuProduct = next.menuItems.find((m) => m.id === lineItem.menuItemId);
        if (menuProduct && menuProduct.recipe) {
          for (const recipeComp of menuProduct.recipe) {
            const ing = next.ingredients.find((i) => i.id === recipeComp.ingredientId);
            if (ing) {
              const totalToDeduct = Number((recipeComp.quantity * lineItem.quantity).toFixed(2));
              ing.currentStock = Math.max(0, Number((ing.currentStock - totalToDeduct).toFixed(2)));
              const costImpact = Number((totalToDeduct * ing.costPerUnit).toFixed(2));

              // Record or merge deduction on order
              const existingDed = deductions.find((d: any) => d.ingredientId === ing.id);
              if (existingDed) {
                existingDed.quantityDeducted = Number(
                  (existingDed.quantityDeducted + totalToDeduct).toFixed(2)
                );
                existingDed.remainingStockAfter = ing.currentStock;
                existingDed.costImpact = Number((existingDed.costImpact + costImpact).toFixed(2));
              } else {
                deductions.push({
                  ingredientId: ing.id,
                  ingredientName: ing.name,
                  quantityDeducted: totalToDeduct,
                  unit: ing.unit,
                  remainingStockAfter: ing.currentStock,
                  costImpact,
                });
              }

              // Record granular stock movement
              next.stockMovements.unshift({
                id: `mov-${op.id}-${ing.id}-${ lineItem.menuItemId}`,
                timestamp: op.timestamp,
                ingredientId: ing.id,
                ingredientName: ing.name,
                type: 'SALE_DEDUCTION',
                delta: -totalToDeduct,
                unit: ing.unit,
                balanceAfter: ing.currentStock,
                costImpact,
                reference: `Order ${orderPayload.orderNumber} (${lineItem.quantity}x ${lineItem.name})`,
                actor: `${orderPayload.serverName} · ${op.deviceId}`,
              });
            }
          }
        }
      }

      // Update customer profile if attached
      if (orderPayload.customerId) {
        const cust = next.customers.find((c) => c.id === orderPayload.customerId);
        if (cust) {
          cust.lifetimeSpend = Number((cust.lifetimeSpend + orderPayload.totalAmount).toFixed(2));
          cust.loyaltyPoints += Math.round(orderPayload.totalAmount * 5);
          cust.visitsCount += 1;
          cust.lastVisitAt = op.timestamp;
          if (orderPayload.paymentMethod === 'VIP House Account') {
            cust.houseAccountBalance = Number(
              (cust.houseAccountBalance + orderPayload.totalAmount).toFixed(2)
            );
          }
          // Auto-upgrade tier based on lifetime spend
          if (cust.lifetimeSpend >= 10000) cust.tier = 'Obsidian VIP';
          else if (cust.lifetimeSpend >= 4500) cust.tier = 'Gold Reserve';
          else if (cust.lifetimeSpend >= 1500) cust.tier = 'Silver Patron';
        }
      }

      const finalizedOrder = {
        ...orderPayload,
        deductions,
      };
      next.orders.unshift(finalizedOrder);
      break;
    }

    case 'RESTOCK_INGREDIENT': {
      const { ingredientId, addedQuantity, supplierNote, actor } = op.payload;
      const ing = next.ingredients.find((i) => i.id === ingredientId);
      if (ing && addedQuantity > 0) {
        ing.currentStock = Number((ing.currentStock + addedQuantity).toFixed(2));
        ing.lastRestockedAt = op.timestamp;
        next.stockMovements.unshift({
          id: `mov-${op.id}`,
          timestamp: op.timestamp,
          ingredientId: ing.id,
          ingredientName: ing.name,
          type: 'RESTOCK_RECEIPT',
          delta: addedQuantity,
          unit: ing.unit,
          balanceAfter: ing.currentStock,
          costImpact: Number((addedQuantity * ing.costPerUnit).toFixed(2)),
          reference: supplierNote || `Purchase Order Restock (${ing.supplier})`,
          actor: `${actor || 'Inventory Manager'} · ${op.deviceId}`,
        });
      }
      break;
    }

    case 'ADJUST_INGREDIENT': {
      const { ingredientId, delta, movementType, reason, actor } = op.payload;
      const ing = next.ingredients.find((i) => i.id === ingredientId);
      if (ing && delta !== 0) {
        ing.currentStock = Math.max(0, Number((ing.currentStock + delta).toFixed(2)));
        next.stockMovements.unshift({
          id: `mov-${op.id}`,
          timestamp: op.timestamp,
          ingredientId: ing.id,
          ingredientName: ing.name,
          type: movementType || 'WASTE_SPILLAGE',
          delta,
          unit: ing.unit,
          balanceAfter: ing.currentStock,
          costImpact: Number((Math.abs(delta) * ing.costPerUnit).toFixed(2)),
          reference: reason || 'Manual stock audit adjustment',
          actor: `${actor || 'Shift Manager'} · ${op.deviceId}`,
        });
      }
      break;
    }

    case 'CREATE_INGREDIENT': {
      const newIng = op.payload.ingredient;
      next.ingredients.push(newIng);
      next.stockMovements.unshift({
        id: `mov-${op.id}`,
        timestamp: op.timestamp,
        ingredientId: newIng.id,
        ingredientName: newIng.name,
        type: 'RESTOCK_RECEIPT',
        delta: newIng.currentStock,
        unit: newIng.unit,
        balanceAfter: newIng.currentStock,
        costImpact: Number((newIng.currentStock * newIng.costPerUnit).toFixed(2)),
        reference: 'Initial SKU Stock Onboarding',
        actor: `Inventory Admin · ${op.deviceId}`,
      });
      break;
    }

    case 'CREATE_MENU_ITEM': {
      next.menuItems.push(op.payload.menuItem);
      break;
    }

    case 'UPDATE_MENU_RECIPE': {
      const { menuItemId, recipe, price } = op.payload;
      const item = next.menuItems.find((m) => m.id === menuItemId);
      if (item) {
        item.recipe = recipe;
        if (typeof price === 'number' && price > 0) {
          item.price = price;
        }
      }
      break;
    }

    case 'CREATE_CUSTOMER': {
      next.customers.unshift(op.payload.customer);
      break;
    }

    case 'UPDATE_CUSTOMER': {
      const { customerId, updates } = op.payload;
      const cust = next.customers.find((c) => c.id === customerId);
      if (cust) {
        Object.assign(cust, updates);
      }
      break;
    }

    case 'CREATE_EOD_RECONCILIATION': {
      next.reconciliations.unshift(op.payload.reconciliation);
      break;
    }

    case 'UPDATE_SYSTEM_SETTINGS': {
      next.settings = {
        ...next.settings,
        ...op.payload.settings,
        branding: {
          ...next.settings.branding,
          ...(op.payload.settings?.branding || {}),
        },
        currency: {
          ...next.settings.currency,
          ...(op.payload.settings?.currency || {}),
        },
        time: {
          ...next.settings.time,
          ...(op.payload.settings?.time || {}),
        },
        tax: {
          ...next.settings.tax,
          ...(op.payload.settings?.tax || {}),
        },
        print: {
          ...next.settings.print,
          ...(op.payload.settings?.print || {}),
        },
        language: {
          ...next.settings.language,
          ...(op.payload.settings?.language || {}),
        },
        notifications: {
          ...next.settings.notifications,
          ...(op.payload.settings?.notifications || {}),
        },
      };
      break;
    }

    case 'CREATE_STAFF_USER': {
      next.users.push(op.payload.user);
      break;
    }

    case 'UPDATE_STAFF_USER': {
      const { userId, updates } = op.payload;
      const user = next.users.find((u) => u.id === userId);
      if (user) {
        Object.assign(user, updates);
      }
      break;
    }

    case 'DELETE_STAFF_USER': {
      const { userId } = op.payload;
      next.users = next.users.filter((u) => u.id !== userId);
      break;
    }

    case 'CREATE_PURCHASE_ORDER': {
      if (!next.purchaseOrders) next.purchaseOrders = [];
      next.purchaseOrders.unshift(op.payload.purchaseOrder);
      break;
    }

    case 'UPDATE_PURCHASE_ORDER': {
      if (!next.purchaseOrders) next.purchaseOrders = [];
      const { poId, updates } = op.payload;
      const po = next.purchaseOrders.find((p) => p.id === poId);
      if (po) {
        Object.assign(po, updates);
      }
      break;
    }

    case 'RECEIVE_PURCHASE_ORDER': {
      if (!next.purchaseOrders) next.purchaseOrders = [];
      const { poId, receivedItems, receivedBy, status } = op.payload;
      const po = next.purchaseOrders.find((p) => p.id === poId);
      if (po) {
        po.status = status || 'RECEIVED_COMPLETED';
        po.receivedDate = op.timestamp;
        po.receivedBy = receivedBy || 'Inventory Staff';

        if (Array.isArray(receivedItems)) {
          for (const rec of receivedItems) {
            // Update line item in PO
            const item = po.items.find((i) => i.ingredientId === rec.ingredientId);
            if (item) {
              item.quantityReceived = (item.quantityReceived || 0) + rec.quantityReceived;
            }

            // Restock the ingredient in inventory
            if (rec.quantityReceived > 0) {
              const ing = next.ingredients.find((i) => i.id === rec.ingredientId);
              if (ing) {
                ing.currentStock = Number((ing.currentStock + rec.quantityReceived).toFixed(2));
                ing.lastRestockedAt = op.timestamp;

                next.stockMovements.unshift({
                  id: `mov-po-${op.id}-${ing.id}`,
                  timestamp: op.timestamp,
                  ingredientId: ing.id,
                  ingredientName: ing.name,
                  type: 'RESTOCK_RECEIPT',
                  delta: rec.quantityReceived,
                  unit: ing.unit,
                  balanceAfter: ing.currentStock,
                  costImpact: Number((rec.quantityReceived * (item?.unitCost ?? ing.costPerUnit)).toFixed(2)),
                  reference: `PO ${po.poNumber} (${po.supplierName})`,
                  actor: `${receivedBy || 'Staff'} · ${op.deviceId}`,
                });
              }
            }
          }
        }
      }
      break;
    }

    case 'CREATE_SUPPLIER': {
      if (!next.suppliers) next.suppliers = [];
      next.suppliers.unshift(op.payload.supplier);
      break;
    }

    case 'UPDATE_SUPPLIER': {
      if (!next.suppliers) next.suppliers = [];
      const { supplierId, updates } = op.payload;
      const sup = next.suppliers.find((s) => s.id === supplierId);
      if (sup) {
        Object.assign(sup, updates);
      }
      break;
    }

    case 'UPDATE_ROLE_PERMISSIONS': {
      if (!next.settings.rolePermissions) {
        next.settings.rolePermissions = JSON.parse(JSON.stringify(ROLE_DEFAULT_PERMISSIONS));
      }
      next.settings.rolePermissions = op.payload.rolePermissions;
      break;
    }

    case 'CREATE_CUSTOM_PERMISSION': {
      if (!next.settings.customPermissions) {
        next.settings.customPermissions = [];
      }
      const existing = next.settings.customPermissions.find((p) => p.key === op.payload.permission.key);
      if (!existing) {
        next.settings.customPermissions.push(op.payload.permission);
      }
      if (op.payload.assignedRoles) {
        if (!next.settings.rolePermissions) {
          next.settings.rolePermissions = JSON.parse(JSON.stringify(ROLE_DEFAULT_PERMISSIONS));
        }
        const rolePermissions = next.settings.rolePermissions;
        if (rolePermissions) {
          for (const role of op.payload.assignedRoles as UserRole[]) {
            if (!rolePermissions[role]) {
              rolePermissions[role] = [];
            }
            if (!rolePermissions[role].includes(op.payload.permission.key)) {
              rolePermissions[role].push(op.payload.permission.key);
            }
          }
        }
      }
      break;
    }

    case 'DELETE_CUSTOM_PERMISSION': {
      const { permissionKey } = op.payload;
      if (next.settings.customPermissions) {
        next.settings.customPermissions = next.settings.customPermissions.filter((p) => p.key !== permissionKey);
      }
      if (next.settings.rolePermissions) {
        for (const r of Object.keys(next.settings.rolePermissions) as UserRole[]) {
          next.settings.rolePermissions[r] = next.settings.rolePermissions[r].filter((k) => k !== permissionKey);
        }
      }
      break;
    }

    case 'CREATE_MENU_CATEGORY': {
      const existing = next.menuCategories.find(
        (c) => c.name.trim().toLowerCase() === op.payload.category.name.trim().toLowerCase()
      );
      if (!existing) {
        next.menuCategories.push(op.payload.category);
      }
      break;
    }

    case 'UPDATE_MENU_CATEGORY': {
      const { categoryId, oldName, updates } = op.payload;
      const cat = next.menuCategories.find((c) => c.id === categoryId || c.name === oldName);
      if (cat) {
        const prevName = cat.name;
        Object.assign(cat, updates);
        if (updates.name && updates.name !== prevName) {
          next.menuItems.forEach((m) => {
            if (m.category === prevName || m.category === oldName) {
              m.category = updates.name;
            }
          });
        }
      }
      break;
    }

    case 'DELETE_MENU_CATEGORY': {
      const { categoryId, categoryName, fallbackCategory } = op.payload;
      next.menuCategories = next.menuCategories.filter(
        (c) => c.id !== categoryId && c.name !== categoryName
      );
      const targetCat = fallbackCategory || next.menuCategories[0]?.name || 'Signature Cocktails';
      next.menuItems.forEach((m) => {
        if (m.category === categoryName) {
          m.category = targetCat;
        }
      });
      break;
    }

    case 'UPDATE_MENU_ITEM': {
      const { menuItemId, updates } = op.payload;
      const item = next.menuItems.find((m) => m.id === menuItemId);
      if (item) {
        Object.assign(item, updates);
      }
      break;
    }

    case 'DELETE_MENU_ITEM': {
      const { menuItemId } = op.payload;
      next.menuItems = next.menuItems.filter((m) => m.id !== menuItemId);
      break;
    }
  }

  return next;
}
