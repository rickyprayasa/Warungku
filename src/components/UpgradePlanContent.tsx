import { useState, useEffect } from 'react';
import { Crown, Check, Sparkles, Star, Zap, Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoMode } from '@/hooks/useDemoMode';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface PlanDetails {
    id: string;
    name: string;
    price: string;
    priceNote?: string;
    description: string;
    features: string[];
    popular?: boolean;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
}

// Default plans as fallback
const defaultPlans: PlanDetails[] = [
    {
        id: 'free',
        name: 'Free',
        price: 'Rp 0',
        priceNote: 'Selamanya gratis',
        description: 'Cocok untuk memulai bisnis kecil',
        icon: Star,
        color: 'text-gray-700',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-300',
        features: [
            'Maksimal 50 produk',
            'Dasbor analytics dasar',
            'Manajemen stok sederhana',
            'Support via email',
            'Akses 1 user',
        ],
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 'Rp 50.000',
        priceNote: '/bulan',
        description: 'Untuk bisnis yang berkembang',
        icon: Crown,
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-500',
        popular: true,
        features: [
            'Produk unlimited',
            'Analytics lanjutan',
            'Custom branding & logo',
            'Priority support 24/7',
            'Export data CSV/PDF',
            'Multi-user access (5 user)',
            'Tanpa watermark',
            'Domain custom',
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        priceNote: 'Hubungi kami',
        description: 'Solusi untuk bisnis besar',
        icon: Building2,
        color: 'text-purple-700',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-500',
        features: [
            'Semua fitur Pro',
            'Dedicated account manager',
            'Custom integrations',
            'SLA guarantee 99.9%',
            'On-premise deployment',
            'Unlimited users',
            'Training & onboarding',
            'API access',
        ],
    },
];

// Helper function to format price
const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined || price === 0) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(price);
};

