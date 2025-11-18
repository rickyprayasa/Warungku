import { IndexedEntity } from "./core-utils";
import type { Product, Sale, Purchase, Supplier } from "@shared/types";
const MOCK_PRODUCTS: Product[] = [
  { id: 'prod_1', name: 'Indomie Goreng', price: 3000, cost: 2500, imageUrl: 'https://i.imgur.com/k2S224j.png', category: 'Makanan' },
  { id: 'prod_2', name: 'Teh Pucuk', price: 3500, cost: 2800, imageUrl: 'https://i.imgur.com/s2h62r0.png', category: 'Minuman' },
  { id: 'prod_3', name: 'Chitato', price: 10000, cost: 8500, imageUrl: 'https://i.imgur.com/A632j2V.png', category: 'Snack' },
  { id: 'prod_4', name: 'Aqua 600ml', price: 3000, cost: 2200, imageUrl: 'https://i.imgur.com/90y7c2r.png', category: 'Minuman' },
  { id: 'prod_5', name: 'Beng-Beng', price: 2000, cost: 1500, imageUrl: 'https://i.imgur.com/N3a0G7d.png', category: 'Snack' },
  { id: 'prod_6', name: 'Nasi Kucing', price: 5000, cost: 3500, imageUrl: 'https://i.imgur.com/Q2Y28J5.png', category: 'Makanan' },
  { id: 'prod_7', name: 'Kopi ABC', price: 1500, cost: 1000, imageUrl: 'https://i.imgur.com/oDEh7cQ.png', category: 'Minuman' },
  { id: 'prod_8', name: 'Oreo', price: 8000, cost: 6500, imageUrl: 'https://i.imgur.com/qG01a2Z.png', category: 'Snack' },
];
const MOCK_SUPPLIERS: Supplier[] = [
    { id: 'sup_1', name: 'Indofood', contactPerson: 'Budi Santoso', phone: '081234567890' },
    { id: 'sup_2', name: 'Mayora', contactPerson: 'Siti Aminah', phone: '082345678901' },
];
export class ProductEntity extends IndexedEntity<Product> {
  static readonly entityName = "product";
  static readonly indexName = "products";
  static readonly initialState: Product = { id: "", name: "", price: 0, cost: 0, imageUrl: "", category: "" };
  static seedData = MOCK_PRODUCTS;
}
export class SaleEntity extends IndexedEntity<Sale> {
  static readonly entityName = "sale";
  static readonly indexName = "sales";
  static readonly initialState: Sale = { id: "", items: [], total: 0, createdAt: 0 };
  static seedData: Sale[] = [];
}
export class PurchaseEntity extends IndexedEntity<Purchase> {
  static readonly entityName = "purchase";
  static readonly indexName = "purchases";
  static readonly initialState: Purchase = { id: "", productId: "", productName: "", quantity: 0, unitCost: 0, totalCost: 0, supplier: "", createdAt: 0 };
  static seedData: Purchase[] = [];
}
export class SupplierEntity extends IndexedEntity<Supplier> {
  static readonly entityName = "supplier";
  static readonly indexName = "suppliers";
  static readonly initialState: Supplier = { id: "", name: "", contactPerson: "", phone: "" };
  static seedData = MOCK_SUPPLIERS;
}