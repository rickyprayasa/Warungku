import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProductManagement } from "@/components/ProductManagement";
import { SalesDashboard } from "@/components/SalesDashboard";
import { PurchasesDashboard } from "@/components/PurchasesDashboard";
import { CashFlowDashboard } from "@/components/CashFlowDashboard";
import { FinanceDashboard } from "@/components/FinanceDashboard";
import { SuppliersDashboard } from "@/components/SuppliersDashboard";
import { JajananRequestsDashboard } from "@/components/JajananRequestsDashboard";
import { OpnameDashboard } from "@/components/OpnameDashboard";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { Package, ShoppingCart, DollarSign, ArrowRightLeft, Banknote, Truck, Inbox, Warehouse, ClipboardCheck, BarChart3 } from "lucide-react";
import { motion, Variants } from "framer-motion";

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "products";
  const [activeTab, setActiveTab] = useState(initialTab);

  const tabContentVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeInOut" } },
  };

  // Sync state with URL param
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  // Listen for tab change events from notifications (legacy support)
  useEffect(() => {
    const handleTabChangeCustom = (event: CustomEvent<string>) => {
      handleTabChange(event.detail);
    };

    window.addEventListener('changeTab', handleTabChangeCustom as EventListener);
    return () => window.removeEventListener('changeTab', handleTabChangeCustom as EventListener);
  }, []);

  const tabs = [
    { value: "analytics", label: "Analytics", icon: BarChart3, color: "orange" },
    { value: "products", label: "Produk & Stok", icon: Package, color: "emerald" },
    { value: "opname", label: "Rekon Kas", icon: ClipboardCheck, color: "purple" },
    { value: "sales", label: "Penjualan", icon: DollarSign, color: "blue" },
    { value: "purchases", label: "Pembelian", icon: ShoppingCart, color: "indigo" },
    { value: "suppliers", label: "Pemasok", icon: Truck, color: "cyan" },
    { value: "requests", label: "Request Masuk", icon: Inbox, color: "pink" },
    { value: "cashflow", label: "Arus Kas", icon: ArrowRightLeft, color: "violet" },
    { value: "finance", label: "Keuangan", icon: Banknote, color: "green" },
  ];

  const getTabStyles = (tabValue: string, isActive: boolean) => {
    const tab = tabs.find(t => t.value === tabValue);
    if (!tab) return "";

    const colorMap: Record<string, { bg: string; hover: string; activeBg: string; activeText: string; border: string }> = {
      orange: {
        bg: "bg-orange-50",
        hover: "hover:bg-orange-100 hover:border-orange-500",
        activeBg: "bg-orange-500",
        activeText: "text-white",
        border: "border-orange-600"
      },
      emerald: {
        bg: "bg-emerald-50",
        hover: "hover:bg-emerald-100 hover:border-emerald-500",
        activeBg: "bg-emerald-500",
        activeText: "text-white",
        border: "border-emerald-600"
      },
      amber: {
        bg: "bg-amber-50",
        hover: "hover:bg-amber-100 hover:border-amber-500",
        activeBg: "bg-amber-500",
        activeText: "text-white",
        border: "border-amber-600"
      },
      purple: {
        bg: "bg-purple-50",
        hover: "hover:bg-purple-100 hover:border-purple-500",
        activeBg: "bg-purple-500",
        activeText: "text-white",
        border: "border-purple-600"
      },
      blue: {
        bg: "bg-blue-50",
        hover: "hover:bg-blue-100 hover:border-blue-500",
        activeBg: "bg-blue-500",
        activeText: "text-white",
        border: "border-blue-600"
      },
      indigo: {
        bg: "bg-indigo-50",
        hover: "hover:bg-indigo-100 hover:border-indigo-500",
        activeBg: "bg-indigo-500",
        activeText: "text-white",
        border: "border-indigo-600"
      },
      cyan: {
        bg: "bg-cyan-50",
        hover: "hover:bg-cyan-100 hover:border-cyan-500",
        activeBg: "bg-cyan-500",
        activeText: "text-white",
        border: "border-cyan-600"
      },
      pink: {
        bg: "bg-pink-50",
        hover: "hover:bg-pink-100 hover:border-pink-500",
        activeBg: "bg-pink-500",
        activeText: "text-white",
        border: "border-pink-600"
      },
      violet: {
        bg: "bg-violet-50",
        hover: "hover:bg-violet-100 hover:border-violet-500",
        activeBg: "bg-violet-500",
        activeText: "text-white",
        border: "border-violet-600"
      },
      green: {
        bg: "bg-green-50",
        hover: "hover:bg-green-100 hover:border-green-500",
        activeBg: "bg-green-500",
        activeText: "text-white",
        border: "border-green-600"
      },
    };

    const colors = colorMap[tab.color];

    if (isActive) {
      return `${colors.activeBg} ${colors.activeText} border-2 ${colors.border} shadow-hard-sm`;
    }

    return `${colors.bg} ${colors.hover} border-2 border-transparent transition-all duration-200`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-0">
      <div className="py-8 md:py-10 lg:py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold text-brand-black">
            Dasbor Warungku
          </h2>
          <p className="font-mono text-muted-foreground">
            Kelola produk, penjualan, dan keuangan toko Anda.
          </p>
        </div>

        {/* Desktop/Tablet Tabs - Hidden on Mobile */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          {/* TabsList removed as navigation is now in Sidebar */}

          <div>
            <TabsContent value="analytics" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><AnalyticsDashboard /></motion.div></TabsContent>
            <TabsContent value="products" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><ProductManagement /></motion.div></TabsContent>
            <TabsContent value="opname" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><OpnameDashboard /></motion.div></TabsContent>
            <TabsContent value="sales" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><SalesDashboard /></motion.div></TabsContent>
            <TabsContent value="purchases" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><PurchasesDashboard /></motion.div></TabsContent>
            <TabsContent value="suppliers" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><SuppliersDashboard /></motion.div></TabsContent>
            <TabsContent value="requests" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><JajananRequestsDashboard /></motion.div></TabsContent>
            <TabsContent value="cashflow" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><CashFlowDashboard /></motion.div></TabsContent>
            <TabsContent value="finance" asChild><motion.div initial="hidden" animate="visible" variants={tabContentVariants}><FinanceDashboard /></motion.div></TabsContent>
          </div>
        </Tabs>
      </div>
    </div >
  );
}