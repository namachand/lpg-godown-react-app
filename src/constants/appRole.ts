export const APP_ROLE_KEY = 'app_role';

export const APP_ROLES = {
  DRIVER: 'DRIVER',
  GODOWN_MANAGER: 'GODOWN_MANAGER',
  PURCHASE_MANAGER: 'PURCHASE_MANAGER',
  CASHIER: 'CASHIER',
} as const;

export type AppRole = typeof APP_ROLES[keyof typeof APP_ROLES];
