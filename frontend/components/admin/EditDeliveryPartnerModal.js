'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { useAdminUpdateDeliveryPartnerMutation } from '@/store/adminApi';

const VEHICLE_TYPE_OPTIONS = [
  { value: 'bike', label: 'Bike' },
  { value: 'van', label: 'Van' },
  { value: 'truck', label: 'Truck' },
];

// Shared between the delivery partner list (frontend/app/admin/delivery-partners/page.js) and
// the detail page (frontend/app/admin/delivery-partners/[partnerId]/page.js) so the edit form
// only lives in one place. Pre-fills from `partner` whenever it opens, PATCHes via
// useAdminUpdateDeliveryPartnerMutation. Mirrors components/admin/EditVendorModal.js.
export default function EditDeliveryPartnerModal({ open, onClose, partner }) {
  const [form, setForm] = useState({
    vehicleType: 'bike',
    vehicleNumber: '',
    licenseNumber: '',
    area: '',
  });
  const [updatePartner, { isLoading }] = useAdminUpdateDeliveryPartnerMutation();

  useEffect(() => {
    if (open && partner) {
      setForm({
        vehicleType: partner.vehicleType || 'bike',
        vehicleNumber: partner.vehicleNumber || '',
        licenseNumber: partner.licenseNumber || '',
        area: partner.area || '',
      });
    }
  }, [open, partner]);

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!partner?._id) return;
    try {
      await updatePartner({ id: partner._id, ...form }).unwrap();
      toast.success('Delivery partner updated successfully.');
      onClose?.();
    } catch (err) {
      toast.error(err?.data?.message || 'Could not update delivery partner.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit delivery partner">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Vehicle type</label>
          <Select value={form.vehicleType} onChange={(v) => setForm((f) => ({ ...f, vehicleType: v }))} options={VEHICLE_TYPE_OPTIONS} />
        </div>
        <Input label="Vehicle number" value={form.vehicleNumber} onChange={handleChange('vehicleNumber')} required />
        <Input label="License number" value={form.licenseNumber} onChange={handleChange('licenseNumber')} required />
        <Input label="Area" value={form.area} onChange={handleChange('area')} placeholder="e.g. Powai" />
        <Button type="submit" loading={isLoading} className="mt-1 w-full">
          Save changes
        </Button>
      </form>
    </Modal>
  );
}
