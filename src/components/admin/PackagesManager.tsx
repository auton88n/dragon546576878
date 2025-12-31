import { useState } from 'react';
import { Package, Plus, Trash2, Edit2, Save, X, Users, Baby } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAllPackages, useUpdatePackage, useCreatePackage, useDeletePackage, Package as PackageType } from '@/hooks/usePackages';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

const PackagesManager = () => {
  const { currentLanguage } = useLanguage();
  const isArabic = currentLanguage === 'ar';
  const { toast } = useToast();
  
  const { data: packages, isLoading } = useAllPackages();
  const updatePackage = useUpdatePackage();
  const createPackage = useCreatePackage();
  const deletePackage = useDeletePackage();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PackageType>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newPackage, setNewPackage] = useState<Partial<PackageType>>({
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    adult_count: 1,
    child_count: 0,
    price: 0,
    is_active: true,
    display_order: 0,
  });

  const handleEdit = (pkg: PackageType) => {
    setEditingId(pkg.id);
    setEditForm(pkg);
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await updatePackage.mutateAsync({ ...editForm, id: editingId } as PackageType);
      toast({ title: isArabic ? 'تم الحفظ' : 'Saved', description: isArabic ? 'تم تحديث الباقة' : 'Package updated' });
      setEditingId(null);
    } catch {
      toast({ title: isArabic ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    try {
      await createPackage.mutateAsync(newPackage as Omit<PackageType, 'id'>);
      toast({ title: isArabic ? 'تم الإنشاء' : 'Created', description: isArabic ? 'تم إنشاء الباقة' : 'Package created' });
      setIsCreating(false);
      setNewPackage({ name_en: '', name_ar: '', description_en: '', description_ar: '', adult_count: 1, child_count: 0, price: 0, is_active: true, display_order: 0 });
    } catch {
      toast({ title: isArabic ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePackage.mutateAsync(id);
      toast({ title: isArabic ? 'تم الحذف' : 'Deleted' });
    } catch {
      toast({ title: isArabic ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2 text-foreground">
          <Package className="h-5 w-5 text-accent" />
          {isArabic ? 'إدارة الباقات' : 'Manage Packages'}
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
              <Input value={newPackage.name_en} onChange={(e) => setNewPackage({ ...newPackage, name_en: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{isArabic ? 'الاسم (عربي)' : 'Name (AR)'}</Label>
              <Input value={newPackage.name_ar} onChange={(e) => setNewPackage({ ...newPackage, name_ar: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" /> {isArabic ? 'بالغين' : 'Adults'}</Label>
              <Input type="number" min="0" value={newPackage.adult_count} onChange={(e) => setNewPackage({ ...newPackage, adult_count: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Baby className="h-3 w-3" /> {isArabic ? 'أطفال' : 'Children'}</Label>
              <Input type="number" min="0" value={newPackage.child_count} onChange={(e) => setNewPackage({ ...newPackage, child_count: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">{isArabic ? 'السعر' : 'Price'}</Label>
              <Input type="number" min="0" step="0.01" value={newPackage.price} onChange={(e) => setNewPackage({ ...newPackage, price: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">{isArabic ? 'الترتيب' : 'Order'}</Label>
              <Input type="number" min="0" value={newPackage.display_order} onChange={(e) => setNewPackage({ ...newPackage, display_order: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate}><Save className="h-4 w-4 me-1" />{isArabic ? 'حفظ' : 'Save'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}><X className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {packages?.map((pkg) => (
          <div key={pkg.id} className={`p-4 border rounded-xl transition-colors ${pkg.is_active ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-60'}`}>
            {editingId === pkg.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input value={editForm.name_en} onChange={(e) => setEditForm({ ...editForm, name_en: e.target.value })} placeholder="Name (EN)" />
                  <Input value={editForm.name_ar} onChange={(e) => setEditForm({ ...editForm, name_ar: e.target.value })} placeholder="Name (AR)" />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <Input type="number" min="0" value={editForm.adult_count} onChange={(e) => setEditForm({ ...editForm, adult_count: Number(e.target.value) })} />
                  <Input type="number" min="0" value={editForm.child_count} onChange={(e) => setEditForm({ ...editForm, child_count: Number(e.target.value) })} />
                  <Input type="number" min="0" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} />
                  <Input type="number" min="0" value={editForm.display_order} onChange={(e) => setEditForm({ ...editForm, display_order: Number(e.target.value) })} />
                </div>
                <div className="flex items-center gap-4">
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
                  <p className="font-medium">{isArabic ? pkg.name_ar : pkg.name_en}</p>
                  <p className="text-sm text-muted-foreground">
                    {pkg.adult_count} {isArabic ? 'بالغ' : 'adult'} + {pkg.child_count} {isArabic ? 'طفل' : 'child'} • {pkg.price} SAR
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(pkg)}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(pkg.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PackagesManager;
