import { useState } from 'react';
import { Sparkles, Crown, Star, ChevronRight, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/contexts/PlanContext';
import { useWarungStore } from '@/lib/store-supabase';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UpgradePlanDialog } from './UpgradePlanDialog';

type PlanType = 'free' | 'trial' | 'pro' | 'enterprise';

interface PlanInfo {
    name: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ElementType;
    description: string;
}

const planConfig: Record<PlanType, PlanInfo> = {
    free: {
        name: 'FREE',
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-400',
        icon: Star,
        description: 'Fitur dasar dengan batasan 50 produk',
    },
    trial: {
        name: 'TRIAL',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-500',
        icon: Sparkles,
        description: 'Coba semua fitur Pro gratis selama 14 hari',
    },
    pro: {
        name: 'PRO',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-500',
        icon: Crown,
        description: 'Akses penuh ke semua fitur premium',
    },
    enterprise: {
        name: 'ENTERPRISE',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100',
        borderColor: 'border-purple-500',
        icon: Crown,
        description: 'Solusi kustom untuk bisnis besar',
    },
};

const planFeatures = {
    free: [
        'Maksimal 50 produk',
        'Dasbor analytics dasar',
        'Manajemen stok sederhana',
        'Support via email',
    ],
    trial: [
        'Semua fitur Pro',
        'Berlaku 14 hari',
        'Tanpa kartu kredit',
        'Support prioritas',
    ],
    pro: [
        'Produk unlimited',
        'Analytics lanjutan',
        'Custom branding',
        'Priority support 24/7',
        'Export data CSV/PDF',
        'Multi-user access',
    ],
    enterprise: [
        'Semua fitur Pro',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantee',
        'On-premise deployment',
    ],
};

export function PlanBadge() {
    const { store } = useAuth();
    const { effectivePlan } = usePlan();
    const { isDemo } = useDemoMode();
    const navigate = useNavigate();
    const [showDialog, setShowDialog] = useState(false);

    const currentPlan = effectivePlan as PlanType;
    const config = planConfig[currentPlan] || planConfig.free;
    const Icon = config.icon;

    // Calculate expiry
    const expiryDate = (!isDemo && store?.plan_expires_at) ? new Date(store.plan_expires_at) : null;
    const now = new Date();
    const daysUntilExpiry = expiryDate
        ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;
    const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <>
            <button
                onClick={() => setShowDialog(true)}
                className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5
                    ${isDemo
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white border-2 border-brand-black'
                        : isExpiringSoon
                            ? 'bg-red-100 text-red-700 border-red-500 animate-pulse'
                            : `${config.bgColor} ${config.color} border-2 ${config.borderColor}`
                    }
                    font-mono font-bold text-xs uppercase
                    hover:opacity-80 transition-opacity cursor-pointer
                    shadow-sm
                `}
            >
                {isDemo ? (
                    <>
                        <Crown className="w-3.5 h-3.5" />
                        Berlangganan
                    </>
                ) : (
                    <>
                        {isExpiringSoon ? <AlertTriangle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                        {config.name}
                        {isExpiringSoon && <span className="text-[10px] ml-1">({daysUntilExpiry} hari lagi)</span>}
                    </>
                )}
                <ChevronRight className="w-3 h-3" />
            </button>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-md border-4 border-brand-black shadow-hard">
                    <DialogHeader>
                        <DialogTitle className="font-display text-xl flex items-center gap-2">
                            <Icon className={`w-6 h-6 ${isDemo ? 'text-orange-600' : config.color}`} />
                            {isDemo ? 'Berlangganan OMZETIN' : `Plan ${config.name}`}
                        </DialogTitle>
                        <DialogDescription className="font-mono text-sm">
                            {isDemo ? 'Kelola bisnis Anda lebih mudah dengan fitur premium OMZETIN' : config.description}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Expiry Info */}
                    {expiryDate && (
                        <div className={`mt - 2 p - 3 border - 2 rounded - none font - mono text - sm ${isExpiringSoon || isExpired
                            ? 'bg-red-50 border-red-500 text-red-700'
                            : 'bg-blue-50 border-blue-500 text-blue-700'
                            } `}>
                            <div className="flex items-start gap-2">
                                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-bold">
                                        {isExpired ? 'Plan Berakhir:' : 'Berakhir pada:'}
                                    </p>
                                    <p>{formatDate(expiryDate)}</p>
                                    {isExpiringSoon && (
                                        <p className="mt-1 font-bold text-xs bg-red-200 px-2 py-0.5 inline-block">
                                            ⚠️ Habis dalam {daysUntilExpiry} hari!
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-4">
                        <h4 className="font-mono font-bold text-sm mb-2">Fitur yang Anda dapatkan:</h4>
                        <ul className="space-y-2">
                            {planFeatures[currentPlan]?.map((feature, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-sm font-mono">
                                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {(currentPlan !== 'pro' && currentPlan !== 'enterprise') || isExpiringSoon || isDemo ? (
                        <div className="mt-6 p-4 bg-orange-50 border-2 border-orange-300 rounded-none">
                            <h4 className="font-display font-bold text-orange-800 mb-2">
                                {isDemo ? '🚀 Berlangganan Sekarang!' : isExpiringSoon ? '⚡ Perpanjang Sekarang!' : '🚀 Upgrade ke Pro!'}
                            </h4>
                            <p className="text-sm font-mono text-orange-700 mb-3">
                                {isDemo
                                    ? 'Suka dengan fitur OMZETIN? Daftar dan mulai kelola bisnis Anda sendiri dengan semua fitur premium!'
                                    : isExpiringSoon
                                        ? 'Jangan sampai kehilangan akses ke fitur premium Anda.'
                                        : 'Dapatkan akses ke semua fitur premium dan tingkatkan bisnis Anda.'}
                            </p>
                            <div className="flex gap-2">
                                {isDemo ? (
                                    <UpgradePlanDialog
                                        trigger={
                                            <Button
                                                className="bg-brand-orange text-brand-black border-2 border-brand-black font-bold hover:bg-orange-400"
                                            >
                                                <Crown className="w-4 h-4 mr-2" />
                                                Berlangganan Sekarang
                                            </Button>
                                        }
                                    />
                                ) : (
                                    <UpgradePlanDialog
                                        trigger={
                                            <Button
                                                className="bg-brand-orange text-brand-black border-2 border-brand-black font-bold hover:bg-orange-400"
                                            >
                                                <Crown className="w-4 h-4 mr-2" />
                                                {isExpiringSoon ? 'Perpanjang Plan' : 'Upgrade Sekarang'}
                                            </Button>
                                        }
                                    />
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDialog(false)}
                                    className="border-2 border-brand-black"
                                >
                                    Nanti
                                </Button>
                            </div>
                        </div>
                    ) : null}

                    {((currentPlan === 'pro' || currentPlan === 'enterprise') && !isExpiringSoon && !isDemo) && (
                        <div className="mt-6 p-4 bg-green-50 border-2 border-green-300 rounded-none">
                            <p className="text-sm font-mono text-green-700 flex items-center gap-2">
                                <span className="text-lg">✨</span>
                                Anda sudah menggunakan plan {config.name}. Terima kasih!
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
