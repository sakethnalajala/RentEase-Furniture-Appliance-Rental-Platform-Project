// Shared polling cadence for views that need to reflect ANOTHER user's action (a different
// customer's checkout, a different delivery partner accepting a job, a vendor confirming an
// order) without a manual refresh. RTK Query's own tag-invalidation only fires inside the
// browser tab that ran the mutation — it can't reach an already-open tab in a different
// session — so these queries poll instead. 15s keeps a dashboard feeling "live" without
// meaningfully increasing API load (a handful of cheap, indexed reads per active tab).
export const LIVE_POLL_MS = 15000;
