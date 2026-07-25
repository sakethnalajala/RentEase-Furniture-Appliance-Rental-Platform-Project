// Where each role lands right after authenticating.
const ROLE_HOME_PATHS = {
  customer: '/customer',
  vendor: '/vendor',
  delivery_partner: '/delivery',
  admin: '/admin',
};

export function getRoleHomePath(role) {
  return ROLE_HOME_PATHS[role] || '/';
}
