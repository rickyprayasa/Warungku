import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, PackageCheck, AlertCircle } from "lucide-react";
export function PurchasesDashboard() {
    const kpiData = [
    { title: "Pending Orders", value: "5", icon: Truck },
    { title: "Stock Received (Month)", value: "120 items", icon: PackageCheck },
    { title: "Low Stock Alerts", value: "3 items", icon: AlertCircle },
  ];
  return (
    <div>
      <div className="mb-8">
        <h3 className="text-2xl font-display font-bold text-brand-black">Purchasing & Stock</h3>
        <p className="font-mono text-sm text-muted-foreground">Track your inventory purchases and supplier orders.</p>
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
        <p className="font-mono text-muted-foreground">Supplier management and purchase order history will be available here soon.</p>
      </div>
    </div>
  );
}