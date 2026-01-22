import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { UpgradePlanDialog } from '@/components/UpgradePlanDialog';
import { AppFooter } from '@/components/AppFooter';
import { useRef, useState, useEffect } from 'react';
import { TrendingUp, ShoppingCart, BarChart3, Users, DollarSign, Package, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AnimatedLogo } from '@/components/AnimatedLogo';

// Real Stats Component
function RealStatsSection() {
    const [stats, setStats] = useState({
        totalStores: 0,
        totalTransactions: 0,
        totalProducts: 0,
        totalUsers: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRealStats() {
            try {
                // Count total active stores
                const { count: storesCount } = await supabase
                    .from('stores')
                    .select('*', { count: 'exact', head: true });

                // Count total transactions/sales
                const { count: salesCount } = await supabase
                    .from('sales')
                    .select('*', { count: 'exact', head: true });

                // Count total products
                const { count: productsCount } = await supabase
                    .from('products')
                    .select('*', { count: 'exact', head: true });

                // Count total unique users by counting distinct user_ids from store_members
                const { data: membersData } = await supabase
                    .from('store_members')
                    .select('user_id');

                // Get unique user count
                const uniqueUserIds = new Set(membersData?.map(m => m.user_id) || []);
                const membersCount = uniqueUserIds.size;

                setStats({
                    totalStores: storesCount || 0,
                    totalTransactions: salesCount || 0,
                    totalProducts: productsCount || 0,
                    totalUsers: membersCount || 0
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
                // Set default values if fetch fails
                setStats({
                    totalStores: 0,
                    totalTransactions: 0,
                    totalProducts: 0,
                    totalUsers: 0
                });
            } finally {
                setLoading(false);
            }
        }

        fetchRealStats();
    }, []);

    const statsData = [
        {
            value: stats.totalStores > 0 ? `${stats.totalStores}+` : "0",
            label: "Toko Aktif",
            icon: Store
        },
        {
            value: stats.totalTransactions > 0 ? `${stats.totalTransactions.toLocaleString()}` : "0",
            label: "Transaksi Total",
            icon: ShoppingCart
        },
        {
            value: stats.totalProducts > 0 ? `${stats.totalProducts.toLocaleString()}` : "0",
            label: "Produk Terdaftar",
            icon: Package
        },
        {
            value: stats.totalUsers > 0 ? `${stats.totalUsers}+` : "0",
            label: "Pengguna",
            icon: Users
        }
    ];

    return (
        <section className="w-full border-b-3 border-black bg-black text-white py-12">
            <div className="mx-auto max-w-7xl px-6 lg:px-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {statsData.map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="text-center"
                        >
                            <div className="text-4xl md:text-5xl font-black text-brand-orange">
                                {loading ? '...' : stat.value}
                            </div>
                            <div className="text-sm font-bold uppercase tracking-wider mt-2 flex items-center justify-center gap-2">
                                <stat.icon size={16} />
                                {stat.label}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Interactive App Preview Component
function InteractiveAppPreview() {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'analytics'>('dashboard');
    const [cartItems, setCartItems] = useState(0);

    const products = [
        { name: "Kopi Susu Gula Aren", price: 18000, category: "Minuman" },
        { name: "Nasi Goreng Spesial", price: 25000, category: "Makanan" },
        { name: "Teh Tarik", price: 12000, category: "Minuman" },
        { name: "Mie Goreng Jawa", price: 22000, category: "Makanan" },
        { name: "Es Teh Manis", price: 8000, category: "Minuman" },
        { name: "Ayam Bakar", price: 28000, category: "Makanan" }
    ];

    const stats = [
        { label: "Omzet Hari Ini", value: "Rp 2.5jt", change: "+15%", icon: DollarSign, color: "bg-green-500" },
        { label: "Transaksi", value: "48", change: "+8%", icon: ShoppingCart, color: "bg-blue-500" },
        { label: "Produk Terjual", value: "124", change: "Hot", icon: Package, color: "bg-orange-500" },
        { label: "Pelanggan", value: "32", change: "+5%", icon: Users, color: "bg-purple-500" }
    ];

    return (
        <div className="relative w-full">
            {/* Browser Frame */}
            <div className="border-3 border-black bg-white shadow-[12px_12px_0px_0px_#000] overflow-hidden">
                {/* Browser Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-black border-b-3 border-black">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-none bg-[#FF5F56] border-2 border-black/50"></div>
                        <div className="w-3 h-3 rounded-none bg-[#FFBD2E] border-2 border-black/50"></div>
                        <div className="w-3 h-3 rounded-none bg-[#27C93F] border-2 border-black/50"></div>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-white/10 text-xs font-mono border border-black/20">
                            <span className="text-brand-orange">🔒</span>
                            <span className="text-white text-sm font-bold">omzetin.web.id/dashboard</span>
                        </div>
                    </div>
                </div>

                {/* App Content */}
                <div className="flex h-[450px] bg-gray-50">
                    {/* Sidebar */}
                    <div className="w-16 bg-black border-r-3 border-black flex flex-col items-center py-4 gap-4">
                        {[
                            { icon: BarChart3, active: activeTab === 'dashboard', label: 'Dashboard' },
                            { icon: ShoppingCart, active: activeTab === 'pos', label: 'POS' },
                            { icon: TrendingUp, active: activeTab === 'analytics', label: 'Analytics' }
                        ].map((item, idx) => (
                            <motion.button
                                key={idx}
                                onClick={() => setActiveTab(item.active ? (activeTab as any) : (['dashboard', 'pos', 'analytics'][idx] as any))}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                                    item.active ? 'bg-brand-orange text-black' : 'text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <item.icon size={20} />
                            </motion.button>
                        ))}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 p-4 overflow-auto">
                        {activeTab === 'dashboard' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <h3 className="text-xl font-black text-black">Dashboard Overview</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {stats.map((stat, idx) => (
                                        <motion.div
                                            key={idx}
                                            className="bg-white p-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] rounded-lg"
                                            whileHover={{ y: -3, boxShadow: "4px_4px_0px_0px_#000" }}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className={`p-1.5 rounded ${stat.color}`}>
                                                    <stat.icon size={14} className="text-white" />
                                                </div>
                                                <span className="text-xs font-bold text-gray-600 uppercase">{stat.label}</span>
                                            </div>
                                            <div className="text-2xl font-black text-black">{stat.value}</div>
                                            <div className="text-xs font-bold text-green-500 mt-1">{stat.change}</div>
                                        </motion.div>
                                    ))}
                                </div>
                                {/* Mini Chart */}
                                <div className="bg-white p-4 border-2 border-black shadow-[3px_3px_0px_0px_#000] rounded-lg">
                                    <div className="text-sm font-bold text-black mb-3">Penjualan Minggu Ini</div>
                                    <div className="flex items-end gap-2 h-24">
                                        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day, idx) => {
                                            const heights = [40, 55, 45, 70, 90, 85, 60];
                                            return (
                                                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                                                    <motion.div
                                                        className={`w-full ${idx === 4 ? 'bg-brand-orange' : 'bg-gray-200'} border border-black rounded-t`}
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${heights[idx]}%` }}
                                                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                                                    />
                                                    <span className="text-[10px] font-bold text-gray-600">{day}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'pos' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-black">Point of Sale</h3>
                                    <div className="flex items-center gap-2 bg-brand-orange px-3 py-1 border-2 border-black rounded-lg">
                                        <ShoppingCart size={16} />
                                        <span className="font-bold">{cartItems}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {products.map((product, idx) => (
                                        <motion.button
                                            key={idx}
                                            onClick={() => setCartItems(cartItems + 1)}
                                            className="bg-white p-3 border-2 border-black shadow-[3px_3px_0px_0px_#000] rounded-lg text-left hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[3px] hover:translate-y-[3px] active:shadow-none active:translate-x-0 active:translate-y-0 transition-all"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <div className="text-xs font-bold text-brand-orange uppercase mb-1">{product.category}</div>
                                            <div className="text-sm font-black text-black leading-tight">{product.name}</div>
                                            <div className="text-sm font-bold text-black mt-1">Rp {product.price.toLocaleString()}</div>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'analytics' && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <h3 className="text-xl font-black text-black">Analytics</h3>
                                <div className="bg-white p-4 border-2 border-black shadow-[3px_3px_0px_0px_#000] rounded-lg">
                                    <div className="text-sm font-bold text-black mb-3">Produk Terlaris</div>
                                    <div className="space-y-2">
                                        {[
                                            { name: "Kopi Susu Gula Aren", sales: 45, percent: 100 },
                                            { name: "Nasi Goreng Spesial", sales: 38, percent: 84 },
                                            { name: "Teh Tarik", sales: 32, percent: 71 }
                                        ].map((item, idx) => (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span>{item.name}</span>
                                                    <span>{item.sales} terjual</span>
                                                </div>
                                                <div className="h-2 bg-gray-200 border border-black rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-brand-orange"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${item.percent}%` }}
                                                        transition={{ duration: 0.8, delay: idx * 0.1 }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-green-500 text-white p-3 border-2 border-black rounded-lg">
                                        <div className="text-2xl font-black">92%</div>
                                        <div className="text-xs font-bold">Customer Satisfaction</div>
                                    </div>
                                    <div className="bg-blue-500 text-white p-3 border-2 border-black rounded-lg">
                                        <div className="text-2xl font-black">4.8</div>
                                        <div className="text-xs font-bold">Average Rating</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function LandingPage() {
    const navigate = useNavigate();
    const sectionRef = useRef<HTMLElement>(null);

    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"]
    });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15
            }
        }
    };

    const itemVariants = {
        hidden: { y: 30, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring" as const,
                stiffness: 100,
                damping: 12
            }
        }
    };

    const floatVariants = {
        animate: {
            y: [-10, 10, -10],
            transition: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
            }
        }
    };

    // Neo-brutalist button component
    const NeoButton = ({ children, className, variant = "primary", ...props }: any) => {
        const baseClass = "border-3 border-black font-bold transition-all duration-200 shadow-[4px_4px_0px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1";
        const variants = {
            primary: "bg-brand-orange text-black hover:bg-white",
            secondary: "bg-white text-black hover:bg-[#F2F2F2]",
            black: "bg-black text-white hover:bg-brand-orange hover:text-black",
        };
        return (
            <motion.button
                className={`${baseClass} ${variants[variant]} ${className}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                {...props}
            >
                {children}
            </motion.button>
        );
    };

    // Neo card component
    const NeoCard = ({ children, className, hoverColor = "hover:bg-brand-yellow", ...props }: any) => {
        return (
            <motion.div
                className={`bg-white border-3 border-black shadow-[6px_6px_0px_0px_#000] transition-all duration-200 hover:shadow-[8px_8px_0px_0px_#000] hover:-translate-x-1 hover:-translate-y-1 p-6 ${hoverColor} ${className}`}
                whileHover={{ y: -5 }}
                {...props}
            >
                {children}
            </motion.div>
        );
    };

    const features = [
        {
            icon: "point_of_sale",
            title: "POS Kasir",
            desc: "Sistem kasir cepat & mudah. Terima pembayaran tunai, QRIS, dan kartu debit dalam hitungan detik.",
            hoverColor: "hover:bg-brand-yellow",
            color: "bg-brand-orange"
        },
        {
            icon: "inventory_2",
            title: "Manajemen Inventori",
            desc: "Pantau stok barang real-time. Dapatkan notifikasi saat stok menipis agar penjualan tidak terhambat.",
            hoverColor: "hover:bg-blue-500 hover:text-white",
            color: "bg-blue-500"
        },
        {
            icon: "account_balance_wallet",
            title: "Laporan Keuangan",
            desc: "Laporan laba rugi otomatis. Tahu persis keuntungan harian, mingguan, dan bulanan tanpa pusing hitung manual.",
            hoverColor: "hover:bg-green-500",
            color: "bg-green-500"
        },
        {
            icon: "monitoring",
            title: "Analitik Bisnis",
            desc: "Analisis tren penjualan terlaris. Ambil keputusan bisnis berdasarkan data, bukan tebak-tebakan.",
            hoverColor: "hover:bg-purple-500 hover:text-white",
            color: "bg-purple-500"
        }
    ];

    const testimonials = [
        {
            name: "Budi Santoso",
            role: "Pemilik, Kopi Senja",
            initials: "BU",
            color: "bg-blue-500",
            quote: "Omzetin bikin hidup saya tenang. Gak perlu begadang lagi cuma buat rekap penjualan harian. Mantap!",
            borderColor: "border-l-4 border-brand-orange"
        },
        {
            name: "Siti Aminah",
            role: "Owner, Toko Berkah",
            initials: "SI",
            color: "bg-purple-500",
            quote: "Fitur stoknya juara. Dulu sering kehabisan barang pas rame, sekarang udah ada notif otomatis.",
            borderColor: "border-l-4 border-purple-500"
        },
        {
            name: "Andi Pratama",
            role: "Manager, Burger Bro",
            initials: "AN",
            color: "bg-green-500",
            quote: "Tampilannya keren tapi gampang dipake. Kasir saya yang gaptek aja langsung bisa dalam 10 menit.",
            borderColor: "border-l-4 border-green-500"
        }
    ];

    return (
        <div className="flex flex-col min-h-screen bg-white overflow-x-hidden">
            {/* Add Material Symbols font */}
            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
            />
            <link
                rel="stylesheet"
                href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;700;800;900&display=swap"
            />

            {/* Navigation */}
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
                className="sticky top-0 z-50 w-full border-b-4 border-black bg-brand-orange/90 backdrop-blur-sm"
            >
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
                    <motion.div
                        className="flex items-center gap-3"
                        whileHover={{ scale: 1.05 }}
                    >
                        <AnimatedLogo textColor="text-brand-white" />
                    </motion.div>
                    <div className="hidden gap-6 md:flex">
                        {[
                            { href: "#features", text: "Fitur" },
                            { href: "#dashboard", text: "Dashboard" },
                            { href: "#stories", text: "Testimoni" },
                            { href: "#pricing", text: "Harga" }
                        ].map((link) => (
                            <motion.a
                                key={link.href}
                                className="text-base font-bold text-white relative group px-2 py-1"
                                href={link.href}
                                whileHover={{ y: -2 }}
                                whileTap={{ y: 0 }}
                            >
                                {link.text}
                                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300" />
                            </motion.a>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <motion.button
                            className="hidden sm:block text-base font-bold text-white border-2 border-white/30 hover:border-white hover:bg-white hover:text-brand-black px-4 py-2 rounded transition-all"
                            onClick={() => navigate('/login')}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Masuk
                        </motion.button>
                        <NeoButton
                            variant="secondary"
                            className="h-11 px-5 text-base bg-white text-brand-black hover:bg-black hover:text-white border-2 border-white hover:border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] hover:shadow-[3px_3px_0px_0px_#000] rounded transition-all"
                            onClick={() => navigate('/register')}
                        >
                            Daftar
                        </NeoButton>
                    </div>
                </div>
            </motion.nav>

            <main className="flex flex-col items-center w-full">
                {/* Hero Section */}
                <section className="relative w-full border-b-3 border-black bg-white overflow-hidden" style={{
                    backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}>
                    {/* Animated floating elements */}
                    <motion.div
                        variants={floatVariants}
                        animate="animate"
                        className="absolute top-20 left-10 w-20 h-20 bg-purple-500 border-3 border-black rounded-full opacity-20 hidden lg:block"
                    />
                    <motion.div
                        variants={floatVariants}
                        animate="animate"
                        transition={{ delay: 0.5 }}
                        className="absolute bottom-20 right-10 w-32 h-32 bg-brand-yellow border-3 border-black rounded-full opacity-20 hidden lg:block"
                    />
                    <motion.div
                        variants={floatVariants}
                        animate="animate"
                        transition={{ delay: 1 }}
                        className="absolute top-1/2 right-1/4 w-16 h-16 bg-brand-orange border-3 border-black rounded-full opacity-20 hidden lg:block"
                    />

                    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-24">
                        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 items-center">
                            <div className="lg:col-span-7 flex flex-col gap-8 text-center lg:text-left z-10">
                                <motion.div
                                    initial={{ opacity: 0, y: 20, rotate: -5 }}
                                    animate={{ opacity: 1, y: 0, rotate: -1 }}
                                    transition={{ duration: 0.5 }}
                                    className="inline-flex items-center self-center gap-2 border-3 border-black bg-brand-yellow px-4 py-2 font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_#000] transform -rotate-1 lg:self-start"
                                >
                                    <motion.span
                                        animate={{ rotate: [0, 360] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="material-symbols-outlined text-base"
                                    >
                                        verified
                                    </motion.span>
                                    #1 POS App for MSMEs
                                </motion.div>
                                <motion.h1
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.1 }}
                                    className="text-6xl font-black leading-[0.95] tracking-tight text-black sm:text-7xl lg:text-8xl"
                                >
                                    Satu Aplikasi,<br />
                                    <motion.span
                                        className="inline-block bg-brand-orange px-2 text-white border-3 border-black shadow-[5px_5px_0px_0px_#000] transform rotate-2"
                                        whileHover={{ scale: 1.05, rotate: 0 }}
                                    >
                                        Semua Solusi
                                    </motion.span>
                                    <span className="block mt-2">UMKM</span>
                                </motion.h1>
                                <motion.p
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className="text-xl font-bold leading-relaxed text-gray-800 lg:max-w-xl border-l-4 border-black pl-6 bg-white py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                                >
                                    Kelola kasir, stok, dan laporan keuangan dalam satu genggaman. Tingkatkan omzet bisnis Anda tanpa ribet, tanpa drama.
                                </motion.p>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.3 }}
                                    className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start pt-4"
                                >
                                    <NeoButton
                                        variant="primary"
                                        className="h-14 px-8 text-lg flex items-center justify-center gap-3"
                                        onClick={() => navigate('/register')}
                                    >
                                        Coba Gratis
                                        <span className="material-symbols-outlined text-2xl">arrow_forward</span>
                                    </NeoButton>
                                    <NeoButton
                                        variant="secondary"
                                        className="h-14 px-8 text-lg flex items-center justify-center gap-2"
                                        onClick={() => navigate('/warungku')}
                                    >
                                        <motion.span
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="material-symbols-outlined text-2xl"
                                        >
                                            play_circle
                                        </motion.span>
                                        Lihat Demo
                                    </NeoButton>
                                </motion.div>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: 0.4 }}
                                    className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm font-bold text-black lg:justify-start"
                                >
                                    {[
                                        { icon: "check_box", text: "Tanpa Kartu Kredit" },
                                        { icon: "check_box", text: "Gratis 14 Hari" }
                                    ].map((item, idx) => (
                                        <motion.div
                                            key={idx}
                                            className="flex items-center gap-2 bg-white border-2 border-black px-2 py-1 shadow-[2px_2px_0px_0px_#000]"
                                            whileHover={{ scale: 1.05 }}
                                        >
                                            <span className="material-symbols-outlined text-lg">{item.icon}</span>
                                            {item.text}
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </div>

                            {/* Interactive App Preview */}
                            <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.8, delay: 0.3 }}
                                    className="relative w-full max-w-xl"
                                >
                                    <InteractiveAppPreview />

                                    {/* Decorative Elements */}
                                    <motion.div
                                        className="absolute -bottom-4 -right-4 w-full h-full bg-brand-orange/20 rounded-xl -z-10 border-3 border-black/10 transform rotate-1"
                                        animate={{ rotate: [1, 2, 1] }}
                                        transition={{ duration: 4, repeat: Infinity }}
                                    />
                                    <motion.div
                                        className="absolute -top-4 -left-4 w-full h-full bg-blue-500/10 rounded-xl -z-10 border-3 border-black/10 transform -rotate-1"
                                        animate={{ rotate: [-1, -2, -1] }}
                                        transition={{ duration: 5, repeat: Infinity }}
                                    />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Real Stats Section */}
                <RealStatsSection />

                {/* Features Section */}
                <section className="relative w-full max-w-7xl px-6 py-20 lg:px-10 mx-auto" id="features">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={containerVariants}
                    >
                        <motion.div variants={itemVariants} className="mb-12 text-center md:mb-20">
                            <h2 className="text-5xl font-black tracking-tight text-black sm:text-6xl uppercase mb-6">
                                Fitur Juara<br />
                                <motion.span
                                    className="bg-black text-white px-3 border-3 border-black shadow-[3px_3px_0px_0px_#000] transform -rotate-1 inline-block"
                                    whileHover={{ rotate: 1, scale: 1.05 }}
                                >
                                    Omzetin
                                </motion.span>
                            </h2>
                            <p className="mx-auto mt-4 max-w-2xl text-xl font-bold text-gray-700 bg-white p-4 border-2 border-black shadow-[3px_3px_0px_0px_#000]">
                                Semua yang Anda butuhkan untuk menjalankan bisnis UMKM lebih efisien dan menguntungkan.
                            </p>
                        </motion.div>
                        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {features.map((feature, idx) => (
                                <NeoCard key={idx} hoverColor={feature.hoverColor} className="flex flex-col items-start gap-4 group overflow-hidden">
                                    <motion.div
                                        className="w-full h-24 border-b-3 border-black flex items-center justify-center relative overflow-hidden group-hover:bg-black/5 transition-colors"
                                        style={{ backgroundColor: feature.color }}
                                        whileHover={{ scale: 1.02 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {/* Animated background pattern */}
                                        <div className="absolute inset-0 opacity-20">
                                            <div className="absolute top-2 left-2 w-3 h-3 border-2 border-black rounded-full" />
                                            <div className="absolute top-2 right-2 w-3 h-3 border-2 border-black rounded-full" />
                                            <div className="absolute bottom-2 left-2 w-3 h-3 border-2 border-black rounded-full" />
                                            <div className="absolute bottom-2 right-2 w-3 h-3 border-2 border-black rounded-full" />
                                        </div>
                                        <motion.span
                                            className="material-symbols-outlined text-5xl text-black font-bold relative z-10"
                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {feature.icon}
                                        </motion.span>
                                    </motion.div>
                                    <div className="p-4 pt-2">
                                        <h3 className="text-xl font-black uppercase mb-2 w-full" style={{ color: feature.color.replace('bg-', 'text-').replace('-500', '-600') }}>
                                            {feature.title}
                                        </h3>
                                        <p className="font-bold text-gray-700 leading-snug text-sm">
                                            {feature.desc}
                                        </p>
                                    </div>
                                </NeoCard>
                            ))}
                        </motion.div>
                    </motion.div>
                </section>

                {/* Dashboard Preview Section with Screenshot */}
                <motion.section
                    ref={sectionRef}
                    className="w-full border-y-3 border-black bg-[#F2F2F2] py-24 relative overflow-hidden"
                    style={{
                        background: 'repeating-linear-gradient(45deg, #fff, #fff 10px, #f2f2f2 10px, #f2f2f2 20px)'
                    }}
                    id="dashboard"
                >
                    <motion.div
                        className="absolute inset-0 opacity-5"
                        style={{
                            backgroundImage: 'radial-gradient(#000 2px, transparent 2px)',
                            backgroundSize: '30px 30px'
                        }}
                    />
                    <div className="mx-auto max-w-7xl px-6 lg:px-10 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="flex flex-col lg:flex-row gap-12 items-center"
                        >
                            <div className="lg:w-1/3">
                                <motion.h2
                                    className="text-5xl font-black uppercase mb-6 leading-tight"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                >
                                    Lihat Bisnismu <span className="text-brand-orange bg-black px-2">Tumbuh</span>
                                </motion.h2>
                                <p className="text-xl font-bold mb-8 border-l-4 border-black pl-4">
                                    Dashboard simpel yang memberikan gambaran lengkap kesehatan bisnismu dalam satu layar.
                                </p>
                                <ul className="flex flex-col gap-4 font-bold text-lg">
                                    {[
                                        { icon: "check", color: "bg-brand-orange", text: "Grafik Penualan Real-time" },
                                        { icon: "check", color: "bg-blue-500", text: "Produk Terlaris" },
                                        { icon: "check", color: "bg-green-500", text: "Laporan Keuangan Otomatis" },
                                        { icon: "check", color: "bg-purple-500", text: "Metode Pembayaran Favorit" }
                                    ].map((item, idx) => (
                                        <motion.li
                                            key={idx}
                                            className="flex items-center gap-3"
                                            initial={{ opacity: 0, x: -20 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            viewport={{ once: true }}
                                            transition={{ delay: idx * 0.1 }}
                                        >
                                            <span className={`material-symbols-outlined ${item.color} border-2 border-black p-1 text-white shadow-[2px_2px_0px_0px_#000]`}>
                                                {item.icon}
                                            </span>
                                            {item.text}
                                        </motion.li>
                                    ))}
                                </ul>
                            </div>
                            <motion.div
                                className="lg:w-2/3 w-full"
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                            >
                                <motion.div
                                    className="w-full bg-white border-3 border-black shadow-[12px_12px_0px_0px_#000] p-2 md:p-4 relative"
                                    whileHover={{ y: -5 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {/* Browser header */}
                                    <div className="absolute top-0 left-0 w-full h-10 border-b-3 border-black bg-brand-yellow flex items-center px-4 gap-2 z-10 rounded-t-lg">
                                        <div className="flex gap-1.5">
                                            <div className="w-3 h-3 rounded-none bg-white border-2 border-black"></div>
                                            <div className="w-3 h-3 rounded-none bg-black border-2 border-black"></div>
                                        </div>
                                        <div className="text-xs font-black uppercase ml-auto text-black">Laporan Keuangan - Omzetin</div>
                                    </div>
                                    {/* Screenshot image with proper aspect ratio */}
                                    <div className="relative w-full pt-[56.25%] bg-gray-100 overflow-hidden rounded-b-lg mt-10">
                                        <img
                                            src="/Laporan Keuangan.png"
                                            alt="Dashboard Laporan Keuangan"
                                            className="absolute top-0 left-0 w-full h-full object-contain"
                                        />
                                    </div>
                                </motion.div>
                                {/* Decorative elements */}
                                <motion.div
                                    className="absolute -bottom-6 -right-6 w-full h-full bg-brand-orange/20 border-3 border-black/10 -z-10 transform rotate-2"
                                    animate={{ rotate: [2, 3, 2] }}
                                    transition={{ duration: 4, repeat: Infinity }}
                                />
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.section>

                {/* Testimonials Section */}
                <section className="relative w-full max-w-7xl px-6 py-24 lg:px-10 mx-auto" id="stories">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={containerVariants}
                    >
                        <motion.div variants={itemVariants} className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-3 border-black pb-8">
                            <div>
                                <h2 className="text-5xl font-black tracking-tight text-black uppercase sm:text-6xl">Kata Mereka</h2>
                                <p className="mt-4 text-xl font-bold bg-brand-yellow inline-block px-2 border-2 border-black shadow-[3px_3px_0px_0px_#000]">
                                    Bukti nyata dari sesama pemilik UMKM.
                                </p>
                            </div>
                        </motion.div>
                        <motion.div variants={itemVariants} className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                            {testimonials.map((testimonial, idx) => (
                                <motion.div
                                    key={idx}
                                    className={`flex flex-col justify-between border-3 border-black ${idx === 1 ? 'bg-[#F2F2F2]' : 'bg-white'} p-8 shadow-[5px_5px_0px_0px_#000] hover:shadow-[8px_8px_0px_0px_#000] transition-all`}
                                    whileHover={{ y: -10 }}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1 }}
                                >
                                    <div className="mb-6">
                                        <motion.div
                                            className="mb-4 flex gap-1 bg-black w-fit px-2 py-1"
                                            whileHover={{ scale: 1.05 }}
                                        >
                                            {[...Array(5)].map((_, i) => (
                                                <motion.span
                                                    key={i}
                                                    className="material-symbols-outlined text-xl text-brand-orange fill-current"
                                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                                    whileHover={{ scale: 1.2 }}
                                                >
                                                    star
                                                </motion.span>
                                            ))}
                                        </motion.div>
                                        <p className={`text-lg font-bold leading-relaxed text-black ${testimonial.borderColor} pl-3`}>
                                            "{testimonial.quote}"
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4 border-t-3 border-black pt-6">
                                        <motion.div
                                            className={`h-14 w-14 border-2 border-black ${testimonial.color} shadow-[2px_2px_0px_0px_#000] flex items-center justify-center ${idx === 2 ? 'text-black' : 'text-white'} font-black text-xl`}
                                            whileHover={{ rotate: 360, scale: 1.1 }}
                                            transition={{ duration: 0.6 }}
                                        >
                                            {testimonial.initials}
                                        </motion.div>
                                        <div>
                                            <p className="font-black text-black uppercase">{testimonial.name}</p>
                                            <p className="text-sm font-bold text-gray-600">{testimonial.role}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>
                </section>

                {/* Pricing CTA Section */}
                <motion.section
                    className="w-full max-w-7xl px-6 py-20 lg:px-10 mx-auto"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    id="pricing"
                >
                    <motion.div
                        className="relative overflow-hidden border-3 border-black bg-brand-orange px-6 py-16 text-center shadow-[12px_12px_0px_0px_#000] sm:px-12 sm:py-24"
                        style={{
                            backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
                            backgroundSize: '20px 20px'
                        }}
                        whileHover={{ scale: 1.01 }}
                    >
                        <motion.div
                            className="absolute top-0 right-0 w-32 h-32 bg-brand-yellow border-b-3 border-l-3 border-black"
                            animate={{ rotate: [0, 5, 0] }}
                            transition={{ duration: 5, repeat: Infinity }}
                        />
                        <motion.div
                            className="absolute bottom-0 left-0 w-24 h-24 bg-white border-t-3 border-r-3 border-black"
                            animate={{ rotate: [0, -5, 0] }}
                            transition={{ duration: 6, repeat: Infinity }}
                        />
                        <motion.div
                            className="relative z-10 mx-auto max-w-3xl bg-white border-3 border-black p-8 sm:p-12 shadow-[5px_5px_0px_0px_#000] transform rotate-1"
                            whileHover={{ rotate: 0, scale: 1.02 }}
                        >
                            <motion.h2
                                className="mb-6 text-4xl font-black tracking-tight text-black uppercase sm:text-6xl"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                            >
                                Siap Scale Up?
                            </motion.h2>
                            <p className="mb-10 text-xl font-medium text-gray-800">
                                Bergabunglah dengan ribuan pebisnis UMKM yang telah sukses bersama Omzetin.
                            </p>
                            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                                <NeoButton
                                    variant="black"
                                    className="h-16 w-full px-8 text-xl sm:w-auto shadow-[8px_8px_0px_0px_#000]"
                                    onClick={() => navigate('/register')}
                                >
                                    Mulai Gratis Sekarang
                                </NeoButton>
                                <UpgradePlanDialog
                                    trigger={
                                        <NeoButton
                                            variant="secondary"
                                            className="h-16 w-full px-8 text-xl sm:w-auto"
                                        >
                                            Lihat Paket Harga
                                        </NeoButton>
                                    }
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.section>
            </main>

            <AppFooter />
        </div>
    );
}
