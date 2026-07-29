'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet's default marker icons resolve to image paths relative to the installed package,
// which breaks under Next.js's bundler (a well-known Leaflet+webpack gotcha) — plain colored
// divIcons sidestep that entirely: no image assets to resolve, and they double as a legend
// (pickup/partner/customer are visually distinct colors) without extra UI.
function pinIcon(color, label) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>
      <div style="margin-top:2px;padding:1px 6px;border-radius:6px;background:${color};color:white;font-size:10px;font-weight:600;white-space:nowrap;">${label}</div>
    </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const PICKUP_ICON = pinIcon('#7c3aed', 'Vendor');
const PARTNER_ICON = pinIcon('#059669', 'Partner');
const CUSTOMER_ICON = pinIcon('#dc2626', 'Customer');

// Live map for the vendor's delivery-tracking panel: vendor pickup point, the assigned
// delivery partner's current position, and the customer's delivery address, plotted on
// OpenStreetMap tiles (no API key needed — see the parent modal for where these three points
// come from, none of it fabricated beyond the same simulated-but-consistent coordinates this
// app already uses for delivery partners' currentLocation everywhere else).
export default function DeliveryTrackingMap({ pickup, partner, customer }) {
  const points = [pickup, partner, customer].filter((p) => p?.lat != null && p?.lng != null);
  if (points.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400 dark:bg-white/5">
        Map unavailable for this order.
      </div>
    );
  }

  const center = [points[0].lat, points[0].lng];
  const bounds = points.length > 1 ? points.map((p) => [p.lat, p.lng]) : null;
  const routeLine = [pickup, partner, customer].filter((p) => p?.lat != null && p?.lng != null).map((p) => [p.lat, p.lng]);

  return (
    <div className="h-56 overflow-hidden rounded-xl border border-slate-200/70 dark:border-white/10">
      <MapContainer
        center={center}
        zoom={12}
        bounds={bounds || undefined}
        boundsOptions={{ padding: [30, 30] }}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {routeLine.length > 1 && <Polyline positions={routeLine} pathOptions={{ color: '#6366f1', weight: 3, dashArray: '6 6' }} />}
        {pickup?.lat != null && (
          <Marker position={[pickup.lat, pickup.lng]} icon={PICKUP_ICON}>
            <Popup>Pickup: {pickup.label}</Popup>
          </Marker>
        )}
        {partner?.lat != null && (
          <Marker position={[partner.lat, partner.lng]} icon={PARTNER_ICON}>
            <Popup>Delivery partner: {partner.label}</Popup>
          </Marker>
        )}
        {customer?.lat != null && (
          <Marker position={[customer.lat, customer.lng]} icon={CUSTOMER_ICON}>
            <Popup>Delivery to: {customer.label}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
