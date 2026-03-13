/**
 * Domain Entity - Role
 * Defines user roles and permissions for the application
 */

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  STORE_OWNER = 'store_owner',
  STORE_MEMBER = 'store_member',
  CASHIER = 'cashier',
}

/**
 * Permission flags for each role
 * These define what actions each role can perform
 */
export interface UserPermissions {
  // User Management
  canManageUsers: boolean;        // Create, update, delete users
  canManageAdminSettings: boolean; // Access admin dashboard

  // Store Management
  canManageStores: boolean;       // Create, update, delete stores
  canManageStoreSettings: boolean; // Modify store configuration
  canViewStoreAnalytics: boolean; // View store statistics

  // Product Management
  canManageProducts: boolean;     // Create, update, delete products
  canViewProducts: boolean;       // View product list

  // Sales Management
  canCreateSales: boolean;        // Create new sales
  canViewSales: boolean;          // View sales history
  canProcessRefunds: boolean;     // Process refunds
  canDeleteSales: boolean;        // Delete sales records

  // Inventory Management
  canManageInventory: boolean;    // Adjust stock levels
  canViewInventory: boolean;      // View inventory reports
  canManageSuppliers: boolean;    // Manage supplier information

  // Team Management
  canManageTeamMembers: boolean;  // Add/remove team members
  canManageMemberRoles: boolean;  // Change member roles

  // Financial
  canViewFinancialReports: boolean; // View profit/loss
  canManageSubscriptions: boolean;  // Manage subscription plans

  // Customer Management
  canManageCustomers: boolean;    // Manage customer data
  canViewCustomerData: boolean;   // View customer information
}

/**
 * Role-Permission Matrix
 * Defines which permissions each role has
 */
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  [UserRole.SUPER_ADMIN]: {
    // Full system access
    canManageUsers: true,
    canManageAdminSettings: true,
    canManageStores: true,
    canManageStoreSettings: true,
    canViewStoreAnalytics: true,
    canManageProducts: true,
    canViewProducts: true,
    canCreateSales: true,
    canViewSales: true,
    canProcessRefunds: true,
    canDeleteSales: true,
    canManageInventory: true,
    canViewInventory: true,
    canManageSuppliers: true,
    canManageTeamMembers: true,
    canManageMemberRoles: true,
    canViewFinancialReports: true,
    canManageSubscriptions: true,
    canManageCustomers: true,
    canViewCustomerData: true,
  },

  [UserRole.STORE_OWNER]: {
    // Full store management, no system-wide access
    canManageUsers: false,
    canManageAdminSettings: false,
    canManageStores: true,
    canManageStoreSettings: true,
    canViewStoreAnalytics: true,
    canManageProducts: true,
    canViewProducts: true,
    canCreateSales: true,
    canViewSales: true,
    canProcessRefunds: true,
    canDeleteSales: true,
    canManageInventory: true,
    canViewInventory: true,
    canManageSuppliers: true,
    canManageTeamMembers: true,
    canManageMemberRoles: true,
    canViewFinancialReports: true,
    canManageSubscriptions: false,
    canManageCustomers: true,
    canViewCustomerData: true,
  },

  [UserRole.STORE_MEMBER]: {
    // Limited store access
    canManageUsers: false,
    canManageAdminSettings: false,
    canManageStores: false,
    canManageStoreSettings: false,
    canViewStoreAnalytics: false,
    canManageProducts: true,
    canViewProducts: true,
    canCreateSales: true,
    canViewSales: true,
    canProcessRefunds: false,
    canDeleteSales: false,
    canManageInventory: true,
    canViewInventory: true,
    canManageSuppliers: true,
    canManageTeamMembers: false,
    canManageMemberRoles: false,
    canViewFinancialReports: false,
    canManageSubscriptions: false,
    canManageCustomers: false,
    canViewCustomerData: true,
  },

  [UserRole.CASHIER]: {
    // POS-only access
    canManageUsers: false,
    canManageAdminSettings: false,
    canManageStores: false,
    canManageStoreSettings: false,
    canViewStoreAnalytics: false,
    canManageProducts: false,
    canViewProducts: true,
    canCreateSales: true,
    canViewSales: true,
    canProcessRefunds: false,
    canDeleteSales: false,
    canManageInventory: false,
    canViewInventory: true, // Can view stock levels
    canManageSuppliers: false,
    canManageTeamMembers: false,
    canManageMemberRoles: false,
    canViewFinancialReports: false,
    canManageSubscriptions: false,
    canManageCustomers: false,
    canViewCustomerData: true,
  },
};

/**
 * Helper function to get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'Super Admin',
    [UserRole.STORE_OWNER]: 'Pemilik Toko',
    [UserRole.STORE_MEMBER]: 'Staf Toko',
    [UserRole.CASHIER]: 'Kasir',
  };
  return displayNames[role] || role;
}

/**
 * Helper function to get role badge color
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'bg-purple-500 text-white border-2 border-purple-600',
    [UserRole.STORE_OWNER]: 'bg-blue-500 text-white border-2 border-blue-600',
    [UserRole.STORE_MEMBER]: 'bg-green-500 text-white border-2 border-green-600',
    [UserRole.CASHIER]: 'bg-orange-500 text-white border-2 border-orange-600',
  };
  return colors[role] || 'bg-gray-500 text-white';
}

/**
 * Type guard to check if a string is a valid UserRole
 */
export function isValidRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

/**
 * Get all available roles
 */
export function getAllRoles(): UserRole[] {
  return Object.values(UserRole);
}
