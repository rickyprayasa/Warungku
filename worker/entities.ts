import { IndexedEntity } from "./core-utils";
import type { Product } from "@shared/types";
const MOCK_PRODUCTS: Product[] = [
  { id: 'prod_1', name: 'Indomie Goreng', price: 3000, imageUrl: 'https://i.imgur.com/k2S224j.png', category: 'Makanan' },
  { id: 'prod_2', name: 'Teh Pucuk', price: 3500, imageUrl: 'https://i.imgur.com/s2h62r0.png', category: 'Minuman' },
  { id: 'prod_3', name: 'Chitato', price: 10000, imageUrl: 'https://i.imgur.com/A632j2V.png', category: 'Snack' },
  { id: 'prod_4', name: 'Aqua 600ml', price: 3000, imageUrl: 'https://i.imgur.com/90y7c2r.png', category: 'Minuman' },
  { id: 'prod_5', name: 'Beng-Beng', price: 2000, imageUrl: 'https://i.imgur.com/N3a0G7d.png', category: 'Snack' },
  { id: 'prod_6', name: 'Nasi Kucing', price: 5000, imageUrl: 'https://i.imgur.com/Q2Y28J5.png', category: 'Makanan' },
  { id: 'prod_7', name: 'Kopi ABC', price: 1500, imageUrl: 'https://i.imgur.com/oDEh7cQ.png', category: 'Minuman' },
  { id: 'prod_8', name: 'Oreo', price: 8000, imageUrl: 'https://i.imgur.com/qG01a2Z.png', category: 'Snack' },
];
export class ProductEntity extends IndexedEntity<Product> {
  static readonly entityName = "product";
  static readonly indexName = "products";
  static readonly initialState: Product = { id: "", name: "", price: 0, imageUrl: "", category: "" };
  static seedData = MOCK_PRODUCTS;
}