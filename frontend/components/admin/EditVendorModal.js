'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAdminUpdateVendorMutation } from '@/store/adminApi';

// Shared between the vendor list (frontend/app/admin/vendors/page.js) and the vendor detail
// page (frontend/app/admin/vendors/[vendorId]/page.js) so the edit form only lives in one
// place. Pre-fills from `vendor` whenever it opens, PATCHes via useAdminUpdateVendorMutation.
export default function EditVendorModal({ open, onClose, vendor }) {
  const [form, setForm] = useState({
    businessName: '',
    gstNumber: '',
    panNumber: '',
    businessAddress: '',
    area: '',
  });
  const [updateVendor, { isLoading }] = useAdminUpdateVendorMutation();

  useEffect(() => {
    if (open && vendor) {
      setForm({
        businessName: vendor.businessName || '',
        gstNumber: vendor.gstNumber || '',
        panNumber: vendor.panNumber || '',
        businessAddress: vendor.businessAddress || '',
        area: vendor.area || '',
      });
    }
  }, [open, vendor]);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendor?._id) return;
    try {
      await updateVendor({ id: vendor._id, ...form }).unwrap();
      toast.success('Vendor updated successfully.');
      onClose?.();
    } catch (err) {
      toast.error(err?.data?.message || 'Could not update vendor.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit vendor details">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label="Business name" value={form.businessName} onChange={handleChange('businessName')} required />
        <Input label="GST number" value={form.gstNumber} onChange={handleChange('gstNumber')} />
        <Input label="PAN number" value={form.panNumber} onChange={handleChange('panNumber')} />
        <Input label="Business address" value={form.businessAddress} onChange={handleChange('businessAddress')} />
        <Input label="Area" value={form.area} onChange={handleChange('area')} />
        <Button type="submit" loading={isLoading} className="mt-1 w-full">
          Save changes
        </Button>
      </form>
    </Modal>
  );
}
