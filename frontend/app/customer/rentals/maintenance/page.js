'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Wrench, Plus, ImageOff, Upload, Video, User } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useMockRentals } from '@/hooks/useMockRentals';

const STATUS_VARIANT = { submitted: 'neutral', technician_assigned: 'brand', resolved: 'success' };
const STATUS_LABEL = { submitted: 'Submitted', technician_assigned: 'Technician Assigned', resolved: 'Resolved' };

export default function MaintenancePage() {
  const { isLoading, rentalHistory, maintenanceRequests: seedRequests } = useMockRentals();
  const [requests, setRequests, loaded] = useLocalStorage('rentease_maintenance_requests', null);
  const [modalOpen, setModalOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    if (loaded && requests === null && seedRequests.length > 0) setRequests(seedRequests);
  }, [loaded, requests, seedRequests, setRequests]);

  const list = requests || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    const rental = rentalHistory.find((r) => r.product._id === productId);
    if (!rental) {
      toast.error('Select a product to report an issue for.');
      return;
    }

    const newRequest = {
      id: `MNT-${Date.now().toString().slice(-6)}`,
      product: rental.product,
      description,
      status: 'submitted',
      technician: null,
      createdAt: new Date(),
      resolvedAt: null,
      attachedImages: images.length,
      attachedVideos: videos.length,
    };

    setRequests((prev) => [newRequest, ...(prev || [])]);
    toast.success('Maintenance request submitted.');
    setModalOpen(false);
    setDescription('');
    setImages([]);
    setVideos([]);
    setProductId('');
  };

  return (
    <div className="space-y-6">
      <Link href="/customer/rentals" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300">
        <ArrowLeft size={15} /> Back to Rentals
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Maintenance Requests</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Report an issue and track its resolution.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> New Request
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-2 p-12 text-center">
          <Wrench size={28} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No maintenance requests yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((req) => (
            <Card key={req.id} variant="glass" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                {req.product?.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={req.product.images[0]} alt={req.product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-white/5">
                    <ImageOff size={16} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{req.product?.name}</p>
                  <Badge variant={STATUS_VARIANT[req.status]}>{STATUS_LABEL[req.status]}</Badge>
                </div>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{req.description}</p>
                {req.technician && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <User size={11} /> Technician: {req.technician}
                  </p>
                )}
              </div>
              <p className="shrink-0 text-xs text-slate-400">
                {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New maintenance request">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Product</label>
            <select
              required
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="focus-ring rounded-xl border border-slate-300 bg-white/70 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="" disabled>
                Select a rented product
              </option>
              {rentalHistory.map((r) => (
                <option key={r.product._id} value={r.product._id}>
                  {r.product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Describe the issue</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's wrong with the product?"
              className="focus-ring rounded-xl border border-slate-300 bg-white/70 px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="focus-ring flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5">
              <Upload size={18} />
              {images.length > 0 ? `${images.length} image(s)` : 'Upload images'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setImages([...e.target.files])} />
            </label>
            <label className="focus-ring flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500 hover:bg-slate-50 dark:border-white/15 dark:text-slate-400 dark:hover:bg-white/5">
              <Video size={18} />
              {videos.length > 0 ? `${videos.length} video(s)` : 'Upload videos'}
              <input type="file" accept="video/*" multiple className="hidden" onChange={(e) => setVideos([...e.target.files])} />
            </label>
          </div>

          <Button type="submit" className="mt-2 w-full">
            Submit request
          </Button>
        </form>
      </Modal>
    </div>
  );
}
