import re

with open('src/pages/CheckoutPage.tsx', 'r') as f:
    content = f.read()

# I will find the sections to extract.
header_start = content.find('{/* Header */}')
header_end = content.find('{/* Payment Method Tabs - Only show if QRIS is available */}')

payment_start = content.find('{/* Payment Method Tabs - Only show if QRIS is available */}')
payment_end = content.find('{/* Order Summary with Product Images */}')

order_start = content.find('{/* Order Summary with Product Images */}')
shipping_start = content.find('{/* Shipping Method Section */}')
confirm_start = content.find('{/* Confirm Payment Button - Opens Modal */}')
customer_start = content.find('{/* Customer Details Modal */}')

# 1. State changes
state_changes = """
  const [selectedCourier, setSelectedCourier] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const products = useWarungStore(state => state.products);
  const { addToCart } = useCartStore();
  
  const filteredNewProducts = React.useMemo(() => {
    if (!productSearch) return products;
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);
"""
content = content.replace("const [selectedCourier, setSelectedCourier] = useState('');", state_changes)

# Import React if needed (for useMemo)
content = content.replace("import { useState, useEffect, useRef } from 'react';", "import React, { useState, useEffect, useRef } from 'react';")


# Extract blocks
header_block = content[header_start:header_end]
payment_block = content[payment_start:payment_end]
order_block = content[order_start:shipping_start]
shipping_block = content[shipping_start:confirm_start]

# Construct grid
new_grid = f"""
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
          {/* Kiri: Ringkasan Pesanan & Pengiriman */}
          <div className="space-y-6">
            {order_block.replace('<div className="bg-white border-4 border-brand-black mb-4">', '<div className="bg-white border-4 border-brand-black">')}
              {/* Tambah Produk Lainnya Button */}
              <div className="p-3 border-t-2 border-brand-black bg-white">
                <Button 
                  onClick={() => setIsProductSearchOpen(true)}
                  variant="outline" 
                  className="w-full border-2 border-dashed border-brand-black rounded-none font-mono text-sm h-12 flex items-center justify-center gap-2 hover:bg-brand-orange/10"
                >
                  <Plus className="w-4 h-4 text-brand-black" />
                  Tambah Produk Lainnya
                </Button>
              </div>
            </div>

            {shipping_block.replace('<div className="bg-white border-4 border-brand-black mb-4">', '<div className="bg-white border-4 border-brand-black">')}
          </div>

          {/* Kanan: Pembayaran & Konfirmasi */}
          <div className="space-y-6">
            {payment_block}
"""

content = content[:header_end] + new_grid + content[confirm_start:]

# Close the new right column and grid before Customer details
content = content.replace('{/* Customer Details Modal */}', """
          </div>
        </div>
        
        {/* Product Search Dialog */}
        <Dialog open={isProductSearchOpen} onOpenChange={setIsProductSearchOpen}>
          <DialogContent className="max-w-md h-[80vh] flex flex-col p-0 rounded-none border-4 border-brand-black bg-brand-white">
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
                 ) : filteredNewProducts.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-4 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                       <div className="flex-1 min-w-0 pr-4">
                          <p className="font-bold text-sm truncate">{p.name}</p>
                          <p className="font-mono text-brand-orange font-bold text-sm">{formatCurrency(p.price)}</p>
                          {p.totalStock !== undefined && p.totalStock !== null ? (
                             <p className="font-mono text-[10px] text-muted-foreground mt-1">Sisa stok: {p.totalStock}</p>
                          ) : null}
                       </div>
                       <Button 
                         onClick={() => {
                            const cartItem = items.find(i => i.product.id === p.id);
                            if (cartItem) {
                               const maxStock = p.totalStock !== undefined && p.totalStock !== null ? Number(p.totalStock) : Infinity;
                               if (cartItem.quantity < maxStock) {
                                  updateQuantity(p.id, cartItem.quantity + 1);
                                  toast.success(`Menambahkan 1 lagi ${p.name}`);
                               } else {
                                  toast.error(`Stok ${p.name} tidak mencukupi`);
                               }
                            } else {
                               if ((p.totalStock !== undefined && p.totalStock !== null && p.totalStock <= 0)) {
                                  toast.error(`Stok ${p.name} habis`);
                               } else {
                                  addToCart(p, 1);
                                  toast.success(`${p.name} ditambahkan`);
                               }
                            }
                         }}
                         disabled={p.totalStock !== undefined && p.totalStock !== null && p.totalStock <= 0}
                         className="flex-shrink-0 bg-brand-orange text-brand-black border-2 border-brand-black rounded-none shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all w-10 h-10 p-0"
                       >
                         <Plus className="w-5 h-5" />
                       </Button>
                    </div>
                 ))}
               </div>
            </div>
            <div className="p-4 border-t-2 border-brand-black bg-white flex-shrink-0">
               <Button onClick={() => setIsProductSearchOpen(false)} className="w-full bg-brand-black text-white hover:bg-brand-black/90 font-bold rounded-none h-12">
                 Selesai ({items.length} Item)
               </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Customer Details Modal */}
""")

content = content.replace('className="max-w-lg mx-auto"', 'className="max-w-5xl mx-auto"')

# Also remove the `mb-6` from Payment method tabs wrapper since it's already spaced by `space-y-6`
content = content.replace('<div className="mb-6">\n          {hasQRIS && (', '<div className="">\n          {hasQRIS && (')

with open('src/pages/CheckoutPage.tsx', 'w') as f:
    f.write(content)

print("CheckoutPage restructured successfully.")
