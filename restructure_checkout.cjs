const fs = require('fs');
let content = fs.readFileSync('src/pages/CheckoutPage.tsx', 'utf-8');

// 1. Change max-w-lg to max-w-5xl
content = content.replace('<div className="max-w-lg mx-auto">', '<div className="max-w-5xl mx-auto">');

// 2. Add state variables for Product Search
const stateLines = `
  const [productSearch, setProductSearch] = useState('');
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const products = useWarungStore(state => state.products);
  const { addToCart } = useCartStore(); // Note: must add addToCart to existing destructure if not there, or just use this duplicate hook call (zustand supports it)
`;

// Insert after selectedPaymentMethod
content = content.replace('const [selectedCourier, setSelectedCourier] = useState(\'\');', 'const [selectedCourier, setSelectedCourier] = useState(\'\');\n' + stateLines);

// Also need to add filteredNewProducts useMemo
const memoLines = `
  const filteredNewProducts = \\React.useMemo(() => {
    if (!productSearch) return products;
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);
`.replace(/\\/g, ''); // just a hack to not conflict

content = content.replace('const formatTime = (seconds: number) => {', memoLines + '\n  const formatTime = (seconds: number) => {');
content = content.replace("import { useState, useEffect, useRef } from 'react';", "import React, { useState, useEffect, useRef } from 'react';");

// 3. Extract the sections
const headerStart = content.indexOf('{/* Payment Method Tabs - Only show if QRIS is available */}');
const paymentEnd = content.indexOf('{/* Order Summary with Product Images */}');
const orderStart = content.indexOf('{/* Order Summary with Product Images */}');
const shippingStart = content.indexOf('{/* Shipping Method Section */}');
const confirmStart = content.indexOf('{/* Confirm Payment Button - Opens Modal */}');
const customerModalStart = content.indexOf('{/* Customer Details Modal */}');

const paymentBlock = content.slice(headerStart, paymentEnd);
const orderBlock = content.slice(orderStart, shippingStart);
const shippingBlock = content.slice(shippingStart, confirmStart);
const confirmBlock = content.slice(confirmStart, customerModalStart);

// Inject "Tambah Produk Lainnya" button at the end of Ringkasan Pesanan
let modifiedOrderBlock = orderBlock.replace('        </div>\n\n        {/* Shipping Method Section */}', '          <div className="p-3 border-t-2 border-brand-black bg-white">\n            <Button type="button" onClick={() => setIsProductSearchOpen(true)} variant="outline" className="w-full border-2 border-dashed border-brand-black rounded-none font-mono text-xs h-12 flex items-center justify-center gap-2 hover:bg-brand-orange/10"><Plus className="w-4 h-4" />Tambah Produk Lainnya</Button>\n          </div>\n        </div>\n\n        {/* Shipping Method Section */}');

// Build the two columns
const newGrid = `
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
          <div className="space-y-6 lg:order-1 order-2">
${modifiedOrderBlock}
${shippingBlock}
          </div>
          <div className="space-y-6 lg:order-2 order-1">
${paymentBlock.replace('className="mb-6"', 'className=""')}
${confirmBlock}
          </div>
        </div>
`;

// Insert it back
content = content.slice(0, headerStart) + newGrid + content.slice(customerModalStart);

// At the very end of the main view, add the Product Search Modal
const productSearchModal = `
        <Dialog open={isProductSearchOpen} onOpenChange={setIsProductSearchOpen}>
          <DialogContent className="sm:max-w-md h-[80vh] flex flex-col p-0 rounded-none border-4 border-brand-black bg-brand-white">
            <DialogHeader className="p-4 border-b-2 border-brand-black bg-brand-light-orange/20 flex-shrink-0">
               <DialogTitle className="flex items-center gap-2 text-xl font-bold font-display">
                  <Package className="w-6 h-6" />
                  Pilih Produk
               </DialogTitle>
               <div className="relative mt-2">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input 
                   placeholder="Cari produk..." 
                   value={productSearch} 
                   onChange={(e) => setProductSearch(e.target.value)} 
                   className="pl-9 border-2 border-brand-black rounded-none h-11 focus-visible:ring-0 focus-visible:ring-offset-0 font-bold"
                 />
               </div>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto bg-gray-50">
               <div className="grid grid-cols-1 gap-0">
                 {filteredNewProducts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground font-mono">
                        Tidak ada produk ditemukan.
                    </div>
                 ) : filteredNewProducts.map(p => {
                    const cartItem = items.find(i => i.product.id === p.id);
                    const qty = cartItem ? cartItem.quantity : 0;
                    return (
                        <div key={p.id} className="flex justify-between items-center p-4 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                           <div className="flex-1 min-w-0 pr-4">
                              <p className="font-bold text-sm truncate">{p.name}</p>
                              <p className="font-mono text-brand-orange font-bold text-sm">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.price)}</p>
                              {p.totalStock !== undefined && p.totalStock !== null ? (
                                 <p className="font-mono text-[10px] text-muted-foreground mt-1">Sisa stok: {p.totalStock}</p>
                              ) : null}
                           </div>
                           <div className="flex items-center gap-2">
                             {qty > 0 ? (
                               <div className="flex items-center border-2 border-brand-black bg-white">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (qty > 1) {
                                        updateQuantity(p.id, qty - 1);
                                      } else {
                                        removeFromCart(p.id);
                                      }
                                    }}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors border-r-2 border-brand-black"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="w-8 text-center font-mono font-bold text-xs">{qty}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const maxStock = p.totalStock !== undefined && p.totalStock !== null ? Number(p.totalStock) : Infinity;
                                      if (qty < maxStock) {
                                        updateQuantity(p.id, qty + 1);
                                      } else {
                                        toast.error(\`Stok tidak mencukupi (Sisa: \${p.totalStock})\`);
                                      }
                                    }}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors border-l-2 border-brand-black"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                               </div>
                             ) : (
                               <Button 
                                 onClick={() => {
                                    if ((p.totalStock !== undefined && p.totalStock !== null && p.totalStock <= 0)) {
                                       toast.error(\`Stok \${p.name} habis\`);
                                    } else {
                                       addToCart(p, 1);
                                       toast.success(\`\${p.name} ditambahkan\`);
                                    }
                                 }}
                                 disabled={p.totalStock !== undefined && p.totalStock !== null && p.totalStock <= 0}
                                 className="flex-shrink-0 bg-brand-orange text-brand-black border-2 border-brand-black rounded-none shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all h-8 px-3"
                               >
                                 <Plus className="w-4 h-4 mr-1" /> Tambah
                               </Button>
                             )}
                           </div>
                        </div>
                    );
                 })}
               </div>
            </div>
            <div className="p-4 border-t-2 border-brand-black bg-white flex-shrink-0">
               <Button onClick={() => setIsProductSearchOpen(false)} className="w-full bg-brand-black text-white hover:bg-brand-black/90 font-bold rounded-none h-12 uppercase">
                 Selesai ({items.length} Item)
               </Button>
            </div>
          </DialogContent>
        </Dialog>
`;

content = content.replace('      <UpgradeDialog', productSearchModal + '\n      <UpgradeDialog');

// Import Package, Search
content = content.replace("Plus, Minus, Trash2 } from 'lucide-react';", "Plus, Minus, Trash2, Package, Search } from 'lucide-react';");

fs.writeFileSync('src/pages/CheckoutPage.tsx', content);
