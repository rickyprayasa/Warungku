const fs = require('fs');

let content = fs.readFileSync('src/pages/CheckoutPage.tsx', 'utf8');

// Add the state var
const stateInjectionPoint = "const [isMapOpen, setIsMapOpen] = useState(false);";
content = content.replace(stateInjectionPoint, stateInjectionPoint + "\n  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);");

const startBlock = "{/* Shipping Method Section */}";
const startIdx = content.indexOf(startBlock);
const endIdx = content.indexOf('</div>\n            </div>\n\n\n          </div>', startIdx);
const stringToReplace = content.substring(startIdx, endIdx + 29); // + length of the ending sequence to drop the closing tags

const extractedBlock = stringToReplace
  .replace('{/* Shipping Method Section */}\n            <div className="bg-white border-4 border-brand-black mb-4">\n              <div className="p-3 border-b-2 border-brand-black bg-gray-50">\n                <h3 className="font-mono font-bold text-sm uppercase flex items-center gap-2">\n                  <Truck className="w-4 h-4" />\n                  Metode Pengiriman\n                </h3>\n              </div>\n              <div className="p-4 space-y-3">', '')
  .slice(0, -38); // remove the trailing `</div></div>` roughly

const summaryBlock = `            {/* Shipping Method Section Summary */}
            <div className="bg-white border-4 border-brand-black mb-4">
              <div className="p-3 border-b-2 border-brand-black bg-gray-50 flex justify-between items-center">
                <h3 className="font-mono font-bold text-sm uppercase flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Metode Pengiriman
                </h3>
                <button
                  type="button"
                  onClick={() => setIsShippingModalOpen(true)}
                  className="text-xs font-mono font-bold text-brand-black hover:bg-brand-orange hover:text-white transition-colors px-3 py-1.5 border-2 border-brand-black bg-white shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                >
                  UBAH
                </button>
              </div>
              <div className="p-4">
                {shippingMethod === 'pickup' ? (
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 flex flex-shrink-0 items-center justify-center border-2 border-brand-black bg-brand-orange text-white">
                        <Store className="w-5 h-5" />
                     </div>
                     <div>
                        <p className="font-mono font-bold text-sm">Ambil Sendiri</p>
                        <p className="font-mono text-xs text-muted-foreground">Gratis</p>
                     </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 relative overflow-hidden">
                     <div className="w-10 h-10 flex flex-shrink-0 items-center justify-center border-2 border-brand-black bg-brand-orange text-white">
                        <Truck className="w-5 h-5" />
                     </div>
                     <div className="flex-1 min-w-0 pr-4">
                        <p className="font-mono font-bold text-sm truncate">Kirim ke Alamat {selectedCourier ? \`(\${selectedCourier})\` : ''}</p>
                        <p className="font-mono text-xs text-muted-foreground truncate">{customerAddress || 'Alamat belum diatur'}</p>
                     </div>
                     <span className="font-mono font-bold text-sm text-brand-orange flex-shrink-0 pl-2">
                        {formatCurrency(shippingCost)}
                     </span>
                  </div>
                )}
              </div>
            </div>`;

content = content.replace(stringToReplace, summaryBlock);

const modalBlock = `
      {/* Shipping Method Modal Dialog */}
      <Dialog open={isShippingModalOpen} onOpenChange={setIsShippingModalOpen}>
        <DialogContent className="sm:max-w-md h-[90vh] sm:h-auto sm:max-h-[85vh] flex flex-col p-0 rounded-none border-4 border-brand-black bg-brand-white">
          <DialogHeader className="p-4 border-b-2 border-brand-black bg-brand-light-orange/20 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold font-display">
              <Truck className="w-6 h-6" />
              Metode Pengiriman
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            ${extractedBlock}
          </div>
          <div className="p-4 border-t-2 border-brand-black bg-white flex-shrink-0 space-y-3">
            <Button type="button" onClick={() => setIsShippingModalOpen(false)} className="w-full bg-brand-black text-white hover:bg-brand-black/90 font-bold rounded-none h-12 uppercase">
              Simpan Pengiriman
            </Button>
          </div>
        </DialogContent>
      </Dialog>
`;

content = content.replace('{/* Read-Only Map Picker Modal */}', modalBlock + '\n      {/* Read-Only Map Picker Modal */}');

fs.writeFileSync('src/pages/CheckoutPage.tsx', content);

console.log("Successfully ran restructure");
