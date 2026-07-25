import { useMemo } from 'react';
import { useListProductsQuery } from '@/store/customerApi';
import { buildRentalHistory, buildPayments, buildMaintenanceRequests } from '@/lib/mockRentalData';

// Rental History / Payments / Maintenance are demo-simulated (no Order backend yet) but built
// from real catalog products so the images, names, and prices shown are all genuine — only
// the "this is what you rented" wrapper around them is synthesized. See mockRentalData.js.
export function useMockRentals() {
  const { data, isLoading } = useListProductsQuery({ limit: 20, sort: 'rating' });
  const products = data?.data?.items || [];

  const rentalHistory = useMemo(() => buildRentalHistory(products), [products]);
  const payments = useMemo(() => buildPayments(rentalHistory), [rentalHistory]);
  const maintenanceRequests = useMemo(() => buildMaintenanceRequests(products), [products]);

  return { isLoading, rentalHistory, payments, maintenanceRequests };
}
