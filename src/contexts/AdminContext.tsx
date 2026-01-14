import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

// Admin email whitelist - add more admins here
const ADMIN_EMAILS = ['info@rsquareidea.my.id', 'admin@rsquareidea.my.id', 'ryussquall@gmail.com'];

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
        if (!user?.email) {
            setIsAdmin(false);
            setAdminRole(null);
            return false;
        }

        // First check hardcoded whitelist for super admin
        console.log('[AdminContext] Checking whitelist for:', user.email);
        if (ADMIN_EMAILS.includes(user.email)) {
            console.log('[AdminContext] User is super admin (whitelist)');
            setIsAdmin(true);
            setAdminRole('super_admin');
            return true;
        }

        // Then check database for other admins
        try {
            const { data, error } = await supabase
                .from('platform_admins')
                .select('role')
                .eq('email', user.email)
                .single();

            if (error || !data) {
                setIsAdmin(false);
                setAdminRole(null);
                return false;
            }

            setIsAdmin(true);
            setAdminRole((data as any).role as AdminRole);
            return true;
        } catch (error) {
            console.error('[AdminContext] Error checking admin access:', error);
            setIsAdmin(false);
            setAdminRole(null);
            return false;
        }
    }, [user?.email]);

    useEffect(() => {
        const verifyAdmin = async () => {
            setIsCheckingAdmin(true);
            await checkAdminAccess();
            setIsCheckingAdmin(false);
        };

        if (isAuthenticated && user) {
            verifyAdmin();
        } else {
            setIsAdmin(false);
            setAdminRole(null);
            setIsCheckingAdmin(false);
        }
    }, [isAuthenticated, user, checkAdminAccess]);

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
