import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, PiggyBank, FileText } from "lucide-react";
export function FinanceDashboard() {
    const kpiData = [
    { title: "Gross Profit (Month)", value: "Rp 8,500,000", icon: PiggyBank },
    { title: "Expenses (Month)", value: "Rp 3,200,000", icon: FileText },
    { title: "Net Profit (Month)", value: "Rp 5,300,000", icon: Landmark },
  ];
  return (
    <div>
      <div className="mb-8">
        <h3 className="text-2xl font-display font-bold text-brand-black">Financial Summary</h3>
        <p className="font-mono text-sm text-muted-foreground">An overview of your business's financial health.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {kpiData.map((kpi, index) => (
          <Card key={index} className="rounded-none border-2 border-brand-black shadow-hard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-mono font-bold uppercase">{kpi.title}</CardTitle>
              <kpi.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-brand-orange">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 text-center border-2 border-dashed border-brand-black p-12">
        <p className="font-mono text-muted-foreground">Profit & Loss statements and other financial reports will be available here soon.</p>
      </div>
    </div>
  );
}