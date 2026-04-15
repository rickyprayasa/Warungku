const fs = require('fs');
let content = fs.readFileSync('src/pages/CheckoutPage.tsx', 'utf8');

// Find the modal interior
const modalStart = content.indexOf('<DialogHeader className="p-4 border-b-2 border-brand-black bg-brand-light-orange/20 flex-shrink-0">');
// Find the div wrapper
const wrapperStartStr = '<div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">';
const wrapperStartIdx = content.indexOf(wrapperStartStr, modalStart);
const wrapperEndIdx = content.indexOf('          <div className="p-4 border-t-2 border-brand-black bg-white flex-shrink-0 space-y-3">', wrapperStartIdx);

let oldWrapper = content.substring(wrapperStartIdx, wrapperEndIdx);

// It contains two buttons initially: 'Ambil Sendiri' and 'Kirim ke Alamat'
// and the condition: `{shippingMethod === 'delivery' && (`
const pickupStr = '{/* Pickup Option */}';
const targetConditionId = "{shippingMethod === 'delivery' && (";

const pickupIdx = oldWrapper.indexOf(pickupStr);
const conditionIdx = oldWrapper.indexOf(targetConditionId);

const buttonsBlock = oldWrapper.slice(pickupIdx, conditionIdx).trim();
const conditionBlock = oldWrapper.slice(conditionIdx, oldWrapper.lastIndexOf('</div>')).trim();

const newLandscapeWrapper = `
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 h-full bg-white overflow-hidden">
            {/* Left Column: Selection */}
            <div className="p-4 space-y-4 overflow-y-auto border-r-2 border-brand-black/10">
              <h4 className="font-mono font-bold text-sm text-brand-black mb-2 uppercase">Pilih Opsi</h4>
              ${buttonsBlock}
            </div>
            
            {/* Right Column: Configuration Details */}
            <div className="p-4 overflow-y-auto">
              {shippingMethod === 'pickup' ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 p-8 text-muted-foreground border-2 border-dashed border-brand-black/20">
                  <Store className="w-16 h-16 text-brand-orange opacity-50" />
                  <div>
                    <h4 className="font-bold text-lg text-brand-black">Pesanan Diambil</h4>
                    <p className="font-mono text-sm mt-1">Silakan datang ke toko untuk mengambil pesanan Anda.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-mono font-bold text-sm text-brand-black mb-2 uppercase">Detail Pengiriman</h4>
                  ${conditionBlock}
                </div>
              )}
            </div>
          </div>
`;

content = content.replace(oldWrapper, newLandscapeWrapper);
fs.writeFileSync('src/pages/CheckoutPage.tsx', content);

console.log("Successfully ran landscape restructure");
