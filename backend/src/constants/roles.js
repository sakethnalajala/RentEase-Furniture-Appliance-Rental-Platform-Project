const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  VENDOR: 'vendor',
  DELIVERY_PARTNER: 'delivery_partner',
  ADMIN: 'admin',
});

const ALL_ROLES = Object.values(ROLES);

// Admin is intentionally self-registerable in this app: it's a demo/portfolio platform, not a
// real production marketplace, and every other role already onboards frictionlessly (vendors
// auto-approve, phone-OTP silently creates a customer account, any 6-digit code satisfies 2FA).
// Real platform protection still exists — mandatory TOTP 2FA on first login
// (MANDATORY_2FA_ROLES below) — it's just not gated behind a separate manual invite step.
//
// Super Admin was removed as a distinct role (previously ROLES.SUPER_ADMIN) — it had zero
// permissions beyond what Admin already has everywhere in this codebase (every route/query
// that checked for it also always checked for Admin in the same breath), so removing it lost
// no real capability. Any account seeded with the old role is migrated to `admin` at the top
// of seed.js's seed() function before anything else runs.
const SELF_REGISTERABLE_ROLES = [ROLES.CUSTOMER, ROLES.VENDOR, ROLES.DELIVERY_PARTNER, ROLES.ADMIN];

const MANDATORY_2FA_ROLES = [ROLES.ADMIN];

module.exports = { ROLES, ALL_ROLES, SELF_REGISTERABLE_ROLES, MANDATORY_2FA_ROLES };