export function UpgradePlanContent() {
    const { store, updateStorePlan } = useAuth();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [dbPlans, setDbPlans] = useState<any[]>([]);
    const [plans, setPlans] = useState<PlanDetails[]>(defaultPlans);
    const currentPlan = store?.plan || 'free';
    const { isDemo } = useDemoMode();

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const { data, error } = await supabase
                    .from('subscription_plans')
                    .select('*')
                    .eq('is_active', true);

                if (error) throw error;
                setDbPlans(data || []);

                // Merge database plans with default plans
                if (data && data.length > 0) {
                    const mergedPlans: PlanDetails[] = defaultPlans.map((defaultPlan) => {
                        const dbPlan = data.find((p: any) => p.name.toLowerCase() === defaultPlan.id);

                        if (dbPlan && dbPlan.price !== null && dbPlan.price !== undefined && defaultPlan.id !== 'enterprise') {
                            return {
                                ...defaultPlan,
                                price: formatPrice(dbPlan.price),
                            };
                        }

                        return defaultPlan;
                    });

                    setPlans(mergedPlans);
                }
            } catch (error) {
                console.error('Error fetching plans:', error);
            }
        };

        fetchPlans();
    }, []);

    const handleSelectPlan = async (planId: string) => {
        if (planId === currentPlan) {
            toast.info('Anda sudah menggunakan plan ini');
            return;
        }

        if (isDemo) {
            const planName = planId === 'free' ? 'Free' : planId === 'pro' ? 'Pro' : 'Enterprise';
            const message = encodeURIComponent(`Halo, saya tertarik dengan plan ${planName} Omzetin. Bisa info lebih lanjut?`);
            window.open(`https://wa.me/6285846055901?text=${message}`, '_blank');
            return;
        }

        if (planId === 'enterprise') {
            const message = encodeURIComponent('Halo, saya tertarik dengan plan Enterprise Omzetin. Bisa info lebih lanjut?');
            window.open(`https://wa.me/6285846055901?text=${message}`, '_blank');
            return;
        }

        setIsProcessing(planId);
        try {
            if (planId === 'pro') {
                // Find the Pro plan in the database
                const proPlan = dbPlans.find(p => p.name.toLowerCase().includes('pro'));

                if (!proPlan) {
                    toast.error('Paket Pro tidak ditemukan di database. Hubungi admin.');
                    return;
                }

                // Check if Duitku is enabled
                /* 
                // Optional: Check settings if needed, but we can assume it's enabled if the user asks for integration
                const { data: settingsData } = await supabase
                    .from('settings')
                    .select('value')
                    .eq('key', 'duitku_enabled')
                    .single();
                const duitkuEnabled = settingsData ? settingsData.value === 'true' : true;
                */

                // Call Edge Function to create invoice
                const { data, error } = await supabase.functions.invoke('duitku-payment/create-invoice', {
                    body: {
                        plan_id: proPlan.id,
                        store_id: store?.id,
                        payment_method: 'VC', // Default to Virtual Account, or let Duitku handle it
                    },
                });

                if (error) throw error;

                if (data?.paymentUrl) {
                    // Redirect to Duitku Payment Page
                    window.location.href = data.paymentUrl;
                } else {
                    throw new Error('Gagal mendapatkan link pembayaran');
                }

            } else if (planId === 'free') {
                // Downgrade to free
                // Warning: This might need more logic to handle data limits
                if (confirm('Apakah Anda yakin ingin downgrade ke Free? Beberapa fitur mungkin akan hilang.')) {
                    await updateStorePlan('free');
                    toast.success('Plan berhasil diubah ke Free');
                }
            }
        } catch (error: any) {
            console.error('Error changing plan:', error);
            toast.error('Gagal memproses permintaan: ' + (error.message || 'Unknown error'));
        } finally {
            setIsProcessing(null);
        }
    };



    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {plans.map((plan) => {
                    const Icon = plan.icon;
                    const isCurrentPlan = !isDemo && currentPlan === plan.id;
                    const isUpgrade = plans.findIndex(p => p.id === plan.id) > plans.findIndex(p => p.id === currentPlan);

                    return (
                        <Card
                            key={plan.id}
                            className={`
                relative border-2 rounded-none shadow-sm transition-all flex flex-col
                ${plan.popular ? 'border-brand-orange ring-1 ring-brand-orange z-10' : 'border-brand-black'}
                ${isCurrentPlan ? 'ring-2 ring-green-400 ring-offset-1' : ''}
              `}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <Badge className="bg-brand-orange text-brand-black font-mono font-bold uppercase px-2 py-0.5 text-[10px] rounded-none border border-brand-black">
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        Popular
                                    </Badge>
                                </div>
                            )}

                            {isCurrentPlan && (
                                <div className="absolute -top-3 right-2">
                                    <Badge className="bg-green-500 text-white font-mono font-bold uppercase px-2 py-0.5 text-[10px] rounded-none">
                                        Aktif
                                    </Badge>
                                </div>
                            )}

                            <CardHeader className={`${plan.bgColor} border-b-2 border-brand-black p-4 pb-3`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`p-1.5 ${plan.borderColor} border bg-white`}>
                                        <Icon className={`w-4 h-4 ${plan.color}`} />
                                    </div>
                                    <CardTitle className="font-display text-lg">{plan.name}</CardTitle>
                                </div>
                                <div className="mt-1">
                                    <span className="text-2xl font-bold font-mono">{plan.price}</span>
                                    {plan.priceNote && (
                                        <span className="text-xs font-mono text-muted-foreground ml-1">
                                            {plan.priceNote}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs font-mono text-muted-foreground mt-1 leading-tight">
                                    {plan.description}
                                </p>
                            </CardHeader>

                            <CardContent className="p-4 flex-1 flex flex-col">
                                <ul className="space-y-1.5 mb-4 flex-1">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-xs font-mono leading-tight">
                                            <Check className={`w-3.5 h-3.5 ${plan.color} flex-shrink-0 mt-0.5`} />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    onClick={() => handleSelectPlan(plan.id)}
                                    disabled={isProcessing !== null}
                                    size="sm"
                                    className={`
                    w-full rounded-none border-2 border-brand-black font-mono font-bold uppercase text-xs h-9
                    ${isCurrentPlan
                                            ? 'bg-green-100 text-green-800 cursor-default'
                                            : plan.popular
                                                ? 'bg-brand-orange text-brand-black hover:bg-brand-black hover:text-white'
                                                : 'bg-white text-brand-black hover:bg-brand-black hover:text-white'
                                        }
                  `}
                                >
                                    {isProcessing === plan.id ? (
                                        <div className="flex items-center gap-2">
                                            <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                                            Proses...
                                        </div>
                                    ) : isCurrentPlan ? (
                                        <div className="flex items-center gap-2">
                                            <Check className="w-3 h-3" />
                                            Aktif
                                        </div>
                                    ) : (plan.id === 'enterprise' || isDemo) ? (
                                        <div className="flex items-center gap-2">
                                            Hubungi
                                            <ArrowRight className="w-3 h-3" />
                                        </div>
                                    ) : isUpgrade ? (
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-3 h-3" />
                                            Upgrade
                                        </div>
                                    ) : (
                                        'Pilih'
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="text-center py-2 px-4 bg-gray-50 border-2 border-brand-black flex items-center justify-center gap-2">
                <p className="font-mono text-xs text-muted-foreground">
                    Butuh bantuan?
                </p>
                <a
                    href="https://wa.me/6285846055901?text=Halo, saya butuh bantuan memilih plan Omzetin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-orange hover:underline font-bold text-xs"
                >
                    Chat WhatsApp
                </a>
            </div>
        </div>
    );
}
