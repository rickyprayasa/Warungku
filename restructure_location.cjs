const fs = require('fs');

// 1. Modify CheckoutPage.tsx
let checkout = fs.readFileSync('src/pages/CheckoutPage.tsx', 'utf8');

// The Pickup card to remove
const pickupCardStr = `<div className="w-full mt-6 bg-white border-2 border-brand-black shadow-[4px_4px_0px_0px_#000] p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-8 h-8 bg-green-400 border-l-2 border-b-2 border-brand-black flex items-center justify-center shadow-[-2px_2px_0px_0px_#000]">
                          <CheckCircle className="w-5 h-5 text-brand-black" />
                        </div>
                        <p className="text-xs uppercase font-black tracking-wider text-brand-black/60 mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Lokasi Pengambilan
                        </p>
                        <p className="font-mono text-sm font-bold text-brand-black truncate">
                          {activeStoreProfile?.name || 'Toko'}
                        </p>
                        <p className="font-mono text-xs text-brand-black/70 mt-1 line-clamp-2">
                          {activeStoreProfile?.address || '-'}
                        </p>
                        <div className="mt-3 pt-3 border-t-2 border-brand-black/10">
                          <a
                            href={(activeStoreProfile as any)?.settings?.location_lat ? \`https://www.google.com/maps?q=\${(activeStoreProfile as any)?.settings?.location_lat},\${(activeStoreProfile as any)?.settings?.location_lng}\` : \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(activeStoreProfile?.address || '')}\`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full justify-center items-center gap-1.5 text-xs font-mono font-bold text-brand-black hover:text-white bg-white hover:bg-brand-black border-2 border-brand-black px-3 py-2 transition-colors rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[3px_3px_0px_0px_#000]"
                          >
                            <MapPin className="w-3.5 h-3.5" /> Buka di Google Maps →
                          </a>
                        </div>
                      </div>`;
                      
checkout = checkout.replace(pickupCardStr, '');

// The Delivery origin block to remove
const deliveryOriginBlock = `{activeStoreProfile?.address && (
                          <div className="p-3 bg-amber-50 border-2 border-amber-200 space-y-2">
                            <p className="font-mono text-xs text-amber-700 font-bold uppercase flex items-center gap-1">
                              <Store className="w-3 h-3" />
                              Asal Pengiriman (Alamat Toko)
                            </p>
                            <p className="font-mono text-sm font-bold text-amber-900">{activeStoreProfile.address}</p>
                            {(activeStoreProfile as any)?.settings?.address_detail && (
                              <p className="font-mono text-xs text-amber-800 mt-1 bg-amber-100 px-2 py-1 border border-amber-300">
                                📌 {(activeStoreProfile as any).settings.address_detail}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              <button
                                onClick={(e) => { e.preventDefault(); setIsMapOpen(true); }}
                                className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-red-600 hover:text-red-800 bg-white border border-red-200 px-2.5 py-1.5 hover:bg-red-50 transition-colors rounded-sm shadow-sm"
                              >
                                📍 Lihat di Peta →
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (activeStoreProfile?.address) {
                                    navigator.clipboard.writeText(activeStoreProfile.address);
                                    toast.success('Alamat disalin!');
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-brand-black hover:text-brand-orange bg-white border border-gray-200 px-2.5 py-1.5 hover:bg-gray-50 transition-colors rounded-sm shadow-sm"
                              >
                                <Copy className="w-3 h-3" />
                                Salin
                              </button>
                            </div>
                          </div>
                        )}`;
                        
checkout = checkout.replace(deliveryOriginBlock, '');

// Define the new Universal Store Address block to be placed ABOVE the tabs
const universalStoreAddress = `
          {/* Universal Store Address Block */}
          {activeStoreProfile?.address && (
            <div className="p-4 bg-amber-50 border-b-2 border-brand-black shadow-[inset_0_-2px_0_0_#ebb300]">
              <div className="max-w-2xl mx-auto flex items-start gap-3">
                <div className="bg-amber-200 p-2 rounded-full mt-1 border-2 border-amber-400">
                   <Store className="w-4 h-4 text-amber-800" />
                </div>
                <div className="flex-1">
                  <p className="font-mono text-[10px] text-amber-700 font-bold uppercase mb-1">
                    Lokasi Toko
                  </p>
                  <p className="font-mono text-sm font-bold text-amber-900 leading-tight">
                    {activeStoreProfile.address}
                  </p>
                  {(activeStoreProfile as any)?.settings?.address_detail && (
                    <p className="font-mono text-xs text-amber-800 mt-1 inline-block bg-white border border-amber-200 px-2 py-0.5 rounded-sm">
                      📌 {(activeStoreProfile as any).settings.address_detail}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                     <button
                        onClick={(e) => { e.preventDefault(); setIsMapOpen(true); }}
                        className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-white bg-brand-orange hover:bg-orange-600 border border-brand-black px-2 py-1 transition-colors rounded-sm shadow-[1px_1px_0px_#000]"
                      >
                        <MapPin className="w-3 h-3" /> Cek Peta
                      </button>
                  </div>
                </div>
              </div>
            </div>
          )}
`;

// Inject universalStoreAddress below the DialogHeader
const headerEndStr = `</DialogHeader>`;
checkout = checkout.replace(headerEndStr, headerEndStr + '\n' + universalStoreAddress);

fs.writeFileSync('src/pages/CheckoutPage.tsx', checkout);


// 2. Modify MapPickerDialog.tsx
let mapDialog = fs.readFileSync('src/components/MapPickerDialog.tsx', 'utf8');

const salinButton = `<button
              onClick={handleCopyAddress}
              className="flex-1 border-2 border-brand-black bg-white hover:bg-gray-50 text-brand-black font-mono font-bold py-3 text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              SALIN ALAMAT
            </button>`;

const customMapsLink = `
            <a
               href={currentLocation ? \`https://www.google.com/maps?q=\${currentLocation.lat},\${currentLocation.lng}\` : \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(address || '')}\`}
               target="_blank"
               rel="noopener noreferrer"
               className="flex-1 border-2 border-brand-black bg-brand-orange hover:bg-orange-600 text-white font-mono font-bold py-3 text-sm transition-colors flex items-center justify-center gap-2"
            >
               <MapPin className="w-4 h-4" />
               BUKA DI GOOGLE MAPS
            </a>
`;

mapDialog = mapDialog.replace(salinButton, salinButton + '\n' + customMapsLink);
fs.writeFileSync('src/components/MapPickerDialog.tsx', mapDialog);

console.log("Replaced Checkout and MapPickerDialog successfully");
