const fs = require('fs');

let content = fs.readFileSync('src/pages/CheckoutPage.tsx', 'utf8');

// Find the modal wrapper
const modalStartStr = '<DialogContent className="sm:max-w-4xl h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col p-0 rounded-none border-4 border-brand-black bg-brand-white">';
const modalStart = content.indexOf(modalStartStr);

const wrapperStartStr = '<div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-4 h-full bg-white overflow-hidden">';
const wrapperStartIdx = content.indexOf(wrapperStartStr, modalStart);
const wrapperEndIdx = content.indexOf('<div className="p-4 border-t-2 border-brand-black bg-white flex-shrink-0 space-y-3">', wrapperStartIdx);

if (wrapperStartIdx === -1 || wrapperEndIdx === -1) {
    console.error("Could not find wrappers!");
    process.exit(1);
}

const oldWrapper = content.substring(wrapperStartIdx, wrapperEndIdx);

// Extract the condition block for Delivery (address, courier etc.)
const deliveryStartId = "{shippingMethod === 'delivery' && (";
const dStartIdx = oldWrapper.indexOf(deliveryStartId);
const deliveryUI = oldWrapper.substring(dStartIdx, oldWrapper.lastIndexOf('</div>', oldWrapper.lastIndexOf('</div>', oldWrapper.lastIndexOf('</div>') - 1) - 1)).trim();

// Because the old structure had wrapping divs, let's just write the new UI cleanly:
const newTabWrapper = `
          <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
            
            {/* Top Toggle Switch */}
            <div className="p-4 border-b-2 border-brand-black bg-gray-50 flex-shrink-0 z-10">
              <div className="relative flex w-full h-14 bg-white border-2 border-brand-black shadow-[3px_3px_0px_0px_#000] p-1">
                {/* Animated Indicator */}
                <motion.div
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-brand-orange border-2 border-brand-black shadow-[2px_2px_0px_0px_#000]"
                  initial={false}
                  animate={{ x: shippingMethod === 'pickup' ? 0 : '100%' }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                
                {/* Tab: Ambil Sendiri */}
                <button
                  onClick={() => { setShippingMethod('pickup'); setShippingCost(0); }}
                  className={\`relative flex-1 flex items-center justify-center gap-2 font-mono font-bold text-sm z-10 transition-colors \${shippingMethod === 'pickup' ? 'text-white' : 'text-brand-black hover:text-brand-orange'}\`}
                >
                  <Store className="w-4 h-4" /> Ambil Sendiri
                </button>
                
                {/* Tab: Kirim ke Alamat */}
                <button
                  onClick={() => setShippingMethod('delivery')}
                  className={\`relative flex-1 flex items-center justify-center gap-2 font-mono font-bold text-sm z-10 transition-colors \${shippingMethod === 'delivery' ? 'text-white' : 'text-brand-black hover:text-brand-orange'}\`}
                >
                  <Truck className="w-4 h-4" /> Kirim ke Alamat
                </button>
              </div>
            </div>

            {/* Middle Content Area */}
            <div className="flex-1 overflow-y-auto p-0 relative bg-white">
              <AnimatePresence mode="wait">
                {shippingMethod === 'pickup' ? (
                  <motion.div 
                    key="pickup" 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.98 }} 
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-4 p-8 text-muted-foreground"
                  >
                    <div className="w-24 h-24 bg-brand-orange/10 border-4 border-brand-orange rounded-full flex items-center justify-center mb-2">
                       <Store className="w-10 h-10 text-brand-orange" />
                    </div>
                    <div>
                      <h4 className="font-bold text-2xl text-brand-black font-display">Pesanan Diambil Sendiri</h4>
                      <p className="font-mono text-sm mt-3 text-brand-black/70 max-w-sm mx-auto">Silakan datang langsung ke toko untuk mengambil pesanan Anda tanpa biaya pengiriman tambahan.</p>
                      
                      <div className="mt-8 bg-green-50 border-2 border-green-200 text-green-700 px-6 py-3 font-mono font-bold inline-flex items-center gap-2">
                         <CheckCircle className="w-5 h-5" /> Gratis Ongkir
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="delivery" 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.98 }} 
                    transition={{ duration: 0.2 }}
                    className="p-6 space-y-6"
                  >
                    <div className="flex items-center gap-2 border-b-2 border-brand-black pb-3">
                       <Truck className="w-5 h-5 text-brand-orange" />
                       <h4 className="font-mono font-bold text-lg text-brand-black uppercase">Rincian Pengiriman</h4>
                    </div>
                    ${deliveryUI}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
`;

content = content.replace(oldWrapper, newTabWrapper);
// Make the dialog smaller since a 2-col layout is gone
content = content.replace('sm:max-w-4xl h-[90vh]', 'sm:max-w-2xl h-[90vh]');

fs.writeFileSync('src/pages/CheckoutPage.tsx', content);

console.log("Successfully rebuilt modal tabs");
