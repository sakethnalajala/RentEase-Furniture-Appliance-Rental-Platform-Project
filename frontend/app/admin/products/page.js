'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Package,
  Tags,
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  X,
  PackageSearch,
  FolderTree,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import Switch from '@/components/ui/Switch';
import {
  useAdminListProductsQuery,
  useAdminCreateProductMutation,
  useAdminUpdateProductMutation,
  useAdminSetProductApprovalMutation,
  useAdminDeleteProductMutation,
  useAdminListCategoriesQuery,
  useAdminCreateCategoryMutation,
  useAdminUpdateCategoryMutation,
  useAdminDeleteCategoryMutation,
} from '@/store/adminApi';
import { useListCitiesQuery } from '@/store/authApi';
import { fadeInUp, staggerContainer } from '@/lib/motion';

const TABS = [
  { key: 'products', label: 'Products', icon: Package },
  { key: 'categories', label: 'Categories', icon: Tags },
];

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const emptyProductForm = {
  name: '',
  category: '',
  subCategory: '',
  brand: '',
  model: '',
  description: '',
  sku: '',
  city: '',
  monthlyRentalPrice: '',
  securityDeposit: '',
  deliveryCharge: '',
  stock: '',
  installationRequired: false,
  images: '',
};

function ProductForm({ initial, categories, cities, onCancel, onSubmit, submitting }) {
  const [form, setForm] = useState(initial);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category || !form.brand.trim() || !form.sku.trim() || !form.city || !form.monthlyRentalPrice || !form.securityDeposit) {
      toast.error('Please fill in all required fields (name, category, brand, SKU, city, rent, deposit).');
      return;
    }
    onSubmit({
      name: form.name.trim(),
      category: form.category,
      subCategory: form.subCategory.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      description: form.description.trim(),
      sku: form.sku.trim(),
      city: form.city,
      monthlyRentalPrice: Number(form.monthlyRentalPrice),
      securityDeposit: Number(form.securityDeposit),
      deliveryCharge: Number(form.deliveryCharge) || 0,
      stock: Number(form.stock) || 0,
      installationRequired: Boolean(form.installationRequired),
      images: form.images
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  const categoryOptions = categories.map((c) => ({ value: c._id, label: c.name }));
  const cityOptions = cities.map((c) => ({ value: c._id, label: `${c.name}, ${c.state}` }));

  return (
    <Card variant="glass" className="space-y-4 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {initial._id ? 'Edit product' : 'Add product'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="focus-ring rounded-md p-1 text-slate-400 hover:bg-slate-900/5 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Product name *" value={form.name} onChange={update('name')} />
          <Input label="Brand *" value={form.brand} onChange={update('brand')} />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Category *</label>
            <Select
              value={form.category}
              onChange={(v) => setForm((f) => ({ ...f, category: v }))}
              options={[{ value: '', label: 'Select a category' }, ...categoryOptions]}
            />
          </div>

          <Input label="Sub-category" value={form.subCategory} onChange={update('subCategory')} placeholder="e.g. Sofas, Refrigerators" />

          <Input label="Model" value={form.model} onChange={update('model')} />
          <Input label="SKU *" value={form.sku} onChange={update('sku')} />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">City *</label>
            <Select
              value={form.city}
              onChange={(v) => setForm((f) => ({ ...f, city: v }))}
              options={[{ value: '', label: 'Select a city' }, ...cityOptions]}
            />
          </div>

          <Input label="Stock" type="number" min="0" value={form.stock} onChange={update('stock')} />

          <Input label="Monthly rental price (₹) *" type="number" min="0" value={form.monthlyRentalPrice} onChange={update('monthlyRentalPrice')} />
          <Input label="Security deposit (₹) *" type="number" min="0" value={form.securityDeposit} onChange={update('securityDeposit')} />
          <Input label="Delivery charge (₹)" type="number" min="0" value={form.deliveryCharge} onChange={update('deliveryCharge')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={update('description')}
            className="focus-ring rounded-xl border border-slate-300 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        <Input
          label="Image URLs (comma-separated)"
          value={form.images}
          onChange={update('images')}
          placeholder="https://example.com/1.jpg, https://example.com/2.jpg"
        />

        <Switch
          checked={form.installationRequired}
          onChange={(v) => setForm((f) => ({ ...f, installationRequired: v }))}
          label="Installation required"
          description="Customer will need a scheduled installation visit."
        />

        <div className="flex gap-2 pt-2">
          <Button type="submit" loading={submitting} className="flex-1 sm:flex-none">
            {initial._id ? 'Save changes' : 'Create product'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Listed' },
  { value: 'false', label: 'Unlisted' },
];

function ProductsTab() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const debouncedSearch = useDebouncedValue(search);
  const selectedCity = useSelector((state) => state.city.selectedCity);
  useEffect(() => setPage(1), [debouncedSearch, category, isActive]);

  const { data: categoriesData } = useAdminListCategoriesQuery();
  const { data: citiesData } = useListCitiesQuery();
  const categories = categoriesData?.data || [];
  const cities = citiesData?.data || [];

  const { data, isLoading, isFetching } = useAdminListProductsQuery({
    page,
    limit: 10,
    category: category || undefined,
    isActive: isActive || undefined,
    search: debouncedSearch || undefined,
    city: selectedCity?.id,
  });

  const [createProduct, { isLoading: isCreating }] = useAdminCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useAdminUpdateProductMutation();
  const [setApproval] = useAdminSetProductApprovalMutation();
  const [deleteProduct] = useAdminDeleteProductMutation();

  const items = data?.data?.items || [];
  const total = data?.data?.total || 0;
  const pages = data?.data?.pages || 1;

  const openAdd = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (payload) => {
    try {
      if (editingProduct) {
        await updateProduct({ id: editingProduct._id, ...payload }).unwrap();
        toast.success('Product updated.');
      } else {
        await createProduct(payload).unwrap();
        toast.success('Product created.');
      }
      closeForm();
    } catch (err) {
      toast.error(err?.data?.message || 'Could not save this product.');
    }
  };

  const handleToggleApproval = async (product) => {
    try {
      await setApproval({ id: product._id, approved: !product.isActive }).unwrap();
      toast.success(product.isActive ? 'Product unlisted.' : 'Product approved and listed.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not update this product’s status.');
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(product._id).unwrap();
      toast.success('Product deleted.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not delete this product.');
    }
  };

  const initialForm = editingProduct
    ? {
        _id: editingProduct._id,
        name: editingProduct.name || '',
        category: editingProduct.category?._id || '',
        subCategory: editingProduct.subCategory || '',
        brand: editingProduct.brand || '',
        model: editingProduct.model || '',
        description: editingProduct.description || '',
        sku: editingProduct.sku || '',
        city: editingProduct.city?._id || '',
        monthlyRentalPrice: editingProduct.monthlyRentalPrice ?? '',
        securityDeposit: editingProduct.securityDeposit ?? '',
        deliveryCharge: editingProduct.deliveryCharge ?? '',
        stock: editingProduct.stock ?? '',
        installationRequired: Boolean(editingProduct.installationRequired),
        images: (editingProduct.images || []).join(', '),
      }
    : emptyProductForm;

  return (
    <div className="space-y-6">
      <Card variant="glass" className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search by name, brand or SKU…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select
            value={category}
            onChange={setCategory}
            options={[{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c._id, label: c.name }))]}
            className="sm:w-48"
          />
          <Select value={isActive} onChange={setIsActive} options={STATUS_OPTIONS} className="sm:w-40" />
          <Button onClick={openAdd} className="shrink-0">
            <Plus size={16} /> Add product
          </Button>
        </div>
      </Card>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <ProductForm
              initial={initialForm}
              categories={categories}
              cities={cities}
              onCancel={closeForm}
              onSubmit={handleSubmit}
              submitting={isCreating || isUpdating}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <PackageSearch size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No products match your filters.</p>
        </Card>
      ) : (
        <Card variant="glass" className={`overflow-hidden p-0 transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-white/10">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">City</th>
                  <th className="px-4 py-3 font-medium">Monthly rent</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p._id} className="border-b border-slate-200/50 last:border-0 dark:border-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt={p.name} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-white/5">
                            <ImageOff size={14} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="max-w-[200px] truncate font-medium text-slate-900 dark:text-white">{p.name}</p>
                          <p className="truncate text-xs text-slate-400">{p.brand} · {p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.category?.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.vendor?.businessName || 'RentEase'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.city?.name || '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">₹{p.monthlyRentalPrice?.toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.stock}</td>
                    <td className="px-4 py-3">
                      <Badge variant={p.isActive ? 'success' : 'neutral'}>{p.isActive ? 'Listed' : 'Unlisted'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          aria-label="Edit product"
                          className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-900/5 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-brand-300"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleApproval(p)}
                          aria-label={p.isActive ? 'Unlist product' : 'Approve product'}
                          className={`focus-ring flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-900/5 dark:hover:bg-white/10 ${
                            p.isActive ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {p.isActive ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          aria-label="Delete product"
                          className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {items.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-500 dark:text-slate-400">{total.toLocaleString('en-IN')} products total</p>
          {pages > 1 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 disabled:opacity-40 dark:border-white/10"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Page {page} of {pages}
              </span>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/70 disabled:opacity-40 dark:border-white/10"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const emptyCategoryForm = { name: '', description: '', icon: '', isActive: true };

function CategoriesTab() {
  const { data, isLoading } = useAdminListCategoriesQuery();
  const [createCategory, { isLoading: isCreating }] = useAdminCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useAdminUpdateCategoryMutation();
  const [deleteCategory] = useAdminDeleteCategoryMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState(emptyCategoryForm);

  const categories = data?.data || [];

  const openAdd = () => {
    setEditingCategory(null);
    setForm(emptyCategoryForm);
    setModalOpen(true);
  };

  const openEdit = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name || '',
      description: category.description || '',
      icon: category.icon || '',
      isActive: category.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Category name is required.');
      return;
    }
    const payload = { name: form.name.trim(), description: form.description.trim(), icon: form.icon.trim(), isActive: form.isActive };
    try {
      if (editingCategory) {
        await updateCategory({ id: editingCategory._id, ...payload }).unwrap();
        toast.success('Category updated.');
      } else {
        await createCategory(payload).unwrap();
        toast.success('Category created.');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || 'Could not save this category.');
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    try {
      await deleteCategory(category._id).unwrap();
      toast.success('Category deleted.');
    } catch (err) {
      toast.error(err?.data?.message || 'Could not delete this category.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{categories.length} categories in the catalog.</p>
        <Button onClick={openAdd}>
          <Plus size={16} /> Add category
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card variant="glass" className="flex flex-col items-center gap-3 p-12 text-center">
          <FolderTree size={32} className="text-slate-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No categories yet.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Card key={cat._id} variant="glass" className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-lg text-white shadow-premium">
                    {cat.icon || cat.name?.[0]?.toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{cat.name}</p>
                    <p className="text-xs text-slate-400">/{cat.slug}</p>
                  </div>
                </div>
                <Badge variant={cat.isActive !== false ? 'success' : 'neutral'}>{cat.isActive !== false ? 'Active' : 'Inactive'}</Badge>
              </div>

              {cat.description && <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{cat.description}</p>}

              <div className="mt-auto flex items-center justify-between border-t border-slate-200/70 pt-3 dark:border-white/10">
                <Badge variant="brand">{cat.productCount ?? 0} products</Badge>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(cat)}
                    aria-label="Edit category"
                    className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-900/5 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-brand-300"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    aria-label="Delete category"
                    className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingCategory ? 'Edit category' : 'Add category'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input label="Name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input
            label="Icon (emoji or short label)"
            value={form.icon}
            onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
            placeholder="🛋️"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="focus-ring rounded-xl border border-slate-300 bg-white/70 px-3.5 py-2.5 text-sm text-slate-900 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>
          <Switch checked={form.isActive} onChange={(v) => setForm((f) => ({ ...f, isActive: v }))} label="Active" description="Visible in Browse and product filters." />
          <Button type="submit" loading={isCreating || isUpdating} className="mt-2 w-full">
            {editingCategory ? 'Save changes' : 'Create category'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export default function AdminProductsPage() {
  const [tab, setTab] = useState('products');

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
      <motion.div variants={fadeInUp}>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Product management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage the platform catalog, approve or unlist listings, and organize categories.
        </p>
      </motion.div>

      <motion.div variants={fadeInUp} className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-brand-500 text-white'
                : 'bg-slate-900/5 text-slate-600 hover:bg-slate-900/10 dark:bg-white/10 dark:text-slate-300'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </motion.div>

      <motion.div variants={fadeInUp}>{tab === 'products' ? <ProductsTab /> : <CategoriesTab />}</motion.div>
    </motion.div>
  );
}
