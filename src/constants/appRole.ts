export const APP_ROLE_KEY = 'app_role';

export const APP_ROLES = {
  DRIVER: 'driver',
  GODOWN_MANAGER: 'godown_manager',
} as const;

export type AppRole = typeof APP_ROLES[keyof typeof APP_ROLES];