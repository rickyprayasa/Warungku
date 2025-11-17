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
export interface TransactionItem {
  productId: string;
  quantity: number;
  price: number; // Price at the time of transaction
}
export interface Transaction {
  id: string;
  items: TransactionItem[];
  total: number;
  createdAt: number; // epoch millis
}
// Zod schema for product validation
export const productSchema = z.object({
  name: z.string().min(3, { message: "Nama produk minimal 3 karakter." }),
  price: z.coerce.number().min(0, { message: "Harga harus angka positif." }).optional().default(0),
  category: z.string().min(3, { message: "Kategori minimal 3 karakter." }),
  imageUrl: z.string().url({ message: "URL gambar tidak valid." }),
});
export type ProductFormValues = z.infer<typeof productSchema>;