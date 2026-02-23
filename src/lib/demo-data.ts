import { Product, Sale, Purchase, Supplier, JajananRequest, StockDetail, Reconciliation } from '../../shared/types';

// Generate some timestamps for the last 7 days
const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;
const dates = Array.from({ length: 7 }, (_, i) => now - i * dayMs);

export const demoStoreProfile = {
    name: 'Toko Omzetin (Demo)',
    slug: 'toko-omzetin-demo',
    address: 'Jl. Contoh Demo No. 123, Jakarta',
    phone: '081234567890',
    logo_url: '',
    qris_code: '',
    cart_enabled: true,
    plan: 'pro',
};

export const demoProducts: Product[] = [
    {
        id: 'prod-1',
        name: 'Indomie Goreng Original',
        price: 3500,
        cost: 2800,
        imageUrl: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400',
        category: 'Makanan',
        description: 'Mie instan goreng paling populer',
        isPromo: true,
        promoPrice: 3200,
        isActive: true,
        isBestSeller: true,
        totalStock: 145,
        minStockLevel: 20,
        qtyPerUnit: 1,
        unit: 'pcs',
        createdAt: dates[6],
    },
    {
        id: 'prod-2',
        name: 'Beras Pandan Wangi 5kg',
        price: 75000,
        cost: 65000,
        imageUrl: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400',
        category: 'Sembako',
        description: 'Beras pulen kualitas premium',
        isActive: true,
        isBestSeller: true,
        totalStock: 25,
        minStockLevel: 5,
        qtyPerUnit: 1,
        unit: 'karung',
        createdAt: dates[5],
    },
    {
        id: 'prod-3',
        name: 'Minyak Goreng Bimoli 2L',
        price: 36000,
        cost: 32000,
        imageUrl: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400',
        category: 'Sembako',
        isActive: true,
        isBestSeller: false,
        totalStock: 40,
        minStockLevel: 10,
        qtyPerUnit: 1,
        unit: 'pouch',
        createdAt: dates[4],
    },
    {
        id: 'prod-4',
        name: 'Kopi Kenangan Mantan',
        price: 18000,
        cost: 10000,
        imageUrl: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=400',
        category: 'Minuman',
        isActive: true,
        isBestSeller: true,
        totalStock: 15, // Low stock to show alert
        minStockLevel: 20,
        qtyPerUnit: 1,
        unit: 'cup',
        createdAt: dates[3],
    },
    {
        id: 'prod-5',
        name: 'Tolak Angin Sido Muncul',
        price: 4500,
        cost: 3500,
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
        category: 'Obat',
        isActive: true,
        isBestSeller: false,
        totalStock: 0, // Out of stock to show alert
        minStockLevel: 12,
        qtyPerUnit: 1,
        unit: 'sachet',
        createdAt: dates[2],
    },
];

export const demoSales: Sale[] = [
    {
        id: 'sale-1',
        items: [
            { productId: 'prod-1', productName: 'Indomie Goreng Original', quantity: 5, price: 3200, cost: 2800 },
            { productId: 'prod-4', productName: 'Kopi Kenangan Mantan', quantity: 2, price: 18000, cost: 10000 }
        ],
        total: 52000,
        profit: 18000,
        saleType: 'retail',
        status: 'completed',
        createdAt: dates[0] - 1000 * 60 * 30, // 30 mins ago
        cashierName: 'Ryus (Demo Owner)',
        notes: 'Pelanggan langganan',
    },
    {
        id: 'sale-2',
        items: [
            { productId: 'prod-2', productName: 'Beras Pandan Wangi 5kg', quantity: 1, price: 75000, cost: 65000 },
            { productId: 'prod-3', productName: 'Minyak Goreng Bimoli 2L', quantity: 2, price: 36000, cost: 32000 }
        ],
        total: 147000,
        profit: 18000,
        saleType: 'retail',
        status: 'completed',
        createdAt: dates[1], // 1 day ago
        cashierName: 'Ryus (Demo Owner)',
    },
    {
        id: 'sale-3',
        items: [
            { productId: 'prod-1', productName: 'Indomie Goreng Original', quantity: 40, price: 3000, cost: 2800 }
        ],
        total: 120000,
        profit: 8000,
        saleType: 'retail',
        status: 'completed',
        createdAt: dates[2], // 2 days ago
        customerName: 'Ibu Ratna (Warung Sebelah)', // Grosir sale
        notes: 'Harga grosir khusus',
    }
];

export const demoPurchases: Purchase[] = [
    {
        id: 'purch-1',
        productId: 'prod-1',
        productName: 'Indomie Goreng Original',
        quantity: 100,
        packQuantity: 2,
        unitsPerPack: 50,
        unitCost: 2800,
        totalCost: 280000,
        supplier: 'Grosir Maju Jaya',
        createdAt: dates[6],
    }
];

export const demoSuppliers: Supplier[] = [
    {
        id: 'sup-1',
        name: 'Grosir Maju Jaya',
        contactPerson: 'Bapak Budi',
        phone: '08111222333',
        address: 'Pasar Induk Kramat Jati',
        createdAt: dates[6],
    }
];

export const demoStockDetails: StockDetail[] = [
    {
        id: 'sd-1',
        productId: 'prod-1',
        productName: 'Indomie Goreng Original',
        purchaseId: 'purch-1',
        quantity: 100,
        unitCost: 2800,
        createdAt: dates[6],
    }
];

export const demoJajananRequests: JajananRequest[] = [
    {
        id: 'req-1',
        requesterName: 'Budi (Anak SD)',
        snackName: 'Chiki Balls Coklat',
        quantity: 10,
        requestType: 'stock_request',
        status: 'pending',
        isRead: false,
        createdAt: dates[0],
        notes: 'Banyak dicari anak-anak',
    }
];

export const demoReconciliations: Reconciliation[] = [];
export const demoInitialBalance = 0;
