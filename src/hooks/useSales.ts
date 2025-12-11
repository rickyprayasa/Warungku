import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Sale, SaleFormValues } from '@shared/types';
import { toast } from 'sonner';

function toSale(row: any, items: any[]): Sale {
  return {
    id: row.id,
    total: Number(row.total),
    profit: Number(row.profit),
    saleType: row.sale_type || 'retail',
    notes: row.notes || '',
    createdAt: new Date(row.created_at).getTime(),
    items: items.map(item => ({
      productId: item.product_id,
      productName: item.product_name,
      quantity: item.quantity,
      price: Number(item.price),
      cost: Number(item.cost),
    })),
  };
}

export function useSales(storeId: string | null) {
  return useQuery({
    queryKey: ['sales', storeId],
    queryFn: async () => {
      if (!storeId) return [];

      // Fetch sales
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      // Fetch sale items
      const saleIds = (salesData || []).map((s: any) => s.id);
      let itemsData: any[] = [];

      if (saleIds.length > 0) {
        const { data, error: itemsError } = await supabase
          .from('sale_items')
          .select('*')
          .in('sale_id', saleIds);

        if (itemsError) throw itemsError;
        itemsData = data || [];
      }

      return (salesData || []).map((sale: any) =>
        toSale(sale, itemsData.filter(item => item.sale_id === sale.id))
      );
    },
    enabled: !!storeId,
    staleTime: 1000 * 30,
  });
}

export function useAddSale(storeId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleData: SaleFormValues) => {
      if (!storeId) throw new Error('No store selected');

      // Get products for cost calculation
      const productIds = saleData.items.map(item => item.productId);
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, cost, price, total_stock, qty_per_unit')
        .in('id', productIds);

      if (productsError) throw productsError;

      // Calculate totals
      let total = 0;
      let profit = 0;
      const items = saleData.items.map(item => {
        const product = products?.find(p => p.id === item.productId);
        const price = item.price;
        const cost = product?.cost || 0;
        total += price * item.quantity;
        profit += (price - cost) * item.quantity;
        return {
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          price: price,
          cost: cost,
        };
      });

      // Insert sale
      const { data: saleRow, error: saleError } = await supabase
        .from('sales')
        .insert({
          store_id: storeId,
          total,
          profit,
          sale_type: 'retail',
          notes: saleData.notes || '',
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Insert sale items
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(items.map(item => ({ ...item, sale_id: saleRow.id })));

      if (itemsError) throw itemsError;

      // Update stock for each item
      for (const item of saleData.items) {
        const product = products?.find(p => p.id === item.productId);
        if (product) {
          const qtyToDeduct = item.quantity * (product.qty_per_unit || 1);
          await supabase
            .from('products')
            .update({ total_stock: Math.max(0, (product.total_stock || 0) - qtyToDeduct) })
            .eq('id', item.productId);
        }
      }

      return toSale(saleRow, items.map(i => ({ ...i, sale_id: saleRow.id })));
    },
    onMutate: async (newSale) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['sales', storeId] });

      // Snapshot previous value
      const previousSales = queryClient.getQueryData<Sale[]>(['sales', storeId]);

      // Optimistically update (add temp sale at the beginning)
      if (previousSales) {
        const optimisticSale: Sale = {
          id: 'temp-' + Date.now(),
          total: newSale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          profit: 0, // Will be calculated on server
          saleType: 'retail',
          notes: newSale.notes || '',
          createdAt: Date.now(),
          items: newSale.items,
        };
        queryClient.setQueryData<Sale[]>(['sales', storeId], [optimisticSale, ...previousSales]);
      }

      return { previousSales };
    },
    onError: (err, newSale, context) => {
      // Rollback on error
      if (context?.previousSales) {
        queryClient.setQueryData(['sales', storeId], context.previousSales);
      }
      toast.error('Gagal menambahkan penjualan');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', storeId] });
      queryClient.invalidateQueries({ queryKey: ['products', storeId] });
      toast.success('Penjualan berhasil ditambahkan');
    },
  });
}

export function useDeleteSale(storeId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      // Get sale items first for stock restoration
      const { data: items } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId);

      // Delete sale (cascade deletes items)
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);

      if (error) throw error;

      // Restore stock
      const { data: products } = await supabase
        .from('products')
        .select('id, total_stock, qty_per_unit')
        .in('id', (items || []).map(i => i.product_id));

      for (const item of items || []) {
        const product = products?.find(p => p.id === item.product_id);
        if (product) {
          const qtyToRestore = item.quantity * (product.qty_per_unit || 1);
          await supabase
            .from('products')
            .update({ total_stock: (product.total_stock || 0) + qtyToRestore })
            .eq('id', item.product_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales', storeId] });
      queryClient.invalidateQueries({ queryKey: ['products', storeId] });
      toast.success('Penjualan berhasil dihapus');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus penjualan');
    },
  });
}
