import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { permissionService } from '@/core/services/auth/PermissionService';
import { UserRole } from '@/core/domain/entities/Role';

type AdminRole = 'super_admin' | 'admin' | 'support' | null;

interface AdminContextType {
    isAdmin: boolean;
    adminRole: AdminRole;
    isCheckingAdmin: boolean;
    checkAdminAccess: () => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminRole, setAdminRole] = useState<AdminRole>(null);
    const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

    const checkAdminAccess = useCallback(async (): Promise<boolean> => {
        if (!user?.id) {
            setIsAdmin(false);
            setAdminRole(null);
            return false;
        }

        // Skip admin check on public store pages to prevent 406 errors
        const path = window.location.pathname;
        const isPublicRoute = !path.startsWith('/admin') && !path.startsWith('/dashboard') && path !== '/' && path !== '/login';

        if (isPublicRoute) {
            return false;
        }

        try {
            const userRole = await permissionService.getUserRole(user.id);
            const isSuperAdmin = userRole === UserRole.SUPER_ADMIN;

            if (isSuperAdmin) {
                setIsAdmin(true);
                setAdminRole('super_admin');
                return true;
            }

            // Fallback: Check platform_admins table (legacy support)
            const { data, error } = await supabase
                .from('platform_admins')
                .select('role')
                .eq('email', user.email)
                .maybeSingle();

            if (data && !error) {
                setIsAdmin(true);
                setAdminRole((data as any).role as AdminRole);
                return true;
            }

            setIsAdmin(false);
            setAdminRole(null);
            return false;
        } catch (error) {
            console.error('[AdminContext] Error checking admin access:', error);
            // CRITICAL FIX: Do NOT set isAdmin to false on error (like network timeout or lock timeout).
            // If they were already admin, preserve their state so they don't get kicked out randomly.
            // Just return false so the caller knows the check failed.
            return false;
        }
    }, [user?.id, user?.email]);

    useEffect(() => {
        const verifyAdmin = async () => {
            setIsCheckingAdmin(true);
            await checkAdminAccess();
            setIsCheckingAdmin(false);
        };

        if (isAuthenticated && user?.id) {
            verifyAdmin();
        } else {
            setIsAdmin(false);
            setAdminRole(null);
            setIsCheckingAdmin(false);
        }
    }, [isAuthenticated, user?.id, checkAdminAccess]);

    const value: AdminContextType = {
        isAdmin,
        adminRole,
        isCheckingAdmin,
        checkAdminAccess,
    };

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
}

export function useAdmin() {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
}
