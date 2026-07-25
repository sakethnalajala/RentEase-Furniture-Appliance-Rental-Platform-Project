'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Mail, Phone, MapPin, Star, Truck, Bike, Car, Calendar, Camera, Pencil, X, Save,
  Landmark, FileText, Upload, Eye, Hash, Fingerprint, Wallet,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Switch from '@/components/ui/Switch';
import Skeleton from '@/components/ui/Skeleton';
import {
  useGetMyDeliveryProfileQuery,
  useUpdateMyDeliveryProfileMutation,
  useUpdateAvailabilityMutation,
  useUploadDeliveryDocumentMutation,
  useUploadDeliveryPhotoMutation,
} from '@/store/deliveryApi';
import { formatDate, money } from '@/lib/deliveryHelpers';

const VEHICLE_OPTIONS = [
  { value: 'bike', label: 'Bike' },
  { value: 'van', label: 'Van' },
  { value: 'truck', label: 'Truck' },
];
const VEHICLE_ICON = { bike: Bike, van: Car, truck: Truck };
const DOC_TYPE_OPTIONS = [
  { value: 'license', label: 'Driving license' },
  { value: 'aadhaar', label: 'Aadhaar card' },
];
const DOC_TYPE_LABEL = { license: 'Driving license', aadhaar: 'Aadhaar card' };

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

function emptyForm() {
  return {
    vehicleType: 'bike',
    vehicleNumber: '',
    licenseNumber: '',
    bankDetails: { accountHolderName: '', accountNumber: '', ifsc: '' },
  };
}

function formFromPartner(partner) {
  return {
    vehicleType: partner?.vehicleType || 'bike',
    vehicleNumber: partner?.vehicleNumber || '',
    licenseNumber: partner?.licenseNumber || '',
    bankDetails: {
      accountHolderName: partner?.bankDetails?.accountHolderName || '',
      accountNumber: partner?.bankDetails?.accountNumber || '',
      ifsc: partner?.bankDetails?.ifsc || '',
    },
  };
}

