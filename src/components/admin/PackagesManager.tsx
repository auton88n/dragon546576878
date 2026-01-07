import { useState } from 'react';
import { Package, Plus, Trash2, Edit2, Save, X, Users, Baby, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLanguage } from '@/hooks/useLanguage';
import { useAllPackages, useUpdatePackage, useCreatePackage, useDeletePackage, Package as PackageType } from '@/hooks/usePackages';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

interface SortablePackageProps {
  pkg: PackageType;
  isArabic: boolean;
  onEdit: (pkg: PackageType) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  editForm: Partial<PackageType>;
  setEditForm: (form: Partial<PackageType>) => void;
  onSave: () => void;
  onCancel: () => void;
}

const SortablePackage = ({ pkg, isArabic, onEdit, onDelete, editingId, editForm, setEditForm, onSave, onCancel }: SortablePackageProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pkg.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 border rounded-xl transition-colors ${pkg.is_active ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-60'} ${isDragging ? 'shadow-lg' : ''}`}
    >
      {editingId === pkg.id ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{isArabic ? 'الاسم (إنجليزي)' : 'Name (EN)'}</Label>
              <Input value={editForm.name_en} onChange={(e) => setEditForm({ ...editForm, name_en: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">{isArabic ? 'الاسم (عربي)' : 'Name (AR)'}</Label>
              <Input value={editForm.name_ar} onChange={(e) => setEditForm({ ...editForm, name_ar: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-xs flex items-center gap-1"><Users className="h-3 w-3" /> {isArabic ? 'بالغين' : 'Adults'}</Label>
              <Input type="number" min="0" value={editForm.adult_count} onChange={(e) => setEditForm({ ...editForm, adult_count: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1"><Baby className="h-3 w-3" /> {isArabic ? 'أطفال' : 'Children'}</Label>
              <Input type="number" min="0" value={editForm.child_count} onChange={(e) => setEditForm({ ...editForm, child_count: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">{isArabic ? 'السعر' : 'Price'}</Label>
              <Input type="number" min="0" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">{isArabic ? 'الترتيب' : 'Order'}</Label>
              <Input type="number" min="0" value={editForm.display_order} onChange={(e) => setEditForm({ ...editForm, display_order: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={editForm.is_active} onCheckedChange={(v) => setEditForm({ ...editForm, is_active: v })} />
              <span className="text-sm">{isArabic ? 'نشط' : 'Active'}</span>
            </div>
            <Button size="sm" onClick={onSave}><Save className="h-4 w-4 me-1" />{isArabic ? 'حفظ' : 'Save'}</Button>
            <Button size="sm" variant="ghost" onClick={onCancel}><X className="h-4 w-4" /></Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button {...attributes} {...listeners} className="cursor-grab touch-none p-1 hover:bg-accent/10 rounded">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <p className="font-medium">{isArabic ? pkg.name_ar : pkg.name_en}</p>
            <p className="text-sm text-muted-foreground" dir="ltr">
              {pkg.adult_count} Adult + {pkg.child_count} Child • {pkg.price} SAR
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" onClick={() => onEdit(pkg)}><Edit2 className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => onDelete(pkg.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
};

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !packages) return;

    const oldIndex = packages.findIndex((p) => p.id === active.id);
    const newIndex = packages.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(packages, oldIndex, newIndex);

    // Update display_order for all affected items
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].display_order !== i + 1) {
        await updatePackage.mutateAsync({ id: reordered[i].id, display_order: i + 1 } as PackageType);
      }
    }
    toast({ title: isArabic ? 'تم إعادة الترتيب' : 'Reordered' });
  };

  const handleEdit = (pkg: PackageType) => {
    setEditingId(pkg.id);
    setEditForm(pkg);
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await updatePackage.mutateAsync({ ...editForm, id: editingId } as PackageType);
      toast({ title: isArabic ? 'تم الحفظ' : 'Saved' });
      setEditingId(null);
    } catch {
      toast({ title: isArabic ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    try {
      const maxOrder = packages?.reduce((max, p) => Math.max(max, p.display_order), 0) || 0;
      await createPackage.mutateAsync({ ...newPackage, display_order: maxOrder + 1 } as Omit<PackageType, 'id'>);
      toast({ title: isArabic ? 'تم الإنشاء' : 'Created' });
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

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <GripVertical className="h-3 w-3" />
        {isArabic ? 'اسحب لإعادة الترتيب' : 'Drag to reorder'}
      </p>

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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={packages?.map(p => p.id) || []} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {packages?.map((pkg) => (
              <SortablePackage
                key={pkg.id}
                pkg={pkg}
                isArabic={isArabic}
                onEdit={handleEdit}
                onDelete={handleDelete}
                editingId={editingId}
                editForm={editForm}
                setEditForm={setEditForm}
                onSave={handleSave}
                onCancel={() => setEditingId(null)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default PackagesManager;
