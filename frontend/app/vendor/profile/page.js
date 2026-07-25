'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Building2, Mail, Phone, MapPin, Star, ShoppingBag, BadgeCheck, Warehouse, FileText,
  Camera, Pencil, Check, X, User as UserIcon, Landmark,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Skeleton from '@/components/ui/Skeleton';
import { useGetMyVendorProfileQuery, useUpdateMyVendorProfileMutation, useUploadVendorImageMutation } from '@/store/vendorApi';
import { useUpdateProfileMutation } from '@/store/authApi';
import { useListCitiesQuery } from '@/store/authApi';

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{value || '—'}</p>
      </div>
    </div>
  );
}

// One small upload control reused for the cover image, company logo, and owner's profile
// photo — each just points at a different Vendor image slot via `imageType`.
function ImageUploadButton({ imageType, onUploaded, className = '', label }) {
  const inputRef = useRef(null);
  const [uploadImage, { isLoading }] = useUploadVendorImageMutation();

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await uploadImage({ type: imageType, formData }).unwrap();
      toast.success(`${label} updated.`);
      onUploaded?.();
    } catch (err) {
      toast.error(err?.data?.message || `Could not upload ${label.toLowerCase()}.`);
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <motion.button
        type="button"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        disabled={isLoading}
        onClick={() => inputRef.current?.click()}
        aria-label={`Change ${label.toLowerCase()}`}
        className={`focus-ring flex items-center justify-center rounded-full bg-slate-900/70 text-white shadow-premium backdrop-blur transition-opacity hover:bg-slate-900/85 disabled:opacity-60 ${className}`}
      >
        <Camera size={14} />
      </motion.button>
    </>
  );
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  businessName: '',
  gstNumber: '',
  panNumber: '',
  businessAddress: '',
  description: '',
  operatingCities: [],
  warehouseLocation: { name: '', address: '' },
};

