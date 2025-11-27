import{c as t}from"./index-DbPHQXkr.js";import{p as e,c as i,i as r}from"./store-B6Itjs8y.js";import{i as a}from"./utils-BbbCNVls.js";
/**
 * @license lucide-react v0.525.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o=t("circle-alert",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"12",x2:"12",y1:"8",y2:"12",key:"1pkeuh"}],["line",{x1:"12",x2:"12.01",y1:"16",y2:"16",key:"4dfq90"}]]),s=a()(e(r((t,e)=>({items:[],isCartOpen:!1,addToCart:(e,i=1)=>{t(t=>{const r=t.items.find(t=>t.product.id===e.id);r?r.quantity+=i:t.items.push({product:e,quantity:i})})},removeFromCart:e=>{t(t=>{t.items=t.items.filter(t=>t.product.id!==e)})},updateQuantity:(e,i)=>{t(t=>{const r=t.items.find(t=>t.product.id===e);r&&(i<=0?t.items=t.items.filter(t=>t.product.id!==e):r.quantity=i)})},clearCart:()=>{t(t=>{t.items=[]})},openCart:()=>{t(t=>{t.isCartOpen=!0})},closeCart:()=>{t(t=>{t.isCartOpen=!1})},toggleCart:()=>{t(t=>{t.isCartOpen=!t.isCartOpen})},getTotal:()=>e().items.reduce((t,e)=>t+(e.product.isPromo&&e.product.promoPrice?e.product.promoPrice:e.product.price)*e.quantity,0),getItemCount:()=>e().items.reduce((t,e)=>t+e.quantity,0)})),{name:"warung-cart",storage:i(()=>localStorage),partialize:t=>({items:t.items})}));export{o as C,s as u};
