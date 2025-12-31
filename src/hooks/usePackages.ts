import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Package {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  adult_count: number;
  child_count: number;
  price: number;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
}

export const usePackages = () => {
  return useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Package[];
    },
  });
};

export const useAllPackages = () => {
  return useQuery({
    queryKey: ['packages', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Package[];
    },
  });
};

export const useUpdatePackage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (pkg: Partial<Package> & { id: string }) => {
      const { data, error } = await supabase
        .from('packages')
        .update({
          name_en: pkg.name_en,
          name_ar: pkg.name_ar,
          description_en: pkg.description_en,
          description_ar: pkg.description_ar,
          adult_count: pkg.adult_count,
          child_count: pkg.child_count,
          price: pkg.price,
          is_active: pkg.is_active,
          display_order: pkg.display_order,
        })
        .eq('id', pkg.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
};

export const useCreatePackage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (pkg: Omit<Package, 'id'>) => {
      const { data, error } = await supabase
        .from('packages')
        .insert(pkg)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
};

export const useDeletePackage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('packages')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });
};
