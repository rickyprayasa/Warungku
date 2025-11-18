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
  cost: number; // Buy price for profit calculation
  imageUrl: string;
  category: string;
}
// Zod schema for product validation
export const productSchema = z.object({
  name: z.string().min(3, { message: "Nama produk minimal 3 karakter." }),
  price: z.coerce.number().min(0, { message: "Harga harus angka positif." }),
  cost: z.coerce.number().min(0, { message: "Biaya harus angka positif." }),
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
  createdAt: number;
}
export const saleItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  price: z.coerce.number(),
  cost: z.coerce.number(), // Added for backend processing
});
export const saleSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1, "Product must be selected."),
    productName: z.string(),
    quantity: z.coerce.number().min(1),
    price: z.coerce.number(),
  })).min(1, "Sale must have at least one item."),
});
export type SaleFormValues = z.infer<typeof saleSchema>;
// Types for Purchases
export interface Purchase {
  id:string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplier: string;
  createdAt: number;
}
export const purchaseSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  unitCost: z.coerce.number().min(0, "Unit cost must be a positive number."),
  supplier: z.string().optional(),
});
export type PurchaseFormValues = z.infer<typeof purchaseSchema>;
// Types for Suppliers
export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
}
export const supplierSchema = z.object({
  name: z.string().min(2, "Supplier name is required."),
  contactPerson: z.string().min(2, "Contact person is required."),
  phone: z.string().min(5, "Phone number is required."),
});
export type SupplierFormValues = z.infer<typeof supplierSchema>;
// Types for Jajanan Requests
export interface JajananRequest {
  id: string;
  name: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}
export const jajananRequestSchema = z.object({
  name: z.string().min(3, "Nama jajanan minimal 3 karakter."),
  notes: z.string().optional(),
});
export type JajananRequestFormValues = z.infer<typeof jajananRequestSchema>;