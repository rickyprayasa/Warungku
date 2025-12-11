import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Product, ProductFormValues } from '@shared/types';
import { toast } from 'sonner';

// Helper to convert Supabase snake_case to camelCase
function toProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    cost: Number(row.cost) || 0,
    imageUrl: row.image_url || '',
    category: row.category || '',
    description: row.description || '',
    isPromo: row.is_promo || false,
    promoPrice: row.promo_price ? Number(row.promo_price) : undefined,
    isActive: row.is_active !== false,
    isBestSeller: row.is_best_seller || false,
    totalStock: row.total_stock || 0,
    minStockLevel: row.min_stock_level || 10,
    qtyPerUnit: row.qty_per_unit || 1,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export function useProducts(storeId: string | null) {
  return useQuery({
    queryKey: ['products', storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const products = (data || []).map(toProduct);

      // Sort: In-stock first, then out-of-stock
      products.sort((a, b) => {
        const aOut = (a.totalStock || 0) <= 0;
        const bOut = (b.totalStock || 0) <= 0;
        if (aOut !== bOut) return aOut ? 1 : -1;
        return b.createdAt - a.createdAt;
      });

      return products;
    },
    enabled: !!storeId,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

export function useAddProduct(storeId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productData: ProductFormValues) => {
      if (!storeId) throw new Error('No store selected');

      const { data, error } = await supabase
        .from('products')
        .insert({
          store_id: storeId,
          name: productData.name,
          price: productData.price,
          cost: productData.cost || 0,
          image_url: productData.imageUrl || '',
          category: productData.category || '',
          description: productData.description || '',
          is_promo: productData.isPromo || false,
          promo_price: productData.promoPrice,
          is_active: productData.isActive !== false,
          is_best_seller: productData.isBestSeller || false,
          min_stock_level: productData.minStockLevel || 10,
          qty_per_unit: productData.qtyPerUnit || 1,
        })
        .select()
        .single();

      if (error) throw error;
      return toProduct(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] });
      toast.success('Produk berhasil ditambahkan');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menambahkan produk');
    },
  });
}

export function useUpdateProduct(storeId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, productData }: { productId: string; productData: ProductFormValues }) => {
      const { data, error } = await supabase
        .from('products')
        .update({
          name: productData.name,
          price: productData.price,
          cost: productData.cost,
          image_url: productData.imageUrl,
          category: productData.category,
          description: productData.description,
          is_promo: productData.isPromo,
          promo_price: productData.promoPrice,
          is_active: productData.isActive,
          is_best_seller: productData.isBestSeller,
          min_stock_level: productData.minStockLevel,
          qty_per_unit: productData.qtyPerUnit,
        })
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      return toProduct(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] });
      toast.success('Produk berhasil diupdate');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal mengupdate produk');
    },
  });
}

export function useDeleteProduct(storeId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] });
      toast.success('Produk berhasil dihapus');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus produk');
    },
  });
}

export function useAdjustStock(storeId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      quantity,
      unitCost,
      isFromProductForm = false,
    }: {
      productId: string;
      quantity: number;
      unitCost: number;
      isFromProductForm?: boolean;
    }) => {
      if (!storeId) throw new Error('No store selected');

      // Get current product
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('total_stock')
        .eq('id', productId)
        .single();

      if (fetchError) throw fetchError;

      const currentStock = product.total_stock || 0;
      const delta = quantity - currentStock;

      // Add stock detail if quantity increased
      if (delta > 0) {
        await supabase
          .from('stock_details')
          .insert({
            store_id: storeId,
            product_id: productId,
            quantity: delta,
            unit_cost: unitCost,
          });
      }

      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ total_stock: quantity })
        .eq('id', productId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', storeId] });
      toast.success('Stok berhasil disesuaikan');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menyesuaikan stok');
    },
  });
}
