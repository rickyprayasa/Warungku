import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Star, Zap, TrendingUp, Shield, Smartphone, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UpgradePlanDialog } from '@/components/UpgradePlanDialog';
import { AppFooter } from '@/components/AppFooter';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
export function LandingPage() {
    const navigate = useNavigate();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring" as const,
                stiffness: 100
            }
        }
    };

    const screenshots = [
        "/dashboard-preview.png",
        "/pos-preview.png",
        "/analytics-preview.png"
    ];

    const [currentScreenshot, setCurrentScreenshot] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentScreenshot((prev) => (prev + 1) % screenshots.length);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-48 bg-brand-black text-white">
                <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
                <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-orange/10 blur-3xl transform translate-x-1/2" />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <span className="inline-block py-1 px-3 rounded-full bg-brand-orange/20 text-brand-orange font-mono text-sm font-bold mb-6 border border-brand-orange/50">
                                🚀 Aplikasi Kasir & Manajemen Toko #1
                            </span>
                            <h1 className="text-5xl md:text-7xl font-display font-bold mb-8 leading-tight">
                                Kelola Bisnis Jadi <br />
                                <span className="text-brand-orange">Lebih Menyenangkan</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-300 mb-10 font-mono max-w-2xl mx-auto">
                                Omzetin membantu Anda mencatat penjualan, stok, dan laporan keuangan dalam satu aplikasi yang mudah digunakan.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    size="lg"
                                    onClick={() => navigate('/register')}
                                    className="bg-brand-orange text-brand-black hover:bg-white hover:text-brand-black font-bold text-lg px-8 h-14 rounded-none border-2 border-transparent hover:border-brand-black transition-all"
                                >
                                    Coba Gratis Sekarang
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    onClick={() => navigate('/warungku')}
                                    className="bg-transparent text-white border-2 border-white hover:bg-white hover:text-brand-black font-bold text-lg px-8 h-14 rounded-none transition-all"
                                >
                                    Lihat Demo Toko
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <motion.div
                    animate={{ y: [0, -20, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/4 left-10 hidden lg:block"
                >
                    <div className="bg-white text-brand-black p-4 rounded-lg shadow-hard border-2 border-brand-black transform -rotate-6">
                        <TrendingUp className="w-8 h-8 text-green-500 mb-2" />
                        <div className="font-bold font-mono">Omzet Naik 🚀</div>
                    </div>
                </motion.div>

                <motion.div
                    animate={{ y: [0, 20, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-1/4 right-10 hidden lg:block"
                >
                    <div className="bg-white text-brand-black p-4 rounded-lg shadow-hard border-2 border-brand-black transform rotate-6">
                        <Zap className="w-8 h-8 text-brand-orange mb-2" />
                        <div className="font-bold font-mono">Transaksi Cepat ⚡</div>
                    </div>
                </motion.div>

                {/* Dashboard Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative z-20 mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
                >
                    <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-brand-black bg-brand-black transform hover:scale-[1.01] transition-transform duration-500">
                        {/* Browser Header */}
                        <div className="flex items-center gap-2 px-4 py-3 bg-brand-black border-b border-gray-800">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-gray-800/50 text-xs font-mono text-gray-400 border border-gray-700/50 w-full max-w-md justify-center">
                                    <span className="text-gray-500">🔒</span>
                                    www.omzetin.web.id/dashboard
                                </div>
                            </div>
                        </div>

                        {/* Screenshot Carousel */}
                        <div className="relative aspect-[16/9] bg-gray-900 group overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={currentScreenshot}
                                    src={screenshots[currentScreenshot]}
                                    alt="Dashboard Preview"
                                    initial={{ opacity: 0, scale: 1.1 }}
                                    animate={{ opacity: 1, scale: 1.05 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.8 }}
                                    className="w-full h-full object-cover object-top"
                                />
                            </AnimatePresence>

                            {/* Overlay Gradient for depth */}
                            <div className="absolute inset-0 bg-gradient-to-t from-brand-black/20 to-transparent pointer-events-none" />

                            {/* Carousel Indicators */}
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                                {screenshots.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentScreenshot(idx)}
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentScreenshot
                                            ? "bg-brand-orange w-6"
                                            : "bg-white/50 hover:bg-white"
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Decorative Elements behind */}
                    <div className="absolute -top-4 -right-4 w-full h-full bg-brand-orange/20 rounded-xl -z-10 border-4 border-brand-black/10 transform rotate-1" />
                    <div className="absolute -bottom-4 -left-4 w-full h-full bg-blue-500/10 rounded-xl -z-10 border-4 border-brand-black/10 transform -rotate-1" />
                </motion.div>
            </section>

            {/* Features Grid */}
            <section className="py-24 bg-brand-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-display font-bold text-brand-black mb-4">Fitur Lengkap & Canggih</h2>
                        <p className="text-muted-foreground font-mono text-lg">Semua yang Anda butuhkan untuk mengembangkan bisnis.</p>
                    </div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8"
                    >
                        {[
                            {
                                icon: Smartphone,
                                title: "Kasir Digital (POS)",
                                desc: "Catat penjualan dengan cepat, dukung scan barcode dan cetak struk bluetooth."
                            },
                            {
                                icon: Globe,
                                title: "Toko Online Instan",
                                desc: "Dapatkan website toko online Anda sendiri secara otomatis. Jualan online jadi mudah."
                            },
                            {
                                icon: TrendingUp,
                                title: "Laporan Lengkap",
                                desc: "Pantau omzet, laba rugi, dan stok barang secara real-time dari mana saja."
                            },
                            {
                                icon: Shield,
                                title: "Aman & Terpercaya",
                                desc: "Data tersimpan aman di cloud. Tidak perlu takut kehilangan data jika HP rusak."
                            },
                            {
                                icon: Zap,
                                title: "Manajemen Stok",
                                desc: "Kontrol stok bahan baku dan produk jadi. Notifikasi otomatis saat stok menipis."
                            },
                            {
                                icon: Star,
                                title: "Loyalty Program",
                                desc: "Kelola database pelanggan dan berikan promo menarik untuk pelanggan setia."
                            }
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                variants={itemVariants}
                                className="bg-white p-8 border-4 border-brand-black shadow-hard hover:shadow-hard-lg transition-all rounded-none"
                            >
                                <div className="w-12 h-12 bg-brand-orange/20 rounded-full flex items-center justify-center mb-6 border-2 border-brand-black">
                                    <feature.icon className="w-6 h-6 text-brand-black" />
                                </div>
                                <h3 className="text-xl font-bold font-display mb-3">{feature.title}</h3>
                                <p className="text-muted-foreground font-mono leading-relaxed">
                                    {feature.desc}
                                </p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Pricing Preview */}
            <section className="py-24 bg-brand-black text-white overflow-hidden">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-4xl font-display font-bold mb-6">Mulai Gratis, Upgrade Kapan Saja</h2>
                    <p className="text-gray-400 font-mono text-lg mb-12 max-w-2xl mx-auto">
                        Pilih paket yang sesuai dengan skala bisnis Anda. Transparan, tanpa biaya tersembunyi.
                    </p>

                    <div className="flex justify-center">
                        <div className="bg-white text-brand-black p-8 max-w-md w-full border-4 border-brand-orange shadow-[8px_8px_0px_0px_rgba(243,128,32,1)]">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold font-display">Pro Plan</h3>
                                    <div className="text-sm font-mono text-muted-foreground">Paling Populer</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold font-mono">Rp 99rb</div>
                                    <div className="text-xs text-muted-foreground">/bulan</div>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8 text-left">
                                {[
                                    "Produk Unlimited",
                                    "Laporan Keuangan Detail",
                                    "Custom Domain (.com)",
                                    "Multi-User & Cabang",
                                    "Support Prioritas 24/7"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 font-mono text-sm">
                                        <div className="bg-green-100 p-1 rounded-full">
                                            <Check className="w-3 h-3 text-green-600" />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>

                            <UpgradePlanDialog
                                trigger={
                                    <Button className="w-full bg-brand-black text-white hover:bg-brand-orange hover:text-black font-bold h-12 rounded-none border-2 border-transparent transition-all">
                                        Lihat Semua Paket
                                    </Button>
                                }
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-brand-orange">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-4xl md:text-6xl font-display font-bold text-brand-black mb-8">
                        Siap Mengembangkan Bisnis?
                    </h2>
                    <p className="text-xl font-mono text-brand-black/80 mb-10 max-w-2xl mx-auto">
                        Bergabung dengan ribuan pengusaha lain yang telah menggunakan Omzetin.
                    </p>
                    <Button
                        size="lg"
                        onClick={() => navigate('/register')}
                        className="bg-brand-black text-white hover:bg-white hover:text-brand-black font-bold text-xl px-12 h-16 rounded-none border-4 border-brand-black shadow-hard hover:shadow-none transition-all"
                    >
                        Daftar Gratis Sekarang
                    </Button>
                </div>
            </section>

            <AppFooter />
        </div>
    );
}
