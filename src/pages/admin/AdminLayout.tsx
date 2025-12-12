import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Users,
    Store,
    BarChart3,
    Settings,
    LogOut,
    Shield,
    ChevronLeft,
    Banknote
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';

export function AdminLayout() {
    const { signOut, user } = useAuth();
    const { adminRole } = useAdmin();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const navItems = [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
        { to: '/admin/users', icon: Users, label: 'Users' },
        { to: '/admin/stores', icon: Store, label: 'Stores' },
        { to: '/admin/transactions', icon: Banknote, label: 'Transactions' },
        { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
    ];

    return (
        <div className="min-h-screen bg-gray-100 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-brand-black text-white flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-orange rounded-none flex items-center justify-center border-2 border-white">
                            <Shield className="w-6 h-6 text-brand-black" />
                        </div>
                        <div>
                            <h1 className="font-display font-bold text-lg">ADMIN CMS</h1>
                            <p className="text-xs text-gray-400 font-mono">OMZETIN Platform</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.exact}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 px-4 py-3 rounded-none font-mono text-sm transition-all',
                                    isActive
                                        ? 'bg-brand-orange text-brand-black font-bold'
                                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                )
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 space-y-3">
                    <div className="text-sm">
                        <p className="text-gray-400 font-mono text-xs">Logged in as:</p>
                        <p className="text-white font-mono text-xs truncate">{user?.email}</p>
                        <p className="text-brand-orange font-mono text-xs uppercase mt-1">{adminRole}</p>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-none border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white font-mono"
                        onClick={() => navigate('/')}
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back to App
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full rounded-none text-red-400 hover:bg-red-900/30 hover:text-red-300 font-mono"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>

            <Toaster richColors closeButton theme="light" />
        </div>
    );
}
