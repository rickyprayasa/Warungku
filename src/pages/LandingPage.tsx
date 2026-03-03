import { motion, useScroll, useTransform, AnimatePresence, useInView, animate } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { UpgradePlanDialog } from '@/components/UpgradePlanDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AppFooter } from '@/components/AppFooter';
import { useRef, useState, useEffect } from 'react';
import { TrendingUp, ShoppingCart, BarChart3, Users, DollarSign, Package, Store, Download, MessageCircle, Facebook, Twitter, Share2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { QRCodeCanvas } from 'qrcode.react';

// Real Stats Component
function RealStatsSection() {
    const [stats, setStats] = useState({
        totalStores: 0,
        totalTransactions: 0,
        totalProducts: 0,
        totalUsers: 0
    });
    const [loading, setLoading] = useState(true);

    // Admin email to exclude from user count
    const ADMIN_EMAILS = ['admin@rsquareidea.my.id'];

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
                // Exclude admin emails from count
                const { data: membersData } = await supabase
                    .from('store_members')
                    .select('user_id, user_auth_data!inner(email)');

                // Get unique user count excluding admins
                const adminUserIds = new Set<string>();
                const uniqueUserIds = new Set<string>();

                (membersData || []).forEach((member: any) => {
                    const email = member?.user_auth_data?.email;
                    if (email && ADMIN_EMAILS.includes(email)) {
                        // This is an admin user, track their ID
                        adminUserIds.add(member.user_id);
                    } else if (member.user_id) {
                        // Regular user, add to count
                        uniqueUserIds.add(member.user_id);
                    }
                });

                const membersCount = uniqueUserIds.size;

                setStats({
                    totalStores: storesCount || 0,
                    totalTransactions: salesCount || 0,
                    totalProducts: productsCount || 0,
                    totalUsers: membersCount || 0
                });

                console.log('[RealStats] Stats fetched:', {
                    stores: storesCount,
                    transactions: salesCount,
                    products: productsCount,
                    users: membersCount,
                    adminUsersExcluded: adminUserIds.size
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
        }
    ];

    function AnimatedCounter({ from, to, suffix = "", duration = 2 }: { from: number, to: number, suffix?: string, duration?: number }) {
        const ref = useRef<HTMLSpanElement>(null);
        const inView = useInView(ref, { once: true, margin: "-50px" });

        useEffect(() => {
            if (inView && ref.current) {
                const controls = animate(from, to, {
                    duration,
                    ease: "easeOut",
                    onUpdate(value) {
                        if (ref.current) {
                            ref.current.textContent = Math.floor(value).toLocaleString() + suffix;
                        }
                    }
                });
                return controls.stop;
            }
        }, [from, to, inView, duration, suffix]);

        return <span ref={ref}>{from}{suffix}</span>;
    }

    return (
        <section className="w-full border-b-3 border-black bg-black text-white py-16 relative overflow-hidden" id="stats">
            <div className="mx-auto max-w-7xl px-6 lg:px-10 relative z-10">
                <div className="text-center mb-12">
                    <motion.h2
                        className="text-4xl md:text-5xl font-black uppercase inline-block border-b-4 border-brand-orange pb-2"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        Angka Yang Berbicara
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {statsData.map((stat, idx) => {
                        const numericValue = parseInt((stat.value as string).replace(/[^0-9]/g, '')) || 0;
                        const hasPlus = (stat.value as string).includes('+');

                        return (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.15, type: 'spring', stiffness: 100 }}
                                className="relative bg-[#111] border-3 border-brand-orange shadow-[8px_8px_0px_0px_#FF6B00] p-8 text-center"
                                whileHover={{ y: -5, boxShadow: "12px 12px 0px 0px #FF6B00" }}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <stat.icon size={64} className="text-brand-orange" />
                                </div>
                                <div className="text-5xl md:text-6xl font-black text-brand-orange mb-4 drop-shadow-[2px_2px_0px_#fff]">
                                    {loading ? '...' : <AnimatedCounter from={0} to={numericValue} suffix={hasPlus ? '+' : ''} duration={2.5} />}
                                </div>
                                <div className="text-lg font-bold uppercase tracking-wider text-white flex items-center justify-center gap-2">
                                    {stat.label}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// Dynamic Testimonials Component - fetches from database
function DynamicTestimonials() {
    const [testimonials, setTestimonials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTestimonials() {
            try {
                const { data, error } = await supabase
                    .from('testimonials')
                    .select('*, stores(name, logo_url)')
                    .eq('status', 'approved')
                    .order('created_at', { ascending: false })
                    .limit(6);

                if (error) throw error;

                if (data && data.length > 0) {
                    setTestimonials(data);
                }
            } catch (error) {
                console.error('Error fetching testimonials:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchTestimonials();
    }, []);

    const getColor = (idx: number) => {
        const colors = ['bg-brand-orange', 'bg-purple-500', 'bg-green-500', 'bg-blue-500', 'bg-pink-500', 'bg-cyan-500'];
        return colors[idx % colors.length];
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Show empty state if no testimonials
    if (testimonials.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-orange border-4 border-brand-black mb-4">
                    <span className="material-symbols-outlined text-4xl text-brand-black" style={{ fontVariationSettings: "'FILL' 1" }}>
                        star
                    </span>
                </div>
                <p className="text-lg font-bold text-brand-black">Jadilah yang pertama memberikan testimoni!</p>
                <p className="text-muted-foreground font-mono text-sm mt-2">Daftar dan bagikan pengalaman Anda menggunakan Omzetin.</p>
            </div>
        );
    }

    return (
        <motion.div
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
            {testimonials.slice(0, 6).map((testimonial, idx) => (
                <motion.div
                    key={testimonial.id || idx}
                    className="flex flex-col justify-between bg-brand-white border-4 border-brand-black p-6 rounded-none shadow-hard hover:shadow-hard-lg hover:-translate-y-1 transition-all"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                >
                    <div className="mb-4">
                        <div className="mb-3 flex gap-1">
                            {[...Array(testimonial.rating || 5)].map((_, i) => (
                                <span
                                    key={i}
                                    className="material-symbols-outlined text-xl text-brand-orange"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    star
                                </span>
                            ))}
                        </div>
                        <p className="text-lg font-medium leading-relaxed text-brand-black">
                            "{testimonial.content || testimonial.quote}"
                        </p>
                    </div>
                    <div className="flex items-center gap-4 border-t-4 border-brand-black pt-4">
                        {testimonial.stores?.logo_url ? (
                            <div className="h-12 w-12 border-4 border-brand-black overflow-hidden bg-white flex items-center justify-center">
                                <img
                                    src={testimonial.stores.logo_url}
                                    alt={testimonial.stores?.name || 'Store'}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        ) : (
                            <div
                                className={`h-12 w-12 ${testimonial.color || getColor(idx)} border-4 border-brand-black flex items-center justify-center text-brand-black font-black text-lg`}
                            >
                                {testimonial.initials || getInitials(testimonial.stores?.name || 'User')}
                            </div>
                        )}
                        <div>
                            <p className="font-bold text-brand-black">{testimonial.name || testimonial.stores?.name || 'Pengguna Omzetin'}</p>
                            <p className="text-sm text-muted-foreground font-mono">{testimonial.role || 'Pemilik UMKM'}</p>
                        </div>
                    </div>
                </motion.div>
            ))}
        </motion.div>
    );
}

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
                                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${item.active ? 'bg-brand-orange text-black' : 'text-gray-400 hover:text-white hover:bg-white/10'
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

    const [activeFeature, setActiveFeature] = useState(0);
    const [activeScreenshot, setActiveScreenshot] = useState(0);

    const features = [
        {
            icon: "point_of_sale",
            title: "POS Kasir",
            desc: "Sistem kasir cepat & mudah. Terima pembayaran tunai, QRIS, dan kartu debit dalam hitungan detik.",
            hoverColor: "",
            color: "bg-brand-orange",
            screenshots: ["/features/kasir.png", "/features/struk.png"],
            highlights: ["Pencarian produk instan", "Keranjang belanja real-time", "Cetak struk otomatis", "Multi metode pembayaran"]
        },
        {
            icon: "inventory_2",
            title: "Manajemen Inventori",
            desc: "Pantau stok barang real-time. Dapatkan notifikasi saat stok menipis agar penjualan tidak terhambat.",
            hoverColor: "",
            color: "bg-blue-500",
            screenshots: ["/features/inventory.png", "/features/detail-produk.png"],
            highlights: ["Stok real-time tracking", "Alert stok rendah & habis", "Metode FIFO/LIFO", "Kategori produk"]
        },
        {
            icon: "account_balance_wallet",
            title: "Laporan Keuangan",
            desc: "Laporan laba rugi otomatis. Tahu persis keuntungan harian, mingguan, dan bulanan tanpa pusing hitung manual.",
            hoverColor: "",
            color: "bg-green-500",
            screenshots: ["/features/laporan-keuangan.png"],
            highlights: ["Pendapatan & HPP otomatis", "Margin laba real-time", "Grafik kinerja bulanan", "Ekspor laporan PDF"]
        },
        {
            icon: "monitoring",
            title: "Analitik Bisnis",
            desc: "Analisis tren penjualan terlaris. Ambil keputusan bisnis berdasarkan data, bukan tebak-tebakan.",
            hoverColor: "",
            color: "bg-purple-500",
            screenshots: ["/features/analitik.png", "/features/analitik2.png", "/features/analitik3.png"],
            highlights: ["Tren pendapatan & profit", "Filter periode fleksibel", "Pertumbuhan vs periode lalu", "Overview bisnis lengkap"]
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
                    <div className="hidden gap-4 md:flex">
                        {[
                            { href: "#features", label: "FITUR" },
                            { href: "#dashboard", label: "DASHBOARD" },
                            { href: "#stories", label: "TESTIMONI" },
                            { href: "#pricing", label: "HARGA" }
                        ].map((link) => (
                            <motion.a
                                key={link.href}
                                className="font-mono uppercase font-bold text-sm text-white border-2 border-transparent rounded-none px-4 py-2 relative group overflow-hidden"
                                href={link.href}
                                whileHover={{
                                    y: -2
                                }}
                                whileTap={{ y: 0, scale: 0.98 }}
                                transition={{ duration: 0.15 }}
                            >
                                <span className="relative z-10">{link.label}</span>
                                <div className="absolute inset-0 bg-brand-black border-2 border-brand-black shadow-hard opacity-0 group-hover:opacity-100 transition-all duration-200 -z-0" />
                            </motion.a>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <motion.button
                            className="hidden sm:flex items-center justify-center gap-2 font-mono uppercase font-bold text-sm text-brand-black bg-white border-2 border-brand-black rounded-none shadow-hard hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-200 px-4 py-2"
                            onClick={() => navigate('/login')}
                        >
                            <span className="material-symbols-outlined text-[18px]">login</span>
                            Masuk
                        </motion.button>
                        <motion.button
                            className="flex items-center justify-center gap-2 font-mono uppercase font-bold text-sm text-white bg-brand-black border-2 border-brand-black rounded-none shadow-hard hover:shadow-hard-sm hover:bg-brand-orange hover:text-brand-black active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all duration-200 px-4 py-2"
                            onClick={() => navigate('/login')}
                        >
                            <span className="material-symbols-outlined text-[18px]">play_circle</span>
                            Coba Demo
                        </motion.button>
                    </div>
                </div>
            </motion.nav>

            <main className="flex flex-col items-center w-full">
                {/* Hero Section */}
                <section className="relative w-full border-b-3 border-black bg-white overflow-hidden">
                    {/* Animated floating elements */}
                    <motion.div
                        className="absolute top-20 left-10 md:left-20 hidden lg:flex items-center justify-center -z-10"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: [0, 0.3, 0], y: [-10, -20] }}
                        viewport={{ once: false, amount: 0.2 }}
                        transition={{ duration: 4, ease: "easeInOut" }}
                    >
                        <span className="material-symbols-outlined text-gray-500" style={{ fontSize: "48px" }}>storefront</span>
                    </motion.div>
                    <motion.div
                        className="absolute bottom-20 right-10 md:right-20 hidden lg:flex items-center justify-center -z-10"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: [0, 0.3, 0], y: [10, -10] }}
                        viewport={{ once: false, amount: 0.2 }}
                        transition={{ duration: 4, ease: "easeInOut", delay: 0.5 }}
                    >
                        <span className="material-symbols-outlined text-gray-500" style={{ fontSize: "56px" }}>fastfood</span>
                    </motion.div>
                    <motion.div
                        className="absolute top-1/3 right-1/4 hidden lg:flex items-center justify-center -z-10"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: [0, 0.3, 0], scale: [1, 1.1] }}
                        viewport={{ once: false, amount: 0.2 }}
                        transition={{ duration: 4, ease: "easeInOut", delay: 1 }}
                    >
                        <span className="material-symbols-outlined text-gray-500" style={{ fontSize: "64px" }}>store</span>
                    </motion.div>

                    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-24">
                        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 items-center">
                            <div className="lg:col-span-7 flex flex-col gap-8 text-center lg:text-left z-10">
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
                                        onClick={() => navigate('/login')}
                                    >
                                        Coba Demo Gratis
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
                                        className="absolute -bottom-10 -right-10 flex items-center justify-center -z-10 pointer-events-none"
                                        initial={{ opacity: 0 }}
                                        whileInView={{ opacity: [0, 0.3, 0], y: [0, -20] }}
                                        viewport={{ once: false, amount: 0.2 }}
                                        transition={{ duration: 4, ease: "easeInOut" }}
                                    >
                                        <span className="material-symbols-outlined text-gray-500" style={{ fontSize: "56px" }}>restaurant</span>
                                    </motion.div>
                                    <motion.div
                                        className="absolute top-10 -left-10 flex items-center justify-center -z-10 pointer-events-none"
                                        initial={{ opacity: 0 }}
                                        whileInView={{ opacity: [0, 0.3, 0], y: [0, 20] }}
                                        viewport={{ once: false, amount: 0.2 }}
                                        transition={{ duration: 5, ease: "easeInOut", delay: 0.5 }}
                                    >
                                        <span className="material-symbols-outlined text-gray-500" style={{ fontSize: "48px" }}>electrical_services</span>
                                    </motion.div>
                                    <motion.div
                                        className="absolute -top-16 right-10 flex items-center justify-center -z-10 pointer-events-none"
                                        initial={{ opacity: 0 }}
                                        whileInView={{ opacity: [0, 0.3, 0], rotate: [0, 15] }}
                                        viewport={{ once: false, amount: 0.2 }}
                                        transition={{ duration: 4, ease: "easeInOut", delay: 1 }}
                                    >
                                        <span className="material-symbols-outlined text-gray-500" style={{ fontSize: "40px" }}>dry_cleaning</span>
                                    </motion.div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Real Stats Section */}
                <RealStatsSection />

                {/* Features Section */}
                <section className="relative w-full border-b-3 border-black bg-white py-24 overflow-hidden" id="features">
                    <div className="mx-auto max-w-7xl px-6 lg:px-10 relative z-10">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={containerVariants}
                        >
                            <motion.div variants={itemVariants} className="mb-16 text-center">
                                <h2 className="text-5xl font-black tracking-tight text-black sm:text-6xl uppercase mb-6 drop-shadow-[4px_4px_0px_rgba(255,255,255,1)]">
                                    Fitur Juara<br />
                                    <motion.span
                                        className="bg-brand-orange text-white px-4 py-1 border-3 border-black shadow-[6px_6px_0px_0px_#000] transform -rotate-2 inline-block mt-2"
                                        whileHover={{ rotate: 0, scale: 1.05 }}
                                    >
                                        Omzetin
                                    </motion.span>
                                </h2>
                                <p className="mx-auto mt-6 max-w-2xl text-xl font-bold text-black bg-white p-6 border-3 border-black shadow-[8px_8px_0px_0px_#000] transform rotate-1">
                                    Semua yang Anda butuhkan untuk menjalankan bisnis UMKM lebih efisien dan menguntungkan.
                                </p>
                            </motion.div>

                            {/* Interactive Feature Showcase */}
                            <motion.div variants={itemVariants} className="flex flex-col lg:flex-row gap-8 items-stretch">
                                {/* Feature Selector Tabs - Left Side */}
                                <div className="lg:w-[340px] flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-x-visible pb-3 lg:pb-0 scrollbar-hide">
                                    {features.map((feature, idx) => (
                                        <motion.button
                                            key={idx}
                                            onClick={() => { setActiveFeature(idx); setActiveScreenshot(0); }}
                                            className={`relative flex items-center gap-4 p-4 lg:p-5 border-3 border-black text-left transition-all duration-300 min-w-[220px] lg:min-w-0 ${activeFeature === idx
                                                ? `${feature.color} text-white shadow-[6px_6px_0px_0px_#000] -translate-x-1 -translate-y-1`
                                                : 'bg-white hover:bg-gray-50 shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5'
                                                }`}
                                            whileTap={{ scale: 0.97 }}
                                        >
                                            {/* Active indicator line */}
                                            {activeFeature === idx && (
                                                <motion.div
                                                    className="absolute left-0 top-0 bottom-0 w-1.5 bg-black"
                                                    layoutId="activeFeatureIndicator"
                                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                                />
                                            )}
                                            <div className={`p-2 border-2 border-black rounded-lg shrink-0 ${activeFeature === idx ? 'bg-white/20' : 'bg-gray-100'
                                                }`}>
                                                <span className={`material-symbols-outlined text-2xl ${activeFeature === idx ? 'text-white' : 'text-black'
                                                    }`}>
                                                    {feature.icon}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className={`font-black uppercase text-sm lg:text-base leading-tight ${activeFeature === idx ? 'text-white' : 'text-black'
                                                    }`}>
                                                    {feature.title}
                                                </h3>
                                                <p className={`text-xs lg:text-sm mt-1 leading-snug line-clamp-2 ${activeFeature === idx ? 'text-white/80' : 'text-gray-500'
                                                    }`}>
                                                    {feature.desc}
                                                </p>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>

                                {/* Screenshot Preview - Right Side */}
                                <div className="flex-1 min-w-0">
                                    <div className="bg-white border-3 border-black shadow-[8px_8px_0px_0px_#000] overflow-hidden">
                                        {/* Browser Chrome Bar */}
                                        <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-b-3 border-black">
                                            <div className="flex gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500" />
                                                <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500" />
                                                <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500" />
                                            </div>
                                            <div className="flex-1 mx-4">
                                                <div className="bg-white border-2 border-gray-300 rounded-full px-4 py-1 text-xs font-mono text-gray-400 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm">lock</span>
                                                    omzetin.web.id
                                                </div>
                                            </div>
                                        </div>

                                        {/* Screenshot Container */}
                                        <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                                            <AnimatePresence mode="wait">
                                                <motion.img
                                                    key={`${activeFeature}-${activeScreenshot}`}
                                                    src={features[activeFeature].screenshots[activeScreenshot] || features[activeFeature].screenshots[0]}
                                                    alt={features[activeFeature].title}
                                                    className="absolute inset-0 w-full h-full object-contain"
                                                    initial={{ opacity: 0, scale: 1.03, filter: 'blur(8px)' }}
                                                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                                                    exit={{ opacity: 0, scale: 0.97, filter: 'blur(8px)' }}
                                                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                                />
                                            </AnimatePresence>

                                            {/* Gradient overlay at bottom */}
                                            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

                                            {/* Feature label badge */}
                                            <motion.div
                                                className={`absolute bottom-4 left-4 ${features[activeFeature].color} text-white font-black uppercase text-sm px-4 py-2 border-2 border-black shadow-[3px_3px_0px_0px_#000]`}
                                                key={`badge-${activeFeature}`}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3, duration: 0.4 }}
                                            >
                                                <span className="material-symbols-outlined text-base align-middle mr-1">{features[activeFeature].icon}</span>
                                                {features[activeFeature].title}
                                            </motion.div>
                                        </div>

                                        {/* Thumbnail carousel (if multiple screenshots) */}
                                        {features[activeFeature].screenshots.length > 1 && (
                                            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-t-2 border-gray-200">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">Preview:</span>
                                                <div className="flex gap-2 overflow-x-auto">
                                                    {features[activeFeature].screenshots.map((src: string, i: number) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => setActiveScreenshot(i)}
                                                            className={`w-20 h-12 border-2 rounded overflow-hidden transition-all shrink-0 ${activeScreenshot === i
                                                                ? 'border-brand-orange ring-2 ring-brand-orange opacity-100 shadow-[2px_2px_0px_0px_#000]'
                                                                : 'border-black opacity-60 hover:opacity-100'
                                                                }`}
                                                        >
                                                            <img src={src} alt="" className="w-full h-full object-cover object-top" />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Feature Highlights */}
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={`highlights-${activeFeature}`}
                                            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6"
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.4, ease: 'easeOut' }}
                                        >
                                            {features[activeFeature].highlights.map((highlight: string, i: number) => (
                                                <motion.div
                                                    key={`${activeFeature}-${i}`}
                                                    className="flex items-center gap-2 bg-white border-2 border-black p-3 shadow-[3px_3px_0px_0px_#000]"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.08, duration: 0.3 }}
                                                >
                                                    <span className={`material-symbols-outlined text-sm ${features[activeFeature].color} text-white p-0.5 border border-black rounded`}>check</span>
                                                    <span className="text-xs font-bold text-black leading-tight">{highlight}</span>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* Dashboard Preview Section with Screenshot */}
                <motion.section
                    ref={sectionRef}
                    className="w-full border-y-3 border-black bg-white py-24 relative overflow-hidden"
                    id="dashboard"
                >
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
                                {/* Decorative icons */}
                                <motion.div
                                    className="absolute -bottom-10 -right-10 flex items-center justify-center -z-10 pointer-events-none"
                                    animate={{ rotate: [-5, 5, -5], y: [0, -10, 0] }}
                                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <span className="material-symbols-outlined text-gray-500 opacity-20" style={{ fontSize: "64px" }}>request_quote</span>
                                </motion.div>
                                <motion.div
                                    className="absolute top-10 -left-10 flex items-center justify-center -z-10 pointer-events-none"
                                    animate={{ y: [0, -15, 0], x: [0, 10, 0] }}
                                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                                >
                                    <span className="material-symbols-outlined text-gray-500 opacity-20" style={{ fontSize: "56px" }}>analytics</span>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.section>

                {/* Public Store / Toko Online Section */}
                <motion.section
                    className="w-full border-y-3 border-black bg-white py-24 relative overflow-hidden"
                    id="toko-online"
                >
                    <div className="mx-auto max-w-7xl px-6 lg:px-10 relative z-10">
                        <div className="flex flex-col-reverse lg:flex-row gap-12 lg:gap-20 items-center">

                            {/* Left: Phone Mockup */}
                            <motion.div
                                className="w-full lg:w-5/12 relative flex justify-center"
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                            >
                                {/* Phone Frame */}
                                <div className="relative w-[300px] h-[600px] bg-white border-4 border-black rounded-[40px] shadow-[16px_16px_0px_0px_#000] overflow-hidden z-10 flex flex-col">
                                    {/* Notch */}
                                    <div className="absolute top-0 inset-x-0 h-6 bg-black rounded-b-3xl w-40 mx-auto z-20"></div>

                                    {/* App UI Header */}
                                    <div className="bg-brand-orange text-white pt-10 pb-4 px-4 shadow-sm relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-brand-orange font-bold text-xl border-2 border-black">
                                                W
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg leading-tight">Warungku</h3>
                                                <p className="text-xs opacity-90">Buka • Pesen sekarang</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* App UI Content */}
                                    <div className="flex-1 bg-gray-50 p-4 overflow-hidden relative">
                                        <div className="mb-4">
                                            <div className="h-8 w-full bg-white border-2 border-black rounded flex items-center px-3 gap-2 text-gray-400 text-sm">
                                                <span className="material-symbols-outlined text-sm">search</span> Cari menu...
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mb-4 overflow-hidden">
                                            <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">Semua</span>
                                            <span className="bg-white border-2 border-black px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">Makanan</span>
                                            <span className="bg-white border-2 border-black px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">Minuman</span>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Product 1 */}
                                            <div className="bg-white p-3 border-2 border-black flex gap-3 shadow-[2px_2px_0px_0px_#000]">
                                                <div className="w-16 h-16 bg-brand-yellow/30 border border-black rounded flex-shrink-0 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-brand-orange text-2xl">local_pizza</span>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-sm">Paket Kenyang</h4>
                                                    <p className="text-brand-orange font-black text-sm mt-1">Rp 25.000</p>
                                                    <button className="mt-2 text-xs bg-black text-white px-3 py-1 rounded w-full font-bold uppercase">Tambah</button>
                                                </div>
                                            </div>
                                            {/* Product 2 */}
                                            <div className="bg-white p-3 border-2 border-black flex gap-3 shadow-[2px_2px_0px_0px_#000]">
                                                <div className="w-16 h-16 bg-blue-100 border border-black rounded flex-shrink-0 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-blue-500 text-2xl">local_cafe</span>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-sm">Kopi Susu Gula Aren</h4>
                                                    <p className="text-brand-orange font-black text-sm mt-1">Rp 15.000</p>
                                                    <button className="mt-2 text-xs bg-black text-white px-3 py-1 rounded w-full font-bold uppercase">Tambah</button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Cart Bar */}
                                        <div className="absolute bottom-4 left-4 right-4 bg-brand-orange border-2 border-black p-3 flex justify-between items-center shadow-[4px_4px_0px_0px_#000]">
                                            <div className="text-white">
                                                <div className="text-xs font-bold">2 Item</div>
                                                <div className="font-black">Rp 40.000</div>
                                            </div>
                                            <div className="bg-white text-black px-4 py-2 font-bold text-sm flex items-center gap-1 border border-black">
                                                Checkout <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Decorative elements behind phone */}
                                <motion.div
                                    className="absolute top-10 -left-10 hidden md:flex items-center justify-center -z-10 pointer-events-none"
                                    animate={{ y: [0, -15, 0], rotate: [-5, 5, -5] }}
                                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <span className="material-symbols-outlined text-gray-500 opacity-20" style={{ fontSize: "56px" }}>storefront</span>
                                </motion.div>
                                <motion.div
                                    className="absolute -bottom-10 -right-10 hidden md:flex items-center justify-center -z-10 pointer-events-none"
                                    animate={{ y: [0, 15, 0], rotate: [0, 10, 0] }}
                                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                >
                                    <span className="material-symbols-outlined text-gray-500 opacity-20" style={{ fontSize: "64px" }}>local_shipping</span>
                                </motion.div>
                                <motion.div
                                    className="absolute top-1/2 -right-10 flex items-center justify-center -z-10 transform -translate-y-1/2 pointer-events-none"
                                    animate={{ scale: [1, 1.1, 1], rotate: [5, -5, 5] }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                                >
                                    <span className="material-symbols-outlined text-gray-500 opacity-20" style={{ fontSize: "48px" }}>shopping_basket</span>
                                </motion.div>
                            </motion.div>

                            {/* Right: Copy & QR */}
                            <div className="lg:w-7/12">
                                <motion.div
                                    initial={{ opacity: 0, x: 50 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.6 }}
                                >
                                    <div className="inline-block bg-white border-2 border-black px-3 py-1 text-sm font-bold uppercase tracking-wider mb-6 shadow-[2px_2px_0px_0px_#000]">
                                        Toko Online Otomatis
                                    </div>
                                    <h2 className="text-4xl lg:text-5xl font-black uppercase mb-6 leading-tight">
                                        Punya Toko Digital <br className="hidden lg:block" />
                                        <span className="text-white bg-black px-2 inline-block transform -rotate-1 mt-2">Tanpa Coding</span>
                                    </h2>
                                    <p className="text-xl font-medium mb-8">
                                        Setiap merchant Omzetin otomatis mendapatkan halaman toko publik. Katalog produk dari kasir langsung tayang di internet!
                                    </p>

                                    <div className="grid sm:grid-cols-2 gap-4 mb-10">
                                        {[
                                            { icon: "link", title: "Link Toko Pendek", desc: "Mudah disebar ke WhatsApp/IG" },
                                            { icon: "qr_code_2", title: "QR Code Meja", desc: "Tinggal scan untuk pesan mandiri" },
                                            { icon: "sync", title: "Satu Katalog", desc: "Update di kasir, update di toko" },
                                            { icon: "shopping_bag", title: "Terima Pesanan", desc: "Orderan masuk langsung ke kasir" }
                                        ].map((feature, idx) => (
                                            <div key={idx} className="flex gap-3 bg-white p-4 border-2 border-black shadow-[4px_4px_0px_0px_#000]">
                                                <div className="w-10 h-10 bg-brand-yellow flex-shrink-0 flex items-center justify-center border-2 border-black">
                                                    <span className="material-symbols-outlined">{feature.icon}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm uppercase">{feature.title}</h4>
                                                    <p className="text-sm text-gray-600 leading-tight mt-1">{feature.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* QR Code Demo */}
                                    <div className="flex flex-col sm:flex-row items-center gap-6 bg-white p-6 border-3 border-black shadow-[8px_8px_0px_0px_#000]">
                                        <div className="border-4 border-black p-2 bg-white flex-shrink-0 w-[120px] h-[120px] flex items-center justify-center">
                                            <QRCodeCanvas
                                                value="https://omzetin.web.id/warungku"
                                                size={100}
                                                level="H"
                                                fgColor="#000000"
                                            />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-xl mb-1 uppercase">Coba Scan QR Ini!</h4>
                                            <p className="text-gray-600 mb-4">Lihat langsung contoh toko online yang bisa didapatkan secara instan.</p>
                                            <div className="flex items-center gap-2 text-sm font-bold bg-gray-100 py-2 px-3 border-2 border-dashed border-gray-400">
                                                <span className="material-symbols-outlined text-gray-500">content_copy</span>
                                                omzetin.web.id/warungku
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                        </div>
                    </div>
                </motion.section>

                {/* Testimonials Section - Dynamic from DB */}
                <section className="relative w-full py-24 overflow-hidden bg-white" id="stories">
                    <div className="mx-auto max-w-7xl px-6 lg:px-10 relative z-10">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={containerVariants}
                        >
                            <motion.div variants={itemVariants} className="mb-12 text-center">
                                <h2 className="text-5xl font-black tracking-tight text-brand-black uppercase sm:text-6xl mb-4">
                                    Kata <span className="text-brand-orange">Mereka</span>
                                </h2>
                                <p className="text-xl font-bold text-brand-black bg-brand-orange inline-block px-6 py-2 border-4 border-brand-black rounded-none shadow-hard">
                                    Bukti nyata dari sesama pemilik UMKM.
                                </p>
                            </motion.div>

                            <DynamicTestimonials />
                        </motion.div>
                    </div>

                    {/* Floating decorative elements */}
                    <motion.div
                        className="absolute top-10 left-10 flex items-center justify-center -z-10 pointer-events-none"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: [0, 0.3, 0], y: [0, -20] }}
                        viewport={{ once: false, amount: 0.2 }}
                        transition={{ duration: 4, ease: "easeInOut" }}
                    >
                        <span className="material-symbols-outlined text-gray-500" style={{ fontSize: "56px" }}>construction</span>
                    </motion.div>
                    <motion.div
                        className="absolute bottom-10 right-10 flex items-center justify-center -z-10 pointer-events-none"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: [0, 0.3, 0], y: [0, 20] }}
                        viewport={{ once: false, amount: 0.2 }}
                        transition={{ duration: 4, ease: "easeInOut", delay: 0.5 }}
                    >
                        <span className="material-symbols-outlined text-gray-500" style={{ fontSize: "48px" }}>local_mall</span>
                    </motion.div>
                </section>


                {/* How to Start / 3 Steps Section */}
                <motion.section
                    className="w-full bg-white py-24 relative overflow-hidden"
                    id="cara-pakai"
                >
                    {/* Floating icons background */}
                    <motion.div
                        className="absolute top-10 right-10 md:top-20 md:right-20 flex items-center justify-center -z-10 pointer-events-none"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: [0, 0.3, 0], y: [0, -20] }}
                        viewport={{ once: false, amount: 0.2 }}
                        transition={{ duration: 4, ease: "easeInOut" }}
                    >
                        <span className="material-symbols-outlined text-gray-500" style={{ fontSize: "64px" }}>inventory_2</span>
                    </motion.div>
                    <motion.div
                        className="absolute bottom-10 left-10 md:bottom-20 md:left-20 flex items-center justify-center -z-10 pointer-events-none"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: [0, 0.3, 0], y: [0, 20] }}
                        viewport={{ once: false, amount: 0.2 }}
                        transition={{ duration: 4, ease: "easeInOut", delay: 0.5 }}
                    >
                        <span className="material-symbols-outlined text-gray-500" style={{ fontSize: "56px" }}>receipt_long</span>
                    </motion.div>

                    <div className="mx-auto max-w-7xl px-6 lg:px-10 relative z-10">
                        <div className="text-center mb-16">
                            <motion.h2
                                className="text-4xl md:text-5xl font-black uppercase inline-block"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                            >
                                Mulai Jualan <span className="text-brand-orange">Hari Ini</span>
                            </motion.h2>
                            <p className="mt-4 text-xl font-bold text-gray-600">Hanya butuh 3 menit untuk transformasi bisnismu.</p>
                        </div>

                        <div className="relative">
                            {/* Connecting Line (Desktop only) */}
                            <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-2 bg-black -translate-y-1/2 -z-10 rounded-full" />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 relative z-10">
                                {/* Step 1 */}
                                <motion.div
                                    className="bg-white border-4 border-black p-8 text-center relative shadow-[8px_8px_0px_0px_#000] group"
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    whileHover={{ y: -8, scale: 1.02, transition: { type: "spring", stiffness: 400, damping: 17 } }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-brand-orange text-white font-black text-2xl flex items-center justify-center border-4 border-black transform -rotate-6 group-hover:rotate-0 transition-transform">
                                        1
                                    </div>
                                    <div className="w-20 h-20 mx-auto mt-4 mb-6 bg-brand-yellow rounded-full border-4 border-black flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl">person_add</span>
                                    </div>
                                    <h3 className="text-2xl font-black uppercase mb-3 text-brand-orange">Daftar Gratis</h3>
                                    <p className="font-bold text-gray-600">Buat akun dengan email, langsung pilih Paket Starter (Rp 0 selamanya).</p>
                                </motion.div>

                                {/* Step 2 */}
                                <motion.div
                                    className="bg-white border-4 border-black p-8 text-center relative shadow-[8px_8px_0px_0px_#000] group mt-8 md:mt-0"
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    whileHover={{ y: -8, scale: 1.02, transition: { type: "spring", stiffness: 400, damping: 17 } }}
                                    transition={{ delay: 0.15, duration: 0.4 }}
                                >
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-blue-500 text-white font-black text-2xl flex items-center justify-center border-4 border-black transform rotate-6 group-hover:rotate-0 transition-transform">
                                        2
                                    </div>
                                    <div className="w-20 h-20 mx-auto mt-4 mb-6 bg-blue-100 rounded-full border-4 border-black flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-blue-600">storefront</span>
                                    </div>
                                    <h3 className="text-2xl font-black uppercase mb-3 text-blue-600">Setup Toko</h3>
                                    <p className="font-bold text-gray-600">Masukkan nama warung, upload logo, dan tambahkan produk pertamamu.</p>
                                </motion.div>

                                {/* Step 3 */}
                                <motion.div
                                    className="bg-white border-4 border-black p-8 text-center relative shadow-[8px_8px_0px_0px_#000] group mt-8 md:mt-0"
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    whileHover={{ y: -8, scale: 1.02, transition: { type: "spring", stiffness: 400, damping: 17 } }}
                                    transition={{ delay: 0.3, duration: 0.4 }}
                                >
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-green-500 text-white font-black text-2xl flex items-center justify-center border-4 border-black transform -rotate-3 group-hover:rotate-0 transition-transform">
                                        3
                                    </div>
                                    <div className="w-20 h-20 mx-auto mt-4 mb-6 bg-green-100 rounded-full border-4 border-black flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-green-600">point_of_sale</span>
                                    </div>
                                    <h3 className="text-2xl font-black uppercase mb-3 text-green-600">Mulai Jualan</h3>
                                    <p className="font-bold text-gray-600">Kasir siap digunakan! Pantau transaksi dan sebar link tokomu ke pelanggan.</p>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* Pricing Table Section - Inline */}
                <motion.section
                    className="w-full bg-white border-t-3 border-black py-24 relative overflow-hidden"
                    id="pricing"
                >
                    {/* Floating icons for Pricing section */}
                    <motion.div
                        className="absolute top-10 left-10 md:left-20 flex items-center justify-center -z-10 pointer-events-none"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: [0, 0.3, 0], y: [0, -20] }}
                        viewport={{ once: false, amount: 0.2 }}
                        transition={{ duration: 4, ease: "easeInOut" }}
                    >
                        <span className="material-symbols-outlined text-gray-500" style={{ fontSize: "56px" }}>sell</span>
                    </motion.div>
                    <motion.div
                        className="absolute bottom-10 right-10 md:right-20 flex items-center justify-center -z-10 pointer-events-none"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: [0, 0.3, 0], y: [0, 20] }}
                        viewport={{ once: false, amount: 0.2 }}
                        transition={{ duration: 4, ease: "easeInOut", delay: 0.5 }}
                    >
                        <span className="material-symbols-outlined text-gray-500" style={{ fontSize: "64px" }}>price_check</span>
                    </motion.div>

                    <div className="mx-auto max-w-7xl px-6 lg:px-10 relative z-10">
                        <div className="text-center mb-16">
                            <motion.h2
                                className="text-4xl md:text-5xl font-black uppercase inline-block mb-4"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                            >
                                Pilih Paket <span className="text-white bg-black px-2 transform -rotate-2 inline-block">Juara</span>
                            </motion.h2>
                            <p className="text-xl font-bold text-gray-700">Investasi terbaik untuk pertumbuhan bisnis Anda.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Free Plan */}
                            <motion.div
                                className="border-4 border-black p-8 flex flex-col relative bg-white shadow-[8px_8px_0px_0px_#000]"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4 }}
                                whileHover={{ y: -5, boxShadow: "12px 12px 0px 0px #000" }}
                            >
                                <div className="mb-6">
                                    <h3 className="text-2xl font-black uppercase inline-block border-b-4 border-gray-300">Starter</h3>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-5xl font-black">Rp 0</span>
                                        <span className="text-sm font-bold text-gray-500 uppercase">/selamanya</span>
                                    </div>
                                    <p className="mt-4 font-bold text-gray-600 border-l-4 border-gray-300 pl-3">Cocok untuk warung kecil yang baru mulai digitalisasi.</p>
                                </div>
                                <ul className="space-y-4 mb-8 flex-1">
                                    {[
                                        "Maksimal 50 Produk",
                                        "Laporan Harian Dasar",
                                        "Manajemen Stok Simpel",
                                        "1 User Kasir",
                                        "Support via Email"
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3 font-bold">
                                            <span className="material-symbols-outlined text-green-500 font-bold border-2 border-green-500 rounded p-0.5 text-sm shadow-[2px_2px_0px_0px_#22c55e]">check</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => navigate('/login')} className="w-full py-4 text-lg border-4 border-black font-black bg-gray-100 hover:bg-gray-200 transition-colors shadow-[4px_4px_0px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 uppercase">
                                    Daftar Gratis
                                </button>
                            </motion.div>

                            {/* Pro Plan */}
                            <motion.div
                                className="border-4 border-black p-8 flex flex-col relative bg-brand-yellow transform md:-translate-y-6 md:scale-105 shadow-[12px_12px_0px_0px_#000] z-10"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                            >
                                <div className="absolute -top-4 -right-4 bg-brand-orange text-white px-4 py-2 text-sm font-black uppercase border-4 border-black shadow-[4px_4px_0px_0px_#000] transform rotate-3">
                                    Paling Laris 🔥
                                </div>
                                <div className="mb-6">
                                    <h3 className="text-2xl font-black uppercase inline-block border-b-4 border-brand-orange">Juragan</h3>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-5xl font-black">Rp 50<span className="text-3xl">rb</span></span>
                                        <span className="text-sm font-bold text-black uppercase">/bulan</span>
                                    </div>
                                    <p className="mt-4 font-bold text-black border-l-4 border-brand-orange pl-3">Untuk UMKM yang siap scale-up dan mengelola cabang.</p>
                                </div>
                                <ul className="space-y-4 mb-8 flex-1">
                                    {[
                                        "Produk Unlimited",
                                        "Laporan Keuangan Lengkap",
                                        "Toko Online Publik",
                                        "Manajemen Stok & Opname",
                                        "5 User Akses Kasir",
                                        "Export Laporan Excel/PDF",
                                        "Support Prioritas WhatsApp"
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3 font-bold">
                                            <span className="material-symbols-outlined text-white bg-black rounded-full p-0.5 text-sm shadow-[2px_2px_0px_0px_#FF6B00]">star</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => navigate('/login')} className="w-full py-4 text-lg border-4 border-black font-black bg-brand-orange text-white hover:bg-black transition-colors shadow-[6px_6px_0px_0px_#000] active:shadow-none active:translate-x-1.5 active:translate-y-1.5 uppercase tracking-wide">
                                    Pilih Paket Juragan
                                </button>
                            </motion.div>

                            {/* Enterprise Plan */}
                            <motion.div
                                className="border-4 border-black p-8 flex flex-col relative bg-[#FCE3FE] shadow-[8px_8px_0px_0px_#000]"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.4, duration: 0.4 }}
                                whileHover={{ y: -5, boxShadow: "12px 12px 0px 0px #000" }}
                            >
                                <div className="mb-6">
                                    <h3 className="text-2xl font-black uppercase inline-block border-b-4 border-purple-500">Sultan</h3>
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-5xl font-black">Custom</span>
                                    </div>
                                    <p className="mt-4 font-bold text-black border-l-4 border-purple-500 pl-3">Solusi khusus untuk franchise & chain store skala besar.</p>
                                </div>
                                <ul className="space-y-4 mb-8 flex-1">
                                    {[
                                        "Semua Fitur Juragan",
                                        "Multi-Cabang / Outlet",
                                        "Dedicated Account Manager",
                                        "Custom Integrasi API",
                                        "SLA Guarantee 99.9%",
                                        "White Label Option"
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3 font-bold">
                                            <span className="material-symbols-outlined text-purple-600 font-bold">diamond</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={() => window.open('https://wa.me/6285846055901?text=' + encodeURIComponent('Halo, saya tertarik dengan paket Sultan/Enterprise Omzetin. Bisa info lebih lanjut?'), '_blank')} className="w-full py-4 text-lg border-4 border-black font-black bg-white hover:bg-purple-100 transition-colors shadow-[4px_4px_0px_0px_#000] active:shadow-none active:translate-x-1 active:translate-y-1 uppercase">
                                    Hubungi Sales
                                </button>
                            </motion.div>
                        </div>
                    </div>
                </motion.section>
            </main>

            <AppFooter />
        </div>
    );
}
