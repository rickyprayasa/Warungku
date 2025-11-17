import { useEffect, useState } from 'react';
import { useWarungStore } from '@/lib/store';
import { ProductDataTable } from '@/components/ProductDataTable';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProductForm } from '@/components/ProductForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalesHistory } from '@/components/SalesHistory';
export function DashboardPage() {
  const fetchProducts = useWarungStore((state) => state.fetchProducts);
  const isLoading = useWarungStore((state) => state.isLoading);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <Tabs defaultValue="products">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <TabsList className="bg-muted/40 border-2 border-brand-black rounded-none p-1 h-auto mb-4 sm:mb-0">
              <TabsTrigger value="products" className="rounded-none data-[state=active]:bg-brand-white data-[state=active]:shadow-hard-sm data-[state=active]:border-2 data-[state=active]:border-brand-black font-bold uppercase">
                Product Management
              </TabsTrigger>
              <TabsTrigger value="sales" className="rounded-none data-[state=active]:bg-brand-white data-[state=active]:shadow-hard-sm data-[state=active]:border-2 data-[state=active]:border-brand-black font-bold uppercase">
                Sales History
              </TabsTrigger>
            </TabsList>
            <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-11">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  New Product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-none border-4 border-brand-black bg-brand-white">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl font-bold">Add New Product</DialogTitle>
                </DialogHeader>
                <ProductForm onSuccess={() => setCreateDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
          <TabsContent value="products">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <ProductDataTable />
            )}
          </TabsContent>
          <TabsContent value="sales">
            <SalesHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}