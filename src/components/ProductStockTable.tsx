import { useEffect, useState } from 'react';
import { useWarungStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { StockDetailsDialog } from './StockDetailsDialog';

export function ProductStockTable() {
    const products = useWarungStore((state) => state.products);
    const fetchProducts = useWarungStore((state) => state.fetchProducts);
    const isLoading = useWarungStore((state) => state.isLoading);
    const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null);
    const [stockDialogOpen, setStockDialogOpen] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const getStockStatus = (stock: number) => {
        if (stock === 0) return { status: 'Habis', color: 'bg-red-500' };
        if (stock <= 5) return { status: 'Rendah', color: 'bg-yellow-500' };
        if (stock <= 20) return { status: 'Normal', color: 'bg-blue-500' };
        return { status: 'Banyak', color: 'bg-green-500' };
    };

    const handleViewDetails = (productId: string, productName: string) => {
        setSelectedProduct({ id: productId, name: productName });
        setStockDialogOpen(true);
    };

    // Calculate totals
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (p.totalStock || 0), 0);
    const outOfStock = products.filter(p => (p.totalStock || 0) === 0).length;
    const lowStock = products.filter(p => {
        const stock = p.totalStock || 0;
        return stock > 0 && stock <= 5;
    }).length;

    return (
        <Card className="border-2 border-brand-black rounded-none shadow-hard">
            <CardHeader className="border-b-2 border-brand-black bg-muted/20">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl font-display font-bold flex items-center gap-2">
                            <Package className="w-6 h-6 text-brand-orange" />
                            Inventori Stok Produk
                        </CardTitle>
                        <CardDescription className="font-mono mt-1">
                            Daftar stok semua produk dengan metode FIFO
                        </CardDescription>
                    </div>
                    <div className="flex gap-3">
                        <div className="text-center">
                            <p className="text-xs font-mono text-muted-foreground">Total Produk</p>
                            <p className="text-2xl font-bold font-mono">{totalProducts}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-mono text-muted-foreground">Total Stok</p>
                            <p className="text-2xl font-bold font-mono text-brand-orange">{totalStock}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-mono text-muted-foreground">Habis</p>
                            <p className="text-2xl font-bold font-mono text-red-500">{outOfStock}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs font-mono text-muted-foreground">Rendah</p>
                            <p className="text-2xl font-bold font-mono text-yellow-500">{lowStock}</p>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {isLoading ? (
                    <div className="p-6 space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b-2 border-brand-black bg-brand-black hover:bg-brand-black">
                                <TableHead className="font-mono font-bold text-brand-white">Produk</TableHead>
                                <TableHead className="font-mono font-bold text-brand-white">Kategori</TableHead>
                                <TableHead className="font-mono font-bold text-brand-white text-right">Harga Jual</TableHead>
                                <TableHead className="font-mono font-bold text-brand-white text-right">Stok</TableHead>
                                <TableHead className="font-mono font-bold text-brand-white text-center">Status</TableHead>
                                <TableHead className="font-mono font-bold text-brand-white text-center">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product) => {
                                const stock = product.totalStock || 0;
                                const stockInfo = getStockStatus(stock);

                                return (
                                    <TableRow key={product.id} className="border-b-2 border-brand-black last:border-b-0">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="w-12 h-12 object-cover border-2 border-brand-black"
                                                />
                                                <div>
                                                    <p className="font-bold">{product.name}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">ID: {product.id}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono">{product.category}</TableCell>
                                        <TableCell className="font-mono text-right font-bold text-brand-orange">
                                            {formatCurrency(product.price)}
                                        </TableCell>
                                        <TableCell className="font-mono text-right font-bold text-lg">
                                            {stock}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className={`${stockInfo.color} text-white border-2 border-brand-black rounded-none font-mono font-bold`}>
                                                {stockInfo.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleViewDetails(product.id, product.name)}
                                                className="border-2 border-brand-black rounded-none font-mono font-bold hover:bg-brand-orange hover:text-brand-black"
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                Detail
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            {/* Stock Details Dialog */}
            <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
                <DialogContent className="max-w-3xl rounded-none border-4 border-brand-black bg-brand-white p-0">
                    {selectedProduct && (
                        <StockDetailsDialog
                            productId={selectedProduct.id}
                            productName={selectedProduct.name}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
}
