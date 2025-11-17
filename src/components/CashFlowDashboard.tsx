import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Scale } from "lucide-react";
export function CashFlowDashboard() {
    const kpiData = [
    { title: "Cash In (Today)", value: "Rp 2,150,000", icon: TrendingUp },
    { title: "Cash Out (Today)", value: "Rp 800,000", icon: TrendingDown },
    { title: "Net Cash Flow", value: "Rp 1,350,000", icon: Scale },
  ];
  return (
    <div>
      <div className="mb-8">
        <h3 className="text-2xl font-display font-bold text-brand-black">Cash Flow</h3>
        <p className="font-mono text-sm text-muted-foreground">Monitor the flow of cash in and out of your business.</p>
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
        <p className="font-mono text-muted-foreground">Detailed cash flow statements and forecasts will be available here soon.</p>
      </div>
    </div>
  );
}