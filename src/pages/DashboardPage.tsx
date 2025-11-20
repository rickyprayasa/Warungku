import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductManagement } from "@/components/ProductManagement";
import { SalesDashboard } from "@/components/SalesDashboard";
import { PurchasesDashboard } from "@/components/PurchasesDashboard";
import { CashFlowDashboard } from "@/components/CashFlowDashboard";
import { FinanceDashboard } from "@/components/FinanceDashboard";
import { SuppliersDashboard } from "@/components/SuppliersDashboard";
import { JajananRequestsDashboard } from "@/components/JajananRequestsDashboard";
import { ProductStockTable } from "@/components/ProductStockTable";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Package, ShoppingCart, DollarSign, ArrowRightLeft, Banknote, Truck, Inbox, Warehouse } from "lucide-react";
import { motion, Variants } from "framer-motion";

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState("products");

  const tabContentVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeInOut" } },
  };

  const tabs = [
    { value: "products", label: "Produk", icon: Package },
    { value: "inventory", label: "Inventori", icon: Warehouse },
    { value: "sales", label: "Penjualan", icon: DollarSign },
    { value: "purchases", label: "Pembelian", icon: ShoppingCart },
    { value: "suppliers", label: "Pemasok", icon: Truck },
    { value: "requests", label: "Request Masuk", icon: Inbox },
    { value: "cashflow", label: "Arus Kas", icon: ArrowRightLeft },
    { value: "finance", label: "Keuangan", icon: Banknote },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 md:pb-0">
      <div className="py-8 md:py-10 lg:py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold text-brand-black">
            Dasbor Warungku
          </h2>
          <p className="font-mono text-muted-foreground">
            Kelola produk, penjualan, dan keuangan toko Anda.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Desktop/Tablet Tabs - Hidden on Mobile */}
          <TabsList className="hidden md:grid w-full grid-cols-4 md:grid-cols-8 rounded-none border-2 border-brand-black p-1 h-auto bg-muted/40">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none font-bold uppercase text-xs sm:text-sm data-[state=active]:bg-brand-white data-[state=active]:shadow-hard-sm"
              >
                <tab.icon className="w-4 h-4 mr-2 hidden sm:inline-block" />{tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4 border-4 border-brand-black bg-brand-white p-4 md:p-6 overflow-hidden">
            <TabsContent value="products" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><ProductManagement /></motion.div></TabsContent>
            <TabsContent value="inventory" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><ProductStockTable /></motion.div></TabsContent>
            <TabsContent value="sales" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><SalesDashboard /></motion.div></TabsContent>
            <TabsContent value="purchases" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><PurchasesDashboard /></motion.div></TabsContent>
            <TabsContent value="suppliers" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><SuppliersDashboard /></motion.div></TabsContent>
            <TabsContent value="requests" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><JajananRequestsDashboard /></motion.div></TabsContent>
            <TabsContent value="cashflow" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><CashFlowDashboard /></motion.div></TabsContent>
            <TabsContent value="finance" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><FinanceDashboard /></motion.div></TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}