export default function VendorProfilePage() {
  const { data, isLoading, refetch } = useGetMyVendorProfileQuery();
  const { data: citiesData } = useListCitiesQuery();
  const [updateUser, { isLoading: isSavingUser }] = useUpdateProfileMutation();
  const [updateVendor, { isLoading: isSavingVendor }] = useUpdateMyVendorProfileMutation();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const vendor = data?.data;
  const cities = citiesData?.data || [];
  const isSaving = isSavingUser || isSavingVendor;

  const resetFormFromVendor = () => {
    if (!vendor) return;
    setForm({
      name: vendor.user?.name || '',
      phone: vendor.user?.phone || '',
      businessName: vendor.businessName || '',
      gstNumber: vendor.gstNumber || '',
      panNumber: vendor.panNumber || '',
      businessAddress: vendor.businessAddress || '',
      description: vendor.description || '',
      operatingCities: (vendor.operatingCities || []).map((c) => c._id),
      warehouseLocation: { name: vendor.warehouseLocation?.name || '', address: vendor.warehouseLocation?.address || '' },
    });
  };

  useEffect(resetFormFromVendor, [vendor]);

  const toggleCity = (cityId) => {
    setForm((f) => ({
      ...f,
      operatingCities: f.operatingCities.includes(cityId)
        ? f.operatingCities.filter((id) => id !== cityId)
        : [...f.operatingCities, cityId],
    }));
  };

  const validate = () => {
    if (!form.name.trim()) return 'Vendor name is required.';
    if (!form.businessName.trim()) return 'Business name is required.';
    if (form.gstNumber && !/^[0-9A-Z]{15}$/i.test(form.gstNumber.replace(/\s/g, ''))) {
      return 'GST number should be 15 characters (letters and digits).';
    }
    if (form.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(form.panNumber.replace(/\s/g, ''))) {
      return 'PAN number should look like ABCDE1234F.';
    }
    return null;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      await Promise.all([
        updateUser({ name: form.name, phone: form.phone }).unwrap(),
        updateVendor({
          businessName: form.businessName,
          gstNumber: form.gstNumber,
          panNumber: form.panNumber,
          businessAddress: form.businessAddress,
          description: form.description,
          operatingCities: form.operatingCities,
          warehouseLocation: form.warehouseLocation,
        }).unwrap(),
      ]);
      toast.success('Vendor profile updated.');
      setEditing(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Could not update profile.');
    }
  };

  const handleCancel = () => {
    resetFormFromVendor();
    setEditing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!vendor) return null;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Cover + logo + owner photo */}
      <Card variant="glass" className="overflow-hidden p-0">
        <div
          className="relative h-40 w-full bg-gradient-to-br from-brand-500/30 to-accent-500/30 bg-cover bg-center sm:h-52"
          style={vendor.coverImage ? { backgroundImage: `url(${vendor.coverImage})` } : undefined}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent" />
          <ImageUploadButton imageType="coverImage" label="Cover image" onUploaded={refetch} className="absolute right-4 top-4 h-9 w-9" />
        </div>

        <div className="relative flex flex-wrap items-end gap-4 px-6 pb-6">
          <div className="relative -mt-10 shrink-0">
            <span
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-bold text-white shadow-premium dark:border-slate-900"
              style={vendor.logo ? { backgroundImage: `url(${vendor.logo})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            >
              {!vendor.logo && (vendor.businessName?.[0]?.toUpperCase() || 'V')}
            </span>
            <ImageUploadButton imageType="logo" label="Company logo" onUploaded={refetch} className="absolute -bottom-1.5 -right-1.5 h-7 w-7" />
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-3 pt-2">
            <div className="relative shrink-0">
              <span
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-sm font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300"
                style={vendor.profilePhoto ? { backgroundImage: `url(${vendor.profilePhoto})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              >
                {!vendor.profilePhoto && <UserIcon size={18} />}
              </span>
              <ImageUploadButton imageType="profilePhoto" label="Profile photo" onUploaded={refetch} className="absolute -bottom-1 -right-1 h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-xl font-bold text-slate-900 dark:text-white">{vendor.businessName}</h1>
                <Badge variant={vendor.status === 'approved' ? 'success' : 'neutral'} className="capitalize">
                  <BadgeCheck size={11} /> {vendor.status}
                </Badge>
              </div>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{vendor.user?.name}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-6 pt-2">
            <div className="text-center">
              <p className="flex items-center justify-center gap-1 font-display text-lg font-bold text-slate-900 dark:text-white">
                <Star size={15} className="fill-amber-400 text-amber-400" /> {vendor.averageRating?.toFixed(1) || '0.0'}
              </p>
              <p className="text-[11px] text-slate-400">Rating</p>
            </div>
            <div className="text-center">
              <p className="flex items-center justify-center gap-1 font-display text-lg font-bold text-slate-900 dark:text-white">
                <ShoppingBag size={15} /> {vendor.totalOrders || 0}
              </p>
              <p className="text-[11px] text-slate-400">Orders</p>
            </div>
            {!editing && (
              <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(true)}>
                <Pencil size={14} /> Edit profile
              </Button>
            )}
          </div>
        </div>
      </Card>

      {!editing ? (
        <>
          <Card variant="glass" className="p-6">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Business details</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <InfoRow icon={Mail} label="Email" value={vendor.user?.email} />
              <InfoRow icon={Phone} label="Phone" value={vendor.user?.phone} />
              <InfoRow icon={MapPin} label="Primary city" value={vendor.city?.name} />
              <InfoRow
                icon={MapPin}
                label="Operating cities"
                value={vendor.operatingCities?.length ? vendor.operatingCities.map((c) => c.name).join(', ') : 'Primary city only'}
              />
              <InfoRow icon={Building2} label="GST number" value={vendor.gstNumber} />
              <InfoRow icon={FileText} label="PAN number" value={vendor.panNumber} />
              <InfoRow icon={Warehouse} label="Warehouse" value={vendor.warehouseLocation?.name || vendor.businessAddress} />
              <InfoRow icon={Landmark} label="Business address" value={vendor.businessAddress} />
            </div>
            {vendor.description && (
              <div className="mt-5 border-t border-slate-200/70 pt-4 dark:border-white/10">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">About</p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{vendor.description}</p>
              </div>
            )}
          </Card>
        </>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSave}
          className="space-y-6"
        >
          <Card variant="glass" className="p-6">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Edit business details</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Input label="Vendor name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <Input
                label="Business name"
                value={form.businessName}
                onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
              />
              <Input
                label="GST number"
                value={form.gstNumber}
                onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value.toUpperCase() }))}
                placeholder="22AAAAA0000A1Z5"
              />
              <Input
                label="PAN number"
                value={form.panNumber}
                onChange={(e) => setForm((f) => ({ ...f, panNumber: e.target.value.toUpperCase() }))}
                placeholder="ABCDE1234F"
              />
              <Input
                label="Warehouse name"
                value={form.warehouseLocation.name}
                onChange={(e) => setForm((f) => ({ ...f, warehouseLocation: { ...f.warehouseLocation, name: e.target.value } }))}
              />
              <Input
                label="Warehouse / business address"
                className="sm:col-span-2"
                value={form.businessAddress}
                onChange={(e) => setForm((f) => ({ ...f, businessAddress: e.target.value }))}
              />
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Business description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="focus-ring mt-1.5 w-full rounded-xl border border-slate-300 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                  placeholder="Tell customers what makes your rental business stand out…"
                />
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200/70 pt-4 dark:border-white/10">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Operating cities</p>
              <p className="text-xs text-slate-400">Beyond your primary city ({vendor.city?.name}) — where else can you fulfil orders?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {cities.map((city) => {
                  const active = form.operatingCities.includes(city._id);
                  return (
                    <button
                      key={city._id}
                      type="button"
                      onClick={() => toggleCity(city._id)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-white/10 dark:text-slate-400'
                      }`}
                    >
                      {city.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button type="submit" loading={isSaving}>
              <Check size={15} /> Save changes
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSaving}>
              <X size={15} /> Cancel
            </Button>
          </div>
        </motion.form>
      )}
    </div>
  );
}
