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
  totalStock?: number; // Total available stock across all batches
  createdAt: number;
}
// Zod schema for product validation
export const productSchema = z.object({
  name: z.string().min(3, { message: "Nama produk minimal 3 karakter." }),
  price: z.number().min(0, { message: "Harga harus angka positif." }),
  cost: z.number().min(0, { message: "Biaya harus angka positif." }).optional(),
  category: z.string().min(3, { message: "Kategori minimal 3 karakter." }),
  imageUrl: z.string().url({ message: "URL gambar tidak valid." }),
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
}
export const purchaseSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  packQuantity: z.number().min(1, "Pack quantity must be at least 1.").optional(),
  unitsPerPack: z.number().min(1, "Units per pack must be at least 1.").optional(),
  quantity: z.number().min(1, "Quantity must be at least 1."),
  unitCost: z.number().min(0, "Unit cost must be a positive number."),
  supplier: z.string().optional(),
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
  requesterName: string;
  snackName: string;
  quantity: number;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
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