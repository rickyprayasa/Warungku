import { useWarungStore } from "@/lib/store";
import { OnboardingTour } from '@/components/OnboardingTour';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Landmark, PiggyBank, FileText, Percent, Wallet, Download, ShoppingCart, TrendingUp, TrendingDown, Minus, Package } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useShallow } from "zustand/react/shallow";
import { FinancialChart } from "./FinancialChart";
import { exportToCSV } from "@/lib/csv-export";
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { toast } from 'sonner';
import { CardGridSkeleton, FormSkeleton } from '@/components/ui/skeleton';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type PeriodFilter = 'today' | '7d' | '30d' | 'all' | 'custom';

const PERIOD_OPTIONS: { key: PeriodFilter; label: string }[] = [
  { key: 'today', label: 'Hari Ini' },
  { key: '7d', label: '7 Hari' },
  { key: '30d', label: '30 Hari' },
  { key: 'all', label: 'Semua' },
  { key: 'custom', label: 'Custom' },
];

function getStartDate(period: PeriodFilter): Date | null {
  const now = new Date();
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case 'all':
      return null;
  }
}

export function FinanceDashboard({ isActive }: { isActive?: boolean }) {
  const { sales, initialBalance, setInitialBalance, purchases, products, reconciliations, isLoading, storeProfile } = useWarungStore(
    useShallow((state) => ({
      sales: state.sales,
      initialBalance: state.initialBalance,
      setInitialBalance: state.setInitialBalance,
      purchases: state.purchases,
      products: state.products,
      reconciliations: state.reconciliations,
      isLoading: state.isLoading,
      storeProfile: state.storeProfile,
    }))
  );

  const [balanceInput, setBalanceInput] = useState(initialBalance.toString());
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  // ──────── Filtered Data ────────
  const { filteredSales, filteredPurchases } = useMemo(() => {
    let start: Date | null = null;
    let end: Date | null = null;

    if (period === 'custom') {
      start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
    } else {
      start = getStartDate(period);
    }

    if (!start && !end) return { filteredSales: sales, filteredPurchases: purchases };

    return {
      filteredSales: sales.filter(s => {
        const d = new Date(s.createdAt);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      }),
      filteredPurchases: purchases.filter(p => {
        const d = new Date(p.createdAt);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      }),
    };
  }, [sales, purchases, period, customStartDate, customEndDate]);

  // ──────── Core Calculations ────────
  const {
    grossRevenue, cogs, netProfit, profitMargin,
    totalTransactions, totalPurchaseSpend,
    cashOnHand, monthlyData, topProducts,
    // P&L breakdown
    totalDiscount,
    netRevenue, totalExpenses,
  } = useMemo(() => {
    // Revenue & profit
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCogs = filteredSales.reduce((sum, sale) =>
      sum + sale.items.reduce((itemSum, item) => itemSum + (item.cost * item.quantity), 0),
      0);
    const net = totalRevenue - totalCogs;
    const margin = totalRevenue > 0 ? (net / totalRevenue) * 100 : 0;

    // Purchases
    const purchaseSpend = filteredPurchases.reduce((sum, p) => sum + p.totalCost, 0);

    // Discount: difference between normal price and actual sale price (promo)
    const discount = filteredSales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.productId);
        if (product && product.is_promo && product.promo_price !== null && product.promo_price !== undefined) {
          return itemSum + ((product.price - product.promo_price) * item.quantity);
        }
        return itemSum;
      }, 0);
    }, 0);

    const netRev = totalRevenue; // Revenue already uses sale price
    const expenses = totalCogs + purchaseSpend;

    // Cash on hand (Uses latest Physical Cash Reconciliation)
    const latestRecon = [...reconciliations]
      .filter(r => r.actualCash > 0)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    let cash = 0;
    if (latestRecon) {
      // Add only COMPLETED sales since latest physical reconciliation
      const salesSinceRecon = sales
        .filter(s => s.createdAt > latestRecon.createdAt && s.status !== 'pending')
        .reduce((sum, s) => sum + s.total, 0);

      // Subtract purchases since reconciliation
      const purchasesSinceRecon = purchases
        .filter(p => new Date(p.createdAt).getTime() > latestRecon.createdAt)
        .reduce((sum, p) => sum + p.totalCost, 0);

      cash = latestRecon.actualCash + salesSinceRecon - purchasesSinceRecon;
    } else {
      // Fallback if no reconciliation exists
      const allCompletedRevenue = sales.filter(s => s.status !== 'pending').reduce((sum, s) => sum + s.total, 0);
      const allPurchases = purchases.reduce((sum, p) => sum + p.totalCost, 0);
      cash = initialBalance + allCompletedRevenue - allPurchases;
    }

    // Monthly chart data (always show all months for context)
    const monthlyAggregates: { [key: string]: { revenue: number; profit: number; purchases: number } } = {};

    // Helper: safely extract yyyy-MM from a date string
    const safeMonth = (dateStr: string): string | null => {
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        return format(d, 'yyyy-MM');
      } catch { return null; }
    };

    // Add sales data
    filteredSales.forEach(sale => {
      const month = safeMonth(sale.createdAt);
      if (!month) return; // Skip invalid dates
      if (!monthlyAggregates[month]) {
        monthlyAggregates[month] = { revenue: 0, profit: 0, purchases: 0 };
      }
      const saleProfit = sale.total - sale.items.reduce((sum, item) => sum + item.cost * item.quantity, 0);
      monthlyAggregates[month].revenue += sale.total;
      monthlyAggregates[month].profit += saleProfit;
    });

    // Add purchases data
    filteredPurchases.forEach(purchase => {
      const month = safeMonth(purchase.created_at);
      if (!month) return; // Skip invalid dates
      if (!monthlyAggregates[month]) {
        monthlyAggregates[month] = { revenue: 0, profit: 0, purchases: 0 };
      }
      monthlyAggregates[month].purchases += purchase.totalCost;
    });

    const chartData = Object.entries(monthlyAggregates)
      .sort(([a], [b]) => a.localeCompare(b)) // Sort by yyyy-MM key
      .map(([month, data]) => {
        try {
          return { name: format(new Date(`${month}-01T00:00:00`), 'MMM yy', { locale: localeId }), ...data };
        } catch {
          return { name: month, ...data };
        }
      });

    // Top selling products
    const productSales: { [key: string]: { name: string; qty: number; revenue: number; profit: number } } = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const key = item.productName || item.productId;
        if (!productSales[key]) {
          productSales[key] = { name: item.productName, qty: 0, revenue: 0, profit: 0 };
        }
        productSales[key].qty += item.quantity;
        productSales[key].revenue += item.price * item.quantity;
        productSales[key].profit += (item.price - item.cost) * item.quantity;
      });
    });

    const topProds = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      grossRevenue: totalRevenue,
      cogs: totalCogs,
      netProfit: net,
      profitMargin: margin,
      totalTransactions: filteredSales.length,
      totalPurchaseSpend: purchaseSpend,
      cashOnHand: cash,
      monthlyData: chartData,
      topProducts: topProds,
      totalDiscount: discount,
      netRevenue: netRev,
      totalExpenses: expenses,
    };
  }, [filteredSales, filteredPurchases, products, sales, purchases, initialBalance, reconciliations]);

  // ──────── Helpers ────────
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const formatCompact = (value: number) => {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
    return value.toString();
  };

  const handleSetBalance = async () => {
    const newBalance = parseFloat(balanceInput);
    if (!isNaN(newBalance)) {
      try {
        await setInitialBalance(newBalance);
        toast.success('Saldo awal berhasil diperbarui!');
      } catch (error) {
        toast.error('Gagal menyimpan saldo awal. Silakan coba lagi.');
        console.error('Failed to set initial balance:', error);
      }
    } else {
      toast.error('Masukkan jumlah yang valid');
    }
  };

  const handleExport = () => {
    const periodLabel = PERIOD_OPTIONS.find(p => p.key === period)?.label || 'Semua';
    const dataToExport = [
      { metric: `LAPORAN KEUANGAN (${periodLabel})`, value: '' },
      { metric: '', value: '' },
      { metric: 'PENDAPATAN', value: '' },
      { metric: 'Penjualan Kotor', value: grossRevenue },
      { metric: 'Diskon/Promo', value: totalDiscount },
      { metric: 'Pendapatan Bersih', value: netRevenue },
      { metric: '', value: '' },
      { metric: 'BIAYA', value: '' },
      { metric: 'Harga Pokok Penjualan (HPP)', value: cogs },
      { metric: 'Pembelian Stok', value: totalPurchaseSpend },
      { metric: 'Total Biaya', value: totalExpenses },
      { metric: '', value: '' },
      { metric: 'RINGKASAN', value: '' },
      { metric: 'Laba Bersih', value: netProfit },
      { metric: 'Margin Laba (%)', value: profitMargin.toFixed(2) },
      { metric: 'Total Transaksi', value: totalTransactions },
      { metric: '', value: '' },
      { metric: 'KAS', value: '' },
      { metric: 'Saldo Awal', value: initialBalance },
      { metric: 'Total Pendapatan (Semua)', value: sales.reduce((s, sale) => s + sale.total, 0) },
      { metric: 'Total Pembelian (Semua)', value: purchases.reduce((s, p) => s + p.totalCost, 0) },
      { metric: 'Kas di Tangan', value: cashOnHand },
      { metric: '', value: '' },
      { metric: 'PRODUK TERLARIS', value: '' },
      ...topProducts.map((p, i) => ({
        metric: `${i + 1}. ${p.name}`,
        value: `Qty: ${p.qty} | Pendapatan: ${p.revenue} | Profit: ${p.profit}`,
      })),
    ];
    exportToCSV(dataToExport, `laporan_keuangan_${period}_${format(new Date(), 'yyyyMMdd')}`);
    toast.success('Laporan CSV berhasil diekspor!');
  };

  const generatePDF = async () => {
    const doc = new jsPDF();
    const periodLabel = PERIOD_OPTIONS.find(p => p.key === period)?.label || 'Semua';
    let periodText = periodLabel;
    if (period === 'custom') {
      periodText = `${format(new Date(customStartDate), 'dd MMM yyyy', { locale: localeId })} s/d ${format(new Date(customEndDate), 'dd MMM yyyy', { locale: localeId })}`;
    }

    // Load Logo Asynchronously
    let logoImg: HTMLImageElement | null = null;
    const logoSrc = storeProfile?.logoUrl || '/omzetin.png';
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = logoSrc;
      await new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = reject;
      });
      logoImg = img;
    } catch (e) {
      console.warn('Failed to load logo for PDF', e);
    }

    const renderHeader = (pageTitle: string) => {
      let currentX = 14;
      if (logoImg && logoImg.width > 0) {
        doc.addImage(logoImg, 'PNG', 14, 14, 12, 12);
        currentX = 30;
      }

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(storeProfile?.name?.toUpperCase() || 'WARUNGKU', currentX, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(pageTitle, currentX, 26);

      // Add separator line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(14, 30, 196, 30);
    };

    // Page 1 Header
    renderHeader('LAPORAN KEUANGAN FINANSIAL');

    // Period & Details
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.text(`Periode: ${periodText}`, 14, 38);
    doc.text(`Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: localeId })}`, 14, 43);

    // Kinerja & Laba Rugi
    autoTable(doc, {
      startY: 50,
      head: [['Keterangan', 'Jumlah (Rp)']],
      body: [
        ['PENDAPATAN', ''],
        ['Penjualan Kotor', formatCurrency(grossRevenue)],
        ['Diskon/Promo', `-${formatCurrency(totalDiscount)}`],
        ['Pendapatan Bersih', formatCurrency(netRevenue)],
        ['', ''],
        ['BIAYA', ''],
        ['Harga Pokok Penjualan (HPP)', formatCurrency(cogs)],
        ['Pembelian Stok', formatCurrency(totalPurchaseSpend)],
        ['Total Biaya', formatCurrency(totalExpenses)],
        ['', ''],
        ['RINGKASAN LABA', ''],
        ['Laba Bersih', formatCurrency(netProfit)],
        ['Margin Laba', `${profitMargin.toFixed(2)}%`],
      ],
      theme: 'striped',
      styles: { fontSize: 10, halign: 'left', cellPadding: 3 },
      headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255] }, // brand-orange
      columnStyles: { 1: { halign: 'right' } },
      didParseCell: (data) => {
        if (['PENDAPATAN', 'BIAYA', 'RINGKASAN LABA'].includes(data.cell.raw as string)) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [0, 0, 0];
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    // Page 2: Informasi Tambahan
    doc.addPage();

    // Page 2 Header
    renderHeader('INFORMASI TAMBAHAN');

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Transaksi: ${totalTransactions.toString()}`, 14, 38);

    // Produk Terlaris
    autoTable(doc, {
      startY: 45,
      head: [['#', 'Produk Terlaris (Top 5)', 'Terjual', 'Pendapatan', 'Profit']],
      body: topProducts.map((p, i) => [
        i + 1,
        p.name,
        p.qty,
        formatCurrency(p.revenue),
        formatCurrency(p.profit)
      ]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    });

    // Cash Summary
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Posisi Kas']],
      body: [
        [`Kas di Tangan: ${formatCurrency(cashOnHand)}`],
        [`Saldo Awal (Modal): ${formatCurrency(initialBalance)}`]
      ],
      theme: 'plain',
      headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255] },
      styles: { fontSize: 10, fontStyle: 'bold' }
    });

    return doc;
  };

  const handleExportPDF = async () => {
    try {
      const loadingToast = toast.loading('Membuat PDF...');
      const doc = await generatePDF();
      const blobUrl = URL.createObjectURL(doc.output('blob')) + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH';
      setPdfPreviewUrl(blobUrl);
      setPdfPreviewOpen(true);
      toast.dismiss(loadingToast);
    } catch (e) {
      toast.error('Gagal membuat PDF');
    }
  };

  // ──────── Onboarding Tour ────────
  const financeTourSteps = [
    {
      element: '#tour-finance-summary',
      popover: {
        title: 'Ringkasan Keuangan',
        description: 'Pantau HPP, laba bersih, dan margin keuntungan warung Anda secara real-time.',
        side: 'bottom',
        align: 'center'
      }
    },
    {
      element: '#tour-finance-balance',
      popover: {
        title: 'Saldo Awal',
        description: 'Atur saldo awal kas untuk memulai perhitungan arus kas harian.',
        side: 'top',
        align: 'start'
      }
    },
    {
      element: '#tour-finance-export',
      popover: {
        title: 'Ekspor Laporan',
        description: 'Unduh laporan keuangan lengkap untuk pembukuan bulanan.',
        side: 'bottom',
        align: 'end'
      }
    }
  ];

  // ──────── KPI Data ────────
  const kpiData = [
    { title: "Pendapatan Kotor", value: formatCurrency(grossRevenue), icon: PiggyBank, color: "text-brand-orange" },
    { title: "HPP", value: formatCurrency(cogs), icon: FileText, color: "text-brand-orange" },
    { title: "Laba Bersih", value: formatCurrency(netProfit), icon: Landmark, color: netProfit >= 0 ? "text-green-600" : "text-red-600" },
    { title: "Margin Laba", value: `${profitMargin.toFixed(2)}%`, icon: Percent, color: profitMargin >= 20 ? "text-green-600" : profitMargin >= 10 ? "text-brand-orange" : "text-red-600" },
    { title: "Total Transaksi", value: totalTransactions.toLocaleString('id-ID'), icon: ShoppingCart, color: "text-brand-orange" },
    { title: "Total Pembelian", value: formatCurrency(totalPurchaseSpend), icon: Package, color: "text-brand-orange" },
  ];

  // ──────── Loading State ────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <CardGridSkeleton cols={4} />
        <div className="border-2 border-gray-200 rounded-lg p-3 h-64 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border-2 border-gray-200 rounded-lg p-3 h-48 animate-pulse"></div>
          <FormSkeleton />
        </div>
      </div>
    );
  }

  // ──────── Render ────────
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-2xl font-display font-bold text-brand-black">Laporan Keuangan</h3>
            <p className="font-mono text-sm text-muted-foreground">Ringkasan kesehatan finansial warung Anda.</p>
          </div>
          <OnboardingTour tourId="finance-page-tour" steps={financeTourSteps} loading={isLoading} isActive={isActive} />
        </div>
        <div className="flex gap-2">
          <Button id="tour-finance-export-csv" onClick={handleExport} variant="outline" className="text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-xs sm:text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-10 sm:h-11 px-3">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button id="tour-finance-export" onClick={handleExportPDF} variant="outline" className="text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-xs sm:text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-10 sm:h-11 px-3 bg-brand-orange hover:bg-orange-500">
            <FileText className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Preview PDF</span>
          </Button>
        </div>
      </div>

      {/* PDF Preview Modal */}
      <Dialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 rounded-none border-4 border-brand-black w-[95vw]">
          <DialogHeader className="p-4 border-b-2 border-brand-black">
            <DialogTitle className="font-display font-bold text-xl flex items-center gap-2">
              <FileText className="w-5 h-5" /> Pratinjau Laporan PDF
            </DialogTitle>
          </DialogHeader>
          <div className="bg-gray-200 p-2 sm:p-4 overflow-hidden h-[65vh] sm:h-[75vh]">
            {pdfPreviewUrl ? (
              <iframe src={pdfPreviewUrl} className="w-full h-full border-2 border-brand-black bg-white shadow-hard" />
            ) : (
              <div className="flex items-center justify-center w-full h-full">Memuat PDF...</div>
            )}
          </div>
          <div className="p-4 border-t-2 border-brand-black flex justify-between items-center bg-gray-50">
            <span className="text-xs font-mono text-muted-foreground hidden sm:inline">PDF di-generate menggunakan jsPDF</span>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={() => setPdfPreviewOpen(false)} variant="outline" className="flex-1 sm:flex-none rounded-none border-2 border-brand-black font-bold uppercase shadow-hard hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 transition-all">
                Batal
              </Button>
              <Button onClick={() => {
                const doc = generatePDF();
                doc.save(`Laporan_Keuangan_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
                setPdfPreviewOpen(false);
                toast.success('Laporan PDF berhasil diunduh!');
              }} className="flex-1 sm:flex-none rounded-none border-2 border-brand-black font-bold uppercase bg-brand-orange hover:bg-orange-500 text-brand-black shadow-hard hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 transition-all">
                <Download className="w-4 h-4 mr-2" />
                Unduh
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Period Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex flex-wrap gap-1 bg-gray-100 border-2 border-brand-black p-1 w-fit h-fit">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setPeriod(opt.key)}
              className={`px-3 py-1.5 font-mono text-xs font-bold uppercase transition-all ${period === opt.key
                ? 'bg-brand-black text-white'
                : 'text-brand-black hover:bg-gray-200'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 bg-gray-100 border-2 border-brand-black p-1 w-fit">
            <span className="font-mono text-[10px] font-bold uppercase ml-2">Mulai</span>
            <Input
              type="date"
              max={customEndDate}
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="w-auto h-8 rounded-none border-2 border-brand-black font-mono text-xs px-2"
            />
            <span className="font-mono text-[10px] font-bold uppercase mx-1">Sampai</span>
            <Input
              type="date"
              min={customStartDate}
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="w-auto h-8 rounded-none border-2 border-brand-black font-mono text-xs px-2"
            />
          </div>
        )}
      </div>

      {/* KPI Cards — 6 cards in 2 rows on mobile, 3 cols on tablet, 6 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6" id="tour-finance-summary">
        {kpiData.map((kpi, index) => (
          <Card key={index} className="rounded-none border-2 border-brand-black shadow-hard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-3">
              <CardTitle className="text-[10px] md:text-xs font-mono font-bold uppercase truncate">{kpi.title}</CardTitle>
              <kpi.icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className={`text-lg md:text-xl font-bold font-display ${kpi.color} truncate`}>{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts & P&L — side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Chart — takes 3 cols */}
        <Card className="rounded-none border-2 border-brand-black shadow-hard lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg font-bold">Kinerja Bulanan</CardTitle>
          </CardHeader>
          <CardContent>
            <FinancialChart data={monthlyData} />
          </CardContent>
        </Card>

        {/* P&L Summary — takes 2 cols */}
        <Card className="rounded-none border-2 border-brand-black shadow-hard lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg font-bold">Laba Rugi</CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-sm">
            <div className="space-y-1">
              {/* Revenue section */}
              <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground pt-1">
                <span>Pendapatan</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">Penjualan Kotor</span>
                <span className="font-bold">{formatCurrency(grossRevenue)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between py-0.5 text-red-600">
                  <span>(-) Diskon/Promo</span>
                  <span className="font-bold">-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="border-t border-dashed border-gray-300 my-1"></div>
              <div className="flex justify-between py-0.5 font-bold">
                <span>Pendapatan Bersih</span>
                <span>{formatCurrency(grossRevenue - totalDiscount)}</span>
              </div>

              {/* Expenses section */}
              <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground pt-3">
                <span>Biaya</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">HPP</span>
                <span className="font-bold">{formatCurrency(cogs)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">Pembelian Stok</span>
                <span className="font-bold">{formatCurrency(totalPurchaseSpend)}</span>
              </div>
              <div className="border-t border-dashed border-gray-300 my-1"></div>
              <div className="flex justify-between py-0.5 font-bold">
                <span>Total Biaya</span>
                <span>{formatCurrency(totalExpenses)}</span>
              </div>

              {/* Bottom line */}
              <div className="border-t-2 border-brand-black mt-3 pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-base uppercase">Laba Bersih</span>
                  <span className={`font-bold text-lg ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(netProfit)}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-muted-foreground text-xs">Margin</span>
                  <span className="flex items-center gap-1 text-xs">
                    {profitMargin >= 20 ? (
                      <TrendingUp className="w-3 h-3 text-green-600" />
                    ) : profitMargin > 0 ? (
                      <Minus className="w-3 h-3 text-yellow-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600" />
                    )}
                    <span className={`font-bold ${profitMargin >= 20 ? 'text-green-600' : profitMargin > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {profitMargin.toFixed(2)}%
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products & Cash — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Top Products — 3 cols */}
        <Card className="rounded-none border-2 border-brand-black shadow-hard lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-lg font-bold">Produk Terlaris</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300">
                <p className="font-mono text-sm text-muted-foreground">Belum ada data penjualan di periode ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-sm">
                  <thead>
                    <tr className="border-b-2 border-brand-black">
                      <th className="text-left py-2 pr-2 text-xs font-bold uppercase text-muted-foreground">#</th>
                      <th className="text-left py-2 pr-2 text-xs font-bold uppercase text-muted-foreground">Produk</th>
                      <th className="text-right py-2 pr-2 text-xs font-bold uppercase text-muted-foreground">Qty</th>
                      <th className="text-right py-2 pr-2 text-xs font-bold uppercase text-muted-foreground hidden sm:table-cell">Pendapatan</th>
                      <th className="text-right py-2 text-xs font-bold uppercase text-muted-foreground">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, index) => (
                      <tr key={index} className="border-b border-gray-200 last:border-0">
                        <td className="py-2 pr-2 text-muted-foreground">{index + 1}</td>
                        <td className="py-2 pr-2 font-bold truncate max-w-[120px] md:max-w-[200px]">{product.name}</td>
                        <td className="py-2 pr-2 text-right">{product.qty}</td>
                        <td className="py-2 pr-2 text-right hidden sm:table-cell">{formatCompact(product.revenue)}</td>
                        <td className={`py-2 text-right font-bold ${product.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCompact(product.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cash & Balance — 2 cols, stacked vertically */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-none border-2 border-brand-black shadow-hard">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg font-bold">Kas di Tangan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-10 h-10 bg-brand-orange border-2 border-brand-black flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-brand-black" />
                </div>
                <div>
                  <p className="text-2xl md:text-3xl font-bold font-display text-brand-black">{formatCurrency(cashOnHand)}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground font-mono">
                    {reconciliations.filter(r => r.actualCash > 0).length > 0
                      ? "Kas terakhir dicatat + Transaksi Lunas setelahnya"
                      : "Saldo awal + Pendapatan Lunas - Pembelian"}
                  </p>
                </div>
              </div>
              {/* Inline breakdown */}
              <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[10px] md:text-xs">
                <div className="bg-gray-50 border border-gray-200 p-2 text-center">
                  <div className="text-muted-foreground">Saldo Awal</div>
                  <div className="font-bold">{formatCompact(initialBalance)}</div>
                </div>
                <div className="bg-green-50 border border-green-200 p-2 text-center">
                  <div className="text-green-700">Masuk</div>
                  <div className="font-bold text-green-700">+{formatCompact(sales.reduce((s, sale) => s + sale.total, 0))}</div>
                </div>
                <div className="bg-red-50 border border-red-200 p-2 text-center">
                  <div className="text-red-700">Keluar</div>
                  <div className="font-bold text-red-700">-{formatCompact(purchases.reduce((s, p) => s + p.totalCost, 0))}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-2 border-brand-black shadow-hard">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg font-bold">Atur Saldo Awal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2" id="tour-finance-balance">
                <Input
                  type="number"
                  placeholder="Masukkan saldo awal"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  className="rounded-none border-2 border-brand-black"
                />
                <Button onClick={handleSetBalance} className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold shadow-hard hover:bg-brand-black hover:text-brand-white active:shadow-none active:translate-x-0.5 active:translate-y-0.5">Atur</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}