# Add Delete Booking Functionality to Admin Dashboard

## Overview
Add the ability for admins to delete bookings from the admin dashboard. This includes both single booking deletion and bulk deletion support. The RLS policy already exists that allows admins to delete bookings.

## Current State
- RLS policy "Admins can delete bookings" already exists: `has_role(auth.uid(), 'admin'::app_role)`
- BookingTable has cancel functionality but no delete
- BulkActionsBar has bulk cancel but no bulk delete
- Related tickets should be cascade deleted (bookings table has `ON DELETE CASCADE` for tickets)

## Implementation Plan

### Step 1: Update BookingTable.tsx - Add Delete Handler and Confirmation Dialog

Add the delete functionality to the BookingTable component:

**Changes:**
1. Import `Trash2` icon from lucide-react and `AlertDialog` components
2. Add state for delete confirmation: `deleteConfirmId`
3. Add `handleDeleteBooking` function that deletes from Supabase
4. Add a new dropdown menu item for "Delete Booking" (only for admins)
5. Add `AlertDialog` for delete confirmation
6. Add an optional `canDelete` prop to control visibility (admin-only feature)

**Code to add:**

```typescript
// New state
const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

// New handler
const handleDeleteBooking = async (bookingId: string) => {
  setActionLoadingId(bookingId);
  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);
    if (error) throw error;
    toast({
      title: isArabic ? 'تم الحذف' : 'Deleted',
      description: isArabic ? 'تم حذف الحجز بنجاح' : 'Booking deleted successfully',
    });
    setDeleteConfirmId(null);
    onBookingUpdated?.();
  } catch {
    toast({
      title: isArabic ? 'خطأ' : 'Error',
      description: isArabic ? 'فشل حذف الحجز' : 'Failed to delete booking',
      variant: 'destructive',
    });
  } finally {
    setActionLoadingId(null);
  }
};
```

**New dropdown menu item (after Cancel Booking):**

```tsx
<DropdownMenuItem 
  onClick={() => setDeleteConfirmId(booking.id)}
  className="cursor-pointer text-red-600 hover:bg-red-500/10"
>
  <Trash2 className="h-4 w-4 me-2" />
  {isArabic ? 'حذف الحجز' : 'Delete Booking'}
</DropdownMenuItem>
```

**AlertDialog for confirmation:**

```tsx
<AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        {isArabic ? 'تأكيد الحذف' : 'Confirm Deletion'}
      </AlertDialogTitle>
      <AlertDialogDescription>
        {isArabic 
          ? 'هل أنت متأكد من حذف هذا الحجز؟ سيتم حذف جميع التذاكر المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.'
          : 'Are you sure you want to delete this booking? All associated tickets will also be deleted. This action cannot be undone.'}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>
        {isArabic ? 'إلغاء' : 'Cancel'}
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={() => deleteConfirmId && handleDeleteBooking(deleteConfirmId)}
        className="bg-red-600 hover:bg-red-700"
      >
        {isArabic ? 'حذف' : 'Delete'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Step 2: Update BulkActionsBar.tsx - Add Bulk Delete

Add bulk delete functionality for selected bookings:

**Changes:**
1. Import `Trash2` icon from lucide-react
2. Import `AlertDialog` components
3. Add state for bulk delete confirmation
4. Add `handleBulkDelete` function
5. Add delete button to the bulk actions bar
6. Add confirmation dialog

**Code to add:**

```typescript
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

const handleBulkDelete = async () => {
  if (selectedIds.length === 0) return;
  setLoading('delete');
  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .in('id', selectedIds);
    if (error) throw error;
    toast({
      title: isArabic ? 'تم الحذف' : 'Deleted',
      description: isArabic 
        ? `تم حذف ${selectedIds.length} حجز` 
        : `${selectedIds.length} booking(s) deleted`,
    });
    onBookingUpdated();
    onClearSelection();
    setShowDeleteConfirm(false);
  } catch {
    toast({
      title: isArabic ? 'خطأ' : 'Error',
      description: isArabic ? 'فشل الحذف' : 'Failed to delete bookings',
      variant: 'destructive',
    });
  } finally {
    setLoading(null);
  }
};
```

### Step 3: File Changes Summary

| File | Changes |
|------|---------|
| `src/components/admin/BookingTable.tsx` | Add Trash2 icon import, AlertDialog imports, delete state, handler, menu item, and dialog |
| `src/components/admin/BulkActionsBar.tsx` | Add Trash2 icon import, AlertDialog imports, delete state, handler, button, and dialog |

## Security Notes
- Delete operations are protected by RLS policy - only admins can delete
- Tickets are automatically cascade deleted when a booking is deleted
- Confirmation dialogs prevent accidental deletions

## Testing Checklist
- [ ] Single booking delete from dropdown menu
- [ ] Delete confirmation dialog appears
- [ ] Cancel button closes dialog without deleting
- [ ] Delete button removes booking and shows success toast
- [ ] Bulk select bookings and delete
- [ ] Bulk delete confirmation dialog appears
- [ ] Error handling shows toast on failure
- [ ] Non-admin users cannot see delete option (if implemented)

## Critical Files for Implementation
- `src/components/admin/BookingTable.tsx` - Add single delete with confirmation dialog
- `src/components/admin/BulkActionsBar.tsx` - Add bulk delete with confirmation dialog
- `src/components/ui/alert-dialog.tsx` - Already exists, will be imported
