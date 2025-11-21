import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, PackageX, TrendingDown, ArrowRight } from 'lucide-react';
import { useLowStockAlerts } from '@/hooks/useLowStockAlerts';
import { useNavigate } from 'react-router-dom';

export function LowStockSummaryCard() {
  const { lowStockProducts, outOfStockProducts, totalAlerts, hasCritical } = useLowStockAlerts();
  const navigate = useNavigate();

  if (!hasCritical && totalAlerts === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-brand-black bg-gradient-to-br from-red-50 to-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Alert Stok
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {outOfStockProducts.length > 0 && (
            <div className="p-3 bg-red-100 border-2 border-red-600 rounded-none">
              <div className="flex items-center gap-2 mb-1">
                <PackageX className="w-4 h-4 text-red-600" />
                <span className="text-xs font-mono font-bold text-red-600 uppercase">Habis</span>
              </div>
              <p className="text-2xl font-display font-bold text-red-600">
                {outOfStockProducts.length}
              </p>
              <p className="text-xs font-mono text-muted-foreground">Produk</p>
            </div>
          )}
          {lowStockProducts.length > 0 && (
            <div className="p-3 bg-yellow-100 border-2 border-yellow-600 rounded-none">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-yellow-600" />
                <span className="text-xs font-mono font-bold text-yellow-600 uppercase">Menipis</span>
              </div>
              <p className="text-2xl font-display font-bold text-yellow-600">
                {lowStockProducts.length}
              </p>
              <p className="text-xs font-mono text-muted-foreground">Produk</p>
            </div>
          )}
        </div>

        {outOfStockProducts.length > 0 && (
          <div>
            <p className="text-xs font-mono font-bold uppercase text-muted-foreground mb-2">
              Stok Habis (Perlu Segera)
            </p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {outOfStockProducts.slice(0, 3).map((product) => (
                <div
                  key={product.id}
                  className="p-2 bg-white border border-red-300 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-8 h-8 object-cover border border-brand-black"
                      />
                    )}
                    <div>
                      <p className="font-bold text-xs">{product.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {product.category}
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive" className="rounded-none text-[10px]">
                    0
                  </Badge>
                </div>
              ))}
            </div>
            {outOfStockProducts.length > 3 && (
              <p className="text-xs font-mono text-muted-foreground mt-2">
                +{outOfStockProducts.length - 3} produk lainnya
              </p>
            )}
          </div>
        )}

        <Button
          onClick={() => navigate('/dashboard?tab=inventory')}
          className="w-full bg-brand-orange hover:bg-brand-orange/90 text-brand-black font-bold rounded-none border-2 border-brand-black"
        >
          Lihat Semua <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
