import { useState } from 'react';
import { Sparkles, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAllAttractions, useUpdateAttraction, useCreateAttraction, useDeleteAttraction, Attraction } from '@/hooks/useAttractions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ICON_OPTIONS = [
  'ShoppingBag', 'Home', 'Mountain', 'Landmark', 'Building2', 'TreePalm', 'Palette', 'Users',
  'Map', 'Camera', 'Music', 'Coffee', 'Utensils', 'Star', 'Heart', 'Sun'
];

const AttractionsManager = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { toast } = useToast();
  
  const { data: attractions, isLoading } = useAllAttractions();
  const updateAttraction = useUpdateAttraction();
  const createAttraction = useCreateAttraction();
  const deleteAttraction = useDeleteAttraction();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Attraction>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newAttraction, setNewAttraction] = useState<Partial<Attraction>>({
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    icon: 'Landmark',
    is_active: true,
    display_order: 0,
  });

  const handleEdit = (attr: Attraction) => {
    setEditingId(attr.id);
    setEditForm(attr);
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await updateAttraction.mutateAsync({ ...editForm, id: editingId } as Attraction);
      toast({ title: isArabic ? 'تم الحفظ' : 'Saved' });
      setEditingId(null);
    } catch {
      toast({ title: isArabic ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    try {
      await createAttraction.mutateAsync(newAttraction as Omit<Attraction, 'id'>);
      toast({ title: isArabic ? 'تم الإنشاء' : 'Created' });
      setIsCreating(false);
      setNewAttraction({ name_en: '', name_ar: '', description_en: '', description_ar: '', icon: 'Landmark', is_active: true, display_order: 0 });
    } catch {
      toast({ title: isArabic ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAttraction.mutateAsync(id);
      toast({ title: isArabic ? 'تم الحذف' : 'Deleted' });
    } catch {
      toast({ title: isArabic ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2 text-foreground">
          <Sparkles className="h-5 w-5 text-accent" />
          {isArabic ? 'إدارة المعالم' : 'Manage Attractions'}
        </h3>
        <Button size="sm" onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="h-4 w-4 me-1" />
          {isArabic ? 'إضافة' : 'Add'}
        </Button>
      </div>

      {isCreating && (
        <div className="p-4 border border-accent/20 rounded-xl bg-accent/5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{isArabic ? 'الاسم (إنجليزي)' : 'Name (EN)'}</Label>
              <Input value={newAttraction.name_en} onChange={(e) => setNewAttraction({ ...newAttraction, name_en: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{isArabic ? 'الاسم (عربي)' : 'Name (AR)'}</Label>
              <Input value={newAttraction.name_ar} onChange={(e) => setNewAttraction({ ...newAttraction, name_ar: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{isArabic ? 'الوصف (إنجليزي)' : 'Description (EN)'}</Label>
              <Input value={newAttraction.description_en || ''} onChange={(e) => setNewAttraction({ ...newAttraction, description_en: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{isArabic ? 'الوصف (عربي)' : 'Description (AR)'}</Label>
              <Input value={newAttraction.description_ar || ''} onChange={(e) => setNewAttraction({ ...newAttraction, description_ar: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">{isArabic ? 'الأيقونة' : 'Icon'}</Label>
              <Select value={newAttraction.icon} onValueChange={(v) => setNewAttraction({ ...newAttraction, icon: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(icon => <SelectItem key={icon} value={icon}>{icon}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{isArabic ? 'الترتيب' : 'Order'}</Label>
              <Input type="number" min="0" value={newAttraction.display_order} onChange={(e) => setNewAttraction({ ...newAttraction, display_order: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate}><Save className="h-4 w-4 me-1" />{isArabic ? 'حفظ' : 'Save'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}><X className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {attractions?.map((attr) => (
          <div key={attr.id} className={`p-3 border rounded-xl transition-colors ${attr.is_active ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-60'}`}>
            {editingId === attr.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input value={editForm.name_en} onChange={(e) => setEditForm({ ...editForm, name_en: e.target.value })} placeholder="Name (EN)" />
                  <Input value={editForm.name_ar} onChange={(e) => setEditForm({ ...editForm, name_ar: e.target.value })} placeholder="Name (AR)" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input value={editForm.description_en || ''} onChange={(e) => setEditForm({ ...editForm, description_en: e.target.value })} placeholder="Description (EN)" />
                  <Input value={editForm.description_ar || ''} onChange={(e) => setEditForm({ ...editForm, description_ar: e.target.value })} placeholder="Description (AR)" />
                </div>
                <div className="flex items-center gap-4">
                  <Select value={editForm.icon} onValueChange={(v) => setEditForm({ ...editForm, icon: v })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(icon => <SelectItem key={icon} value={icon}>{icon}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Switch checked={editForm.is_active} onCheckedChange={(v) => setEditForm({ ...editForm, is_active: v })} />
                    <span className="text-sm">{isArabic ? 'نشط' : 'Active'}</span>
                  </div>
                  <Button size="sm" onClick={handleSave}><Save className="h-4 w-4 me-1" />{isArabic ? 'حفظ' : 'Save'}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{isArabic ? attr.name_ar : attr.name_en}</p>
                  <p className="text-xs text-muted-foreground">{attr.icon} • {isArabic ? attr.description_ar : attr.description_en}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(attr)}><Edit2 className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(attr.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttractionsManager;