export default function DeliveryProfilePage() {
  const { data, isLoading } = useGetMyDeliveryProfileQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateMyDeliveryProfileMutation();
  const [updateAvailability, { isLoading: isTogglingAvailability }] = useUpdateAvailabilityMutation();
  const [uploadDocument, { isLoading: isUploadingDoc }] = useUploadDeliveryDocumentMutation();
  const [uploadPhoto, { isLoading: isUploadingPhoto }] = useUploadDeliveryPhotoMutation();

  const partner = data?.data;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [docType, setDocType] = useState('license');
  const [docFile, setDocFile] = useState(null);
  const photoInputRef = useRef(null);
  const docInputRef = useRef(null);

  useEffect(() => {
    if (partner) setForm(formFromPartner(partner));
  }, [partner]);

  const handleAvailabilityToggle = async (checked) => {
    try {
      await updateAvailability({ isAvailable: checked }).unwrap();
      toast.success(checked ? "You're now online." : "You're now offline.");
    } catch (err) {
      toast.error(err?.data?.message || 'Could not update availability.');
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await uploadPhoto(fd).unwrap();
      toast.success('Profile photo updated.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not upload photo.');
    } finally {
      e.target.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.vehicleNumber.trim() || !form.licenseNumber.trim()) {
      toast.error('Vehicle number and license number are required.');
      return;
    }
    const ifsc = form.bankDetails.ifsc.trim();
    if (ifsc && !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifsc)) {
      toast.error('Enter a valid 11-character IFSC code (e.g. HDFC0001234).');
      return;
    }
    try {
      await updateProfile(form).unwrap();
      toast.success('Profile updated.');
      setEditing(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Could not update profile.');
    }
  };

  const handleCancel = () => {
    if (partner) setForm(formFromPartner(partner));
    setEditing(false);
  };

  const handleDocUpload = async () => {
    if (!docFile) {
      toast.error('Choose a file to upload first.');
      return;
    }
    const fd = new FormData();
    fd.append('file', docFile);
    fd.append('type', docType);
    try {
      await uploadDocument(fd).unwrap();
      toast.success(`${DOC_TYPE_LABEL[docType]} uploaded.`);
      setDocFile(null);
      if (docInputRef.current) docInputRef.current.value = '';
    } catch (err) {
      toast.error(err?.data?.message || 'Could not upload document.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    );
  }

  if (!partner) return null;

  const VehicleIcon = VEHICLE_ICON[partner.vehicleType] || Truck;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Your profile</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your delivery partner details, documents and payout account.</p>
      </div>

      <Card variant="glass" className="relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-brand-500/20 to-accent-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="group relative">
            {partner.profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partner.profilePhoto} alt={partner.user?.name} className="h-16 w-16 rounded-2xl object-cover shadow-premium" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-2xl font-bold text-white shadow-premium">
                {partner.user?.name?.[0]?.toUpperCase() || 'D'}
              </span>
            )}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              aria-label="Change profile photo"
              className="focus-ring absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-60 dark:border-slate-900"
            >
              <Camera size={12} />
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">{partner.user?.name}</h2>
              <Badge variant="brand" className="capitalize">
                <VehicleIcon size={11} /> {partner.vehicleType}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{partner.assignedCity?.name || 'City not set'}</p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-6">
            <div className="text-center">
              <p className="flex items-center justify-center gap-1 font-display text-lg font-bold text-slate-900 dark:text-white">
                <Star size={15} className="fill-amber-400 text-amber-400" /> {partner.averageRating?.toFixed(1) || '0.0'}
              </p>
              <p className="text-[11px] text-slate-400">Rating</p>
            </div>
            <div className="text-center">
              <p className="flex items-center justify-center gap-1 font-display text-lg font-bold text-slate-900 dark:text-white">
                <Truck size={15} /> {partner.totalDeliveries || 0}
              </p>
              <p className="text-[11px] text-slate-400">Deliveries</p>
            </div>
            <div className="text-center">
              <p className="font-display text-lg font-bold text-slate-900 dark:text-white">{money(partner.totalEarnings)}</p>
              <p className="text-[11px] text-slate-400">Lifetime earnings</p>
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-slate-200/70 pt-4 dark:border-white/10">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{partner.isAvailable ? 'Online' : 'Offline'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Toggle whether you receive new delivery requests.</p>
          </div>
          <Switch checked={Boolean(partner.isAvailable)} onChange={handleAvailabilityToggle} disabled={isTogglingAvailability} />
        </div>
      </Card>

      <Card variant="glass" className="p-6">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Contact &amp; account</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <InfoRow icon={Mail} label="Email" value={partner.user?.email} />
          <InfoRow icon={Phone} label="Phone" value={partner.user?.phone} />
          <InfoRow icon={MapPin} label="Assigned city" value={partner.assignedCity ? `${partner.assignedCity.name}, ${partner.assignedCity.state}` : ''} />
          <InfoRow icon={Calendar} label="Partner since" value={formatDate(partner.user?.createdAt)} />
        </div>
      </Card>

      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Vehicle &amp; payout details</h2>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={13} /> Edit
            </Button>
          )}
        </div>

        {!editing ? (
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <InfoRow icon={VehicleIcon} label="Vehicle type" value={VEHICLE_OPTIONS.find((v) => v.value === partner.vehicleType)?.label} />
            <InfoRow icon={Hash} label="Vehicle number" value={partner.vehicleNumber} />
            <InfoRow icon={Fingerprint} label="License number" value={partner.licenseNumber} />
            <InfoRow icon={Landmark} label="Bank account holder" value={partner.bankDetails?.accountHolderName} />
            <InfoRow icon={Wallet} label="Account number" value={partner.bankDetails?.accountNumber} />
            <InfoRow icon={Landmark} label="IFSC" value={partner.bankDetails?.ifsc} />
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-4 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Vehicle type</label>
                <Select
                  value={form.vehicleType}
                  onChange={(v) => setForm((f) => ({ ...f, vehicleType: v }))}
                  options={VEHICLE_OPTIONS}
                />
              </div>
              <Input
                label="Vehicle number"
                value={form.vehicleNumber}
                onChange={(e) => setForm((f) => ({ ...f, vehicleNumber: e.target.value }))}
                required
              />
              <Input
                label="License number"
                value={form.licenseNumber}
                onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
                required
              />
            </div>

            <div className="border-t border-slate-200/70 pt-4 dark:border-white/10">
              <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Bank details for payouts</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Account holder name"
                  value={form.bankDetails.accountHolderName}
                  onChange={(e) => setForm((f) => ({ ...f, bankDetails: { ...f.bankDetails, accountHolderName: e.target.value } }))}
                />
                <Input
                  label="Account number"
                  value={form.bankDetails.accountNumber}
                  onChange={(e) => setForm((f) => ({ ...f, bankDetails: { ...f.bankDetails, accountNumber: e.target.value } }))}
                />
                <Input
                  label="IFSC code"
                  value={form.bankDetails.ifsc}
                  onChange={(e) => setForm((f) => ({ ...f, bankDetails: { ...f.bankDetails, ifsc: e.target.value.toUpperCase() } }))}
                  hint="11 characters, e.g. HDFC0001234"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" loading={isSaving}>
                <Save size={15} /> Save changes
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancel} disabled={isSaving}>
                <X size={15} /> Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>

      <Card variant="glass" className="p-6">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Documents</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Upload your driving license and Aadhaar card for verification.</p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Document type</label>
            <Select value={docType} onChange={setDocType} options={DOC_TYPE_OPTIONS} className="w-48" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">File</label>
            <input
              ref={docInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              className="focus-ring rounded-xl border border-slate-300 bg-white/70 px-3 py-2 text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:file:text-brand-300"
            />
          </div>
          <Button size="sm" loading={isUploadingDoc} onClick={handleDocUpload}>
            <Upload size={14} /> Upload
          </Button>
        </div>

        {partner.documents?.length > 0 ? (
          <div className="mt-5 space-y-2.5">
            {partner.documents.map((doc, i) => (
              <div key={`${doc.type}-${i}`} className="flex items-center gap-3 rounded-xl border border-slate-200/70 p-3 dark:border-white/10">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                  <FileText size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{DOC_TYPE_LABEL[doc.type] || doc.type}</p>
                  <p className="text-xs text-slate-400">Uploaded {formatDate(doc.uploadedAt)}</p>
                </div>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-500/10 dark:text-brand-300"
                  >
                    <Eye size={13} /> View
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-400">No documents uploaded yet.</p>
        )}
      </Card>
    </div>
  );
}
