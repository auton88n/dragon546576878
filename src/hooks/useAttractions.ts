import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Attraction {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  icon: string;
  is_active: boolean;
  display_order: number;
}

export const useAttractions = () => {
  return useQuery({
    queryKey: ['attractions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attractions')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Attraction[];
    },
  });
};

export const useAllAttractions = () => {
  return useQuery({
    queryKey: ['attractions', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attractions')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Attraction[];
    },
  });
};

export const useUpdateAttraction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attraction: Partial<Attraction> & { id: string }) => {
      const { data, error } = await supabase
        .from('attractions')
        .update({
          name_en: attraction.name_en,
          name_ar: attraction.name_ar,
          description_en: attraction.description_en,
          description_ar: attraction.description_ar,
          icon: attraction.icon,
          is_active: attraction.is_active,
          display_order: attraction.display_order,
        })
        .eq('id', attraction.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attractions'] });
    },
  });
};

export const useCreateAttraction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attraction: Omit<Attraction, 'id'>) => {
      const { data, error } = await supabase
        .from('attractions')
        .insert(attraction)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attractions'] });
    },
  });
};

export const useDeleteAttraction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('attractions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attractions'] });
    },
  });
};
