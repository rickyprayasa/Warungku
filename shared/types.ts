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
  imageUrl: string;
  category: string;
}
// Zod schema for product validation
export const productSchema = z.object({
  name: z.string().min(3, { message: "Nama produk minimal 3 karakter." }),
  price: z.coerce.number().min(0, { message: "Harga harus angka positif." }),
  category: z.string().min(3, { message: "Kategori minimal 3 karakter." }),
  imageUrl: z.string().url({ message: "URL gambar tidak valid." }),
});
export type ProductFormValues = z.infer<typeof productSchema>;
// Types for Sales
export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
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
});
export const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Sale must have at least one item."),
});
export type SaleFormValues = z.infer<typeof saleSchema>;
// Types for Purchases
export interface Purchase {
  id: string;
  productName: string;
  quantity: number;
  cost: number;
  supplier: string;
  createdAt: number;
}
export const purchaseSchema = z.object({
  productName: z.string().min(2, "Product name is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  cost: z.coerce.number().min(0, "Cost must be a positive number."),
  supplier: z.string().optional(),
});
export type PurchaseFormValues = z.infer<typeof purchaseSchema>;