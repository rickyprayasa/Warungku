const fs = require('fs');

const quantityComponent = `
function QuantityInput({ value, max, onChange }: { value: number; max?: number; onChange: (val: number) => void }) {
  const [localVal, setLocalVal] = require('react').useState<string | number>(value);
  
  require('react').useEffect(() => {
    setLocalVal(value);
  }, [value]);

  return (
    <input
      type="number"
      min={1}
      max={max}
      value={localVal}
      onChange={(e) => {
        setLocalVal(e.target.value);
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val > 0) {
          onChange(max !== undefined ? Math.min(max, val) : val);
        }
      }}
      onBlur={() => {
        const val = parseInt(String(localVal));
        if (isNaN(val) || val < 1) {
          setLocalVal(1);
          onChange(1);
        } else {
          setLocalVal(val);
        }
      }}
      className="w-10 h-8 text-center font-mono font-bold border-none bg-transparent outline-none focus:bg-brand-orange/20 p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}
`;

// CART SHEET
let cartSheet = fs.readFileSync('src/components/CartSheet.tsx', 'utf8');
const cartSheetImportIdx = cartSheet.lastIndexOf('import ');
const cartSheetEOL = cartSheet.indexOf('\n', cartSheetImportIdx);
cartSheet = cartSheet.slice(0, cartSheetEOL + 1) + quantityComponent + cartSheet.slice(cartSheetEOL + 1);

const cartSheetOldSpan = '<span className="w-8 text-center font-mono text-sm font-bold">{item.quantity}</span>';
const cartSheetNewSpan = `<QuantityInput 
                            value={item.quantity} 
                            max={item.product.totalStock !== undefined && item.product.totalStock !== null ? Number(item.product.totalStock) : undefined} 
                            onChange={(val) => updateQuantity(item.product.id, val)}
                          />`;
cartSheet = cartSheet.replace(cartSheetOldSpan, cartSheetNewSpan);
fs.writeFileSync('src/components/CartSheet.tsx', cartSheet);

// CHECKOUT PAGE
let checkoutPage = fs.readFileSync('src/pages/CheckoutPage.tsx', 'utf8');
const checkoutPageImportIdx = checkoutPage.lastIndexOf('import ');
const checkoutPageEOL = checkoutPage.indexOf('\n', checkoutPageImportIdx);
checkoutPage = checkoutPage.slice(0, checkoutPageEOL + 1) + quantityComponent + checkoutPage.slice(checkoutPageEOL + 1);

// Replace summary loop
const summaryOldSpan = '<span className="w-8 text-center font-mono font-bold">{item.quantity}</span>';
const summaryNewSpan = `<QuantityInput 
                            value={item.quantity} 
                            max={item.product.totalStock !== undefined && item.product.totalStock !== null ? Number(item.product.totalStock) : undefined} 
                            onChange={(val) => updateQuantity(item.product.id, val)}
                          />`;
checkoutPage = checkoutPage.replace(summaryOldSpan, summaryNewSpan);

// Replace modal loop (it uses qty)
const modalOldSpan = '<span className="w-8 text-center font-mono font-bold">{qty}</span>';
const modalNewSpan = `<QuantityInput 
                            value={qty} 
                            max={p.totalStock !== undefined && p.totalStock !== null ? Number(p.totalStock) : undefined} 
                            onChange={(val) => updateQuantity(p.id, val)}
                          />`;
checkoutPage = checkoutPage.replace(modalOldSpan, modalNewSpan);

fs.writeFileSync('src/pages/CheckoutPage.tsx', checkoutPage);

console.log("Replaced fixed quantity inputs with standard react component.");
