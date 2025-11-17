import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductManagement } from "@/components/ProductManagement";
import { SalesDashboard } from "@/components/SalesDashboard";
import { PurchasesDashboard } from "@/components/PurchasesDashboard";
import { CashFlowDashboard } from "@/components/CashFlowDashboard";
import { FinanceDashboard } from "@/components/FinanceDashboard";
import { SuppliersDashboard } from "@/components/SuppliersDashboard";
import { Package, ShoppingCart, DollarSign, ArrowRightLeft, Banknote, Truck } from "lucide-react";
import { motion } from "framer-motion";
export function DashboardPage() {
  const tabContentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold text-brand-black">
            Warungku Dashboard
          </h2>
          <p className="font-mono text-muted-foreground">
            Manage your store's products, sales, and finances.
          </p>
        </div>
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-3 md:grid-cols-6 rounded-none border-2 border-brand-black p-1 h-auto bg-muted/40">
            <TabsTrigger value="products" className="rounded-none font-bold uppercase text-xs sm:text-sm data-[state=active]:bg-brand-white data-[state=active]:shadow-hard-sm"><Package className="w-4 h-4 mr-2 hidden sm:inline-block"/>Products</TabsTrigger>
            <TabsTrigger value="sales" className="rounded-none font-bold uppercase text-xs sm:text-sm data-[state=active]:bg-brand-white data-[state=active]:shadow-hard-sm"><DollarSign className="w-4 h-4 mr-2 hidden sm:inline-block"/>Sales</TabsTrigger>
            <TabsTrigger value="purchases" className="rounded-none font-bold uppercase text-xs sm:text-sm data-[state=active]:bg-brand-white data-[state=active]:shadow-hard-sm"><ShoppingCart className="w-4 h-4 mr-2 hidden sm:inline-block"/>Purchases</TabsTrigger>
            <TabsTrigger value="suppliers" className="rounded-none font-bold uppercase text-xs sm:text-sm data-[state=active]:bg-brand-white data-[state=active]:shadow-hard-sm"><Truck className="w-4 h-4 mr-2 hidden sm:inline-block"/>Suppliers</TabsTrigger>
            <TabsTrigger value="cashflow" className="rounded-none font-bold uppercase text-xs sm:text-sm data-[state=active]:bg-brand-white data-[state=active]:shadow-hard-sm"><ArrowRightLeft className="w-4 h-4 mr-2 hidden sm:inline-block"/>Cash Flow</TabsTrigger>
            <TabsTrigger value="finance" className="rounded-none font-bold uppercase text-xs sm:text-sm data-[state=active]:bg-brand-white data-[state=active]:shadow-hard-sm"><Banknote className="w-4 h-4 mr-2 hidden sm:inline-block"/>Finance</TabsTrigger>
          </TabsList>
          <div className="mt-4 border-4 border-brand-black bg-brand-white p-6 overflow-hidden">
            <TabsContent value="products" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><ProductManagement /></motion.div></TabsContent>
            <TabsContent value="sales" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><SalesDashboard /></motion.div></TabsContent>
            <TabsContent value="purchases" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><PurchasesDashboard /></motion.div></TabsContent>
            <TabsContent value="suppliers" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><SuppliersDashboard /></motion.div></TabsContent>
            <TabsContent value="cashflow" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><CashFlowDashboard /></motion.div></TabsContent>
            <TabsContent value="finance" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><FinanceDashboard /></motion.div></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}