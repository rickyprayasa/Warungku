/**
 * Permission Service (Updated for auth.users via raw_app_meta_data)
 * Handles role-based access control and permission checks
 */

import { supabase } from '@/lib/supabase';
import { UserRole, UserPermissions, ROLE_PERMISSIONS, isValidRole } from '@/core/domain/entities/Role';

const isDev = import.meta.env.DEV;
const log = (...args: any[]) => isDev && console.log(...args);

export interface UserWithRole {
  id: string;
  email: string;
  role: UserRole | null;
  is_super_admin: boolean;
}

export class PermissionService {
  private roleCache = new Map<string, UserRole>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get user role from auth.users table
   * Uses SECURITY DEFINER RPC function to bypass RLS
   */
  async getUserRole(userId: string): Promise<UserRole> {
    // Check cache first
    const cached = this.roleCache.get(userId);
    const expiry = this.cacheExpiry.get(userId);

    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    log('[PermissionService] Fetching role for:', userId);
    let role = UserRole.STORE_MEMBER; // default

    try {
      // Prevent indefinite hang if RPC deadlocks
      const rpcPromise = (supabase.rpc as any)('get_user_role_data', {
        p_user_id: userId
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('RPC Timeout')), 5000)
      );

      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]) as any;

      if (!error && data && data.length > 0) {
        const userData = data[0];
        log('[PermissionService] User data:', { email: userData.email, role: userData.role, is_super_admin: userData.is_super_admin });

        if (userData.is_super_admin === true) {
          role = UserRole.SUPER_ADMIN;
        } else if (userData.role === 'super_admin') {
          role = UserRole.SUPER_ADMIN;
        } else if (userData.role && isValidRole(userData.role)) {
          role = userData.role as UserRole;
        }
      } else if (error) {
        console.warn('[PermissionService] RPC error:', error.message);
      }
    } catch (error) {
      console.warn('[PermissionService] Failed to fetch user role (timeout or error):', error);
    }

    log('[PermissionService] Role resolved:', role);

    // Update cache
    this.roleCache.set(userId, role);
    this.cacheExpiry.set(userId, Date.now() + this.CACHE_TTL);

    return role;
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(
    userId: string,
    permission: keyof UserPermissions
  ): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return ROLE_PERMISSIONS[role][permission];
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasAnyRole(userId: string, roles: UserRole[]): Promise<boolean> {
    const userRole = await this.getUserRole(userId);
    return roles.includes(userRole);
  }

  /**
   * Check if user is super admin
   */
  async isSuperAdmin(userId: string): Promise<boolean> {
    // Use RPC function with SECURITY DEFINER
    const { data, error } = await (supabase.rpc as any)('get_user_role_data', {
      p_user_id: userId
    });

    if (error || !data || data.length === 0) {
      return await this.hasAnyRole(userId, [UserRole.SUPER_ADMIN]);
    }

    return data[0].is_super_admin === true || await this.hasAnyRole(userId, [UserRole.SUPER_ADMIN]);
  }

  /**
   * Check if user is store owner
   */
  async isStoreOwner(userId: string): Promise<boolean> {
    return await this.hasAnyRole(userId, [UserRole.SUPER_ADMIN, UserRole.STORE_OWNER]);
  }

  /**
   * Check if user can manage a specific store
   */
  async canManageStore(userId: string, storeId: string): Promise<boolean> {
    // Super admins can manage any store
    if (await this.isSuperAdmin(userId)) {
      return true;
    }

    // Check if user is a member of the store with owner/admin role
    const { data, error } = await supabase
      .from('store_members')
      .select('role')
      .eq('store_id', storeId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return ['owner', 'admin'].includes(data.role);
  }

  /**
   * Check if user is a member of a store
   */
  async isStoreMember(userId: string, storeId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('store_members')
      .select('id')
      .eq('store_id', storeId)
      .eq('user_id', userId)
      .maybeSingle();

    return !error && !!data;
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string): Promise<UserPermissions> {
    const role = await this.getUserRole(userId);
    return ROLE_PERMISSIONS[role];
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(
    adminUserId: string,
    targetUserId: string,
    newRole: UserRole
  ): Promise<void> {
    // Verify admin has permission
    if (!await this.isSuperAdmin(adminUserId)) {
      throw new Error('Only super admins can change user roles');
    }

    // Validate new role
    if (!isValidRole(newRole)) {
      throw new Error(`Invalid role: ${newRole}`);
    }

    // Update role in auth.users (via RPC or direct if allowed)
    const { error } = await (supabase.rpc as any)('update_user_role_auth', {
      p_user_id: targetUserId,
      p_new_role: newRole,
      p_is_super_admin: newRole === UserRole.SUPER_ADMIN
    });

    if (error) {
      throw new Error(`Failed to update role: ${error.message}`);
    }

    // Invalidate cache
    this.clearCache(targetUserId);
  }

  /**
   * Clear role cache (call after role changes)
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.roleCache.delete(userId);
      this.cacheExpiry.delete(userId);
    } else {
      this.roleCache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * Get users by role (admin only)
   */
  async getUsersByRole(role: UserRole): Promise<UserWithRole[]> {
    const { data, error } = await (supabase
      .from('users_view') as any)
      .select('id, email, role, is_super_admin')
      .eq('role', role);

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return (data || []).map(user => ({
      id: user.id,
      email: user.email || '',
      role: user.role as UserRole,
      is_super_admin: user.is_super_admin || false,
    }));
  }

  /**
   * Get all super admins
   */
  async getSuperAdmins(): Promise<UserWithRole[]> {
    return await this.getUsersByRole(UserRole.SUPER_ADMIN);
  }
}

// Export singleton instance
export const permissionService = new PermissionService();
