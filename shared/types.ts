import { z } from 'zod';
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export interface Product {
  id: string;
  name: string;
  price: number;
  cost?: number; // Optional - auto-calculated from FIFO batches (for reference only)
  imageUrl: string;
  category: string;
  description?: string; // Product description
  isPromo?: boolean; // Is this product on promo
  promoPrice?: number; // Promo price (if on promo)
  isActive?: boolean;
  totalStock?: number; // Total available stock across all batches
  minStockLevel?: number; // Minimum stock level for low stock alerts (default: 10)
  createdAt: number;
}
// Zod schema for product validation
export const productSchema = z.object({
  name: z.string().min(1, "Nama produk harus diisi"),
  price: z.number().min(0, "Harga tidak boleh negatif"),
  cost: z.number().min(0).optional(),
  imageUrl: z.string().optional(),
  category: z.string().min(1, "Kategori harus dipilih"),
  description: z.string().optional(),
  isPromo: z.boolean().optional(),
  promoPrice: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  minStockLevel: z.number().min(0, "Minimum stock level tidak boleh negatif").optional(),
});
export type ProductFormValues = z.infer<typeof productSchema>;
// Types for Sales
export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number; // Sell price per item
  cost: number; // Buy price per item
}
export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  profit: number;
  createdAt: number;
  saleType?: 'retail' | 'display'; // Display = bulk sale for items on display
  notes?: string; // Optional notes/remarks for the sale
}
export const saleItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number(),
  cost: z.number(), // Added for backend processing
});
export const saleSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1, "Product must be selected."),
    productName: z.string(),
    quantity: z.number().min(1),
    price: z.number(),
  })).min(1, "Sale must have at least one item."),
  notes: z.string().optional(),
});
export type SaleFormValues = z.infer<typeof saleSchema>;
// Types for Purchases
export interface Purchase {
  id: string;
  productId: string;
  productName: string;
  quantity: number; // Total units (packQuantity × unitsPerPack)
  packQuantity?: number; // Number of packs/boxes purchased
  unitsPerPack?: number; // Units per pack/box
  unitCost: number; // Cost per individual unit
  totalCost: number; // Total cost of purchase
  supplier?: string;
  supplierId?: string;
  createdAt: number;
  notes?: string; // Optional notes/remarks for the purchase
}
export const purchaseSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  packQuantity: z.number().min(1, "Pack quantity must be at least 1.").optional(),
  unitsPerPack: z.number().min(1, "Units per pack must be at least 1.").optional(),
  quantity: z.number().min(1, "Quantity must be at least 1."),
  unitCost: z.number().min(0, "Unit cost must be a positive number."),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});
export type PurchaseFormValues = z.infer<typeof purchaseSchema>;
// Types for Suppliers
export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  createdAt: number;
}
export const supplierSchema = z.object({
  name: z.string().min(2, "Supplier name is required."),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});
export type SupplierFormValues = z.infer<typeof supplierSchema>;
// Types for Jajanan Requests
export interface JajananRequest {
  id: string;
  productId?: string;
  requesterName: string;
  snackName: string;
  productName?: string;
  quantity: number;
  notes?: string;
  requestType?: 'stock_request' | 'feedback' | 'question';
  status: 'pending' | 'approved' | 'rejected';
  isRead?: boolean;
  createdAt: number;
  updatedAt?: number;
}
export const jajananRequestSchema = z.object({
  requesterName: z.string().min(3, "Nama pemohon minimal 3 karakter."),
  snackName: z.string().min(3, "Nama jajanan minimal 3 karakter."),
  quantity: z.number().min(1, "Jumlah minimal 1."),
  notes: z.string().optional(),
});
export type JajananRequestFormValues = z.infer<typeof jajananRequestSchema>;
// Types for Stock Details (FIFO)
export interface StockDetail {
  id: string;
  productId: string;
  productName?: string;
  purchaseId?: string; // Reference to purchase that created this stock
  quantity: number; // Remaining quantity from this batch
  unitCost: number; // Purchase cost per unit for this batch
  createdAt: number; // When this stock batch was created
}
export const stockDetailSchema = z.object({
  productId: z.string().min(1, "Product ID is required."),
  purchaseId: z.string().min(1, "Purchase ID is required."),
  quantity: z.number().min(0, "Quantity must be non-negative."),
  unitCost: z.number().min(0, "Unit cost must be non-negative."),
});
export type StockDetailFormValues = z.infer<typeof stockDetailSchema>;

// Types for Opname
export interface OpnameItem {
  productId: string;
  quantity: number; // Sisa fisik (yang akan diretur/dikembalikan ke stok)
}

export interface OpnamePayload {
  items: OpnameItem[];
}

// Types for Cash Entry (Daily Sales)
export interface CashEntry {
  id: string;
  amount: number; // Uang cash hari ini
  date: string; // Format: YYYY-MM-DD for grouping by day
  notes?: string;
  createdAt: number;
}

export const cashEntrySchema = z.object({
  amount: z.number().min(0, "Jumlah uang tidak boleh negatif."),
  notes: z.string().optional(),
});

export type CashEntryFormValues = z.infer<typeof cashEntrySchema>;