'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MapPin, Plus, Pencil, Trash2, Star } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import { useListCitiesQuery } from '@/store/authApi';
import {
  useListAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
} from '@/store/customerApi';

const EMPTY_FORM = {
  label: 'Home',
  contactName: '',
  contactPhone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
};

export default function AddressesPage() {
  const { data, isLoading } = useListAddressesQuery();
  const { data: citiesData } = useListCitiesQuery();
  const [createAddress, { isLoading: isCreating }] = useCreateAddressMutation();
  const [updateAddress, { isLoading: isUpdating }] = useUpdateAddressMutation();
  const [deleteAddress] = useDeleteAddressMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const addresses = data?.data || [];
  const cities = citiesData?.data || [];

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (address) => {
    setEditingId(address._id);
    setForm({
      label: address.label,
      contactName: address.contactName,
      contactPhone: address.contactPhone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city?._id || '',
      state: address.state,
      pincode: address.pincode,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateAddress({ id: editingId, ...form }).unwrap();
        toast.success('Address updated.');
      } else {
        await createAddress(form).unwrap();
        toast.success('Address saved.');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Could not save address.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAddress(id).unwrap();
      toast.success('Address deleted.');
    } catch {
      toast.error('Could not delete address.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Saved addresses</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage where your rentals get delivered.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> Add address
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <MapPin size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No saved addresses yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <Card key={address._id} variant="glass" className="space-y-2 p-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                  <MapPin size={14} className="text-brand-500" /> {address.label}
                </span>
                {address.isDefault && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <Star size={11} className="fill-emerald-500" /> Default
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{address.contactName} · {address.contactPhone}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {address.addressLine1}
                {address.addressLine2 ? `, ${address.addressLine2}` : ''}, {address.city?.name}, {address.state} –{' '}
                {address.pincode}
              </p>
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => openEdit(address)}>
                  <Pencil size={14} /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(address._id)}>
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit address' : 'Add address'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input label="Label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          <Input
            label="Contact name"
            required
            value={form.contactName}
            onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
          />
          <Input
            label="Contact phone"
            required
            value={form.contactPhone}
            onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
          />
          <Input
            label="Address line 1"
            required
            value={form.addressLine1}
            onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
          />
          <Input
            label="Address line 2 (optional)"
            value={form.addressLine2}
            onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">City</label>
            <select
              required
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className="focus-ring rounded-xl border border-slate-300 bg-white/70 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="" disabled>
                Select a city
              </option>
              {cities.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="State" required value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
            <Input label="Pincode" required value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} />
          </div>
          <Button type="submit" loading={isCreating || isUpdating} className="mt-2 w-full">
            {editingId ? 'Save changes' : 'Save address'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
