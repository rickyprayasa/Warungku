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