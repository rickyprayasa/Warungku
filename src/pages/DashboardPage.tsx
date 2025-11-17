import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductManagement } from "@/components/ProductManagement";
import { SalesDashboard } from "@/components/SalesDashboard";
import { PurchasesDashboard } from "@/components/PurchasesDashboard";
import { CashFlowDashboard } from "@/components/CashFlowDashboard";
import { FinanceDashboard } from "@/components/FinanceDashboard";
import { Package, ShoppingCart, DollarSign, ArrowRightLeft, Banknote } from "lucide-react";
export function DashboardPage() {
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
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 rounded-none border-2 border-brand-black p-1 h-auto bg-muted/40">
            <TabsTrigger value="products" className="rounded-none font-bold uppercase text-xs sm:text-sm data-[state=active]:bg-brand-white data-[state=active]:shadow-hard-sm"><Package className="w-4 h-4 mr-2 hidden sm:inline-block"/>Products</TabsTrigger>
            <TabsTrigger value="sales" className="rounded-none font-bold uppercase text-xs sm:text-sm data-[state=active]:bg-brand-white data-[state=active]:shadow-hard-sm"><DollarSign className="w-4 h-4 mr-2 hidden sm:inline-block"/>Sales</TabsTrigger>
            <TabsTrigger value="purchases" className="rounded-none font-bold uppercase text-xs sm:text-sm data-[state=active]:bg-brand-white data-[state=active]:shadow-hard-sm"><ShoppingCart className="w-4 h-4 mr-2 hidden sm:inline-block"/>Purchases</TabsTrigger>
            <TabsTrigger value="cashflow" className="rounded-none font-bold uppercase text-xs sm:text-sm data-[state=active]:bg-brand-white data-[state=active]:shadow-hard-sm"><ArrowRightLeft className="w-4 h-4 mr-2 hidden sm:inline-block"/>Cash Flow</TabsTrigger>
            <TabsTrigger value="finance" className="rounded-none font-bold uppercase text-xs sm:text-sm data-[state=active]:bg-brand-white data-[state=active]:shadow-hard-sm"><Banknote className="w-4 h-4 mr-2 hidden sm:inline-block"/>Finance</TabsTrigger>
          </TabsList>
          <div className="mt-4 border-4 border-brand-black bg-brand-white p-6">
            <TabsContent value="products">
              <ProductManagement />
            </TabsContent>
            <TabsContent value="sales">
              <SalesDashboard />
            </TabsContent>
            <TabsContent value="purchases">
              <PurchasesDashboard />
            </TabsContent>
            <TabsContent value="cashflow">
              <CashFlowDashboard />
            </TabsContent>
            <TabsContent value="finance">
              <FinanceDashboard />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}