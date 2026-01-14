import { useState } from 'react';
import { Crown, Sparkles, Star, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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
    const navigate = useNavigate();
    const [showDialog, setShowDialog] = useState(false);

    const currentPlan = (store?.plan || 'free') as PlanType;
    const config = planConfig[currentPlan] || planConfig.free;
    const Icon = config.icon;

    const handleUpgrade = () => {
        setShowDialog(false);
        // Navigate to upgrade page or open payment dialog
        navigate('/dashboard?tab=upgrade');
    };

    return (
        <>
            <button
                onClick={() => setShowDialog(true)}
                className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 
          ${config.bgColor} ${config.color} 
          border-2 ${config.borderColor}
          font-mono font-bold text-xs uppercase
          hover:opacity-80 transition-opacity cursor-pointer
          shadow-sm
        `}
            >
                <Icon className="w-3.5 h-3.5" />
                {config.name}
                <ChevronRight className="w-3 h-3" />
            </button>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-md border-4 border-brand-black shadow-hard">
                    <DialogHeader>
                        <DialogTitle className="font-display text-xl flex items-center gap-2">
                            <Icon className={`w-6 h-6 ${config.color}`} />
                            Plan {config.name}
                        </DialogTitle>
                        <DialogDescription className="font-mono text-sm">
                            {config.description}
                        </DialogDescription>
                    </DialogHeader>

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

                    {currentPlan !== 'pro' && currentPlan !== 'enterprise' && (
                        <div className="mt-6 p-4 bg-orange-50 border-2 border-orange-300 rounded-none">
                            <h4 className="font-display font-bold text-orange-800 mb-2">
                                🚀 Upgrade ke Pro!
                            </h4>
                            <p className="text-sm font-mono text-orange-700 mb-3">
                                Dapatkan akses ke semua fitur premium dan tingkatkan bisnis Anda.
                            </p>
                            <div className="flex gap-2">
                                <UpgradePlanDialog
                                    trigger={
                                        <Button
                                            className="bg-brand-orange text-brand-black border-2 border-brand-black font-bold hover:bg-orange-400"
                                        >
                                            <Crown className="w-4 h-4 mr-2" />
                                            Upgrade Sekarang
                                        </Button>
                                    }
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDialog(false)}
                                    className="border-2 border-brand-black"
                                >
                                    Nanti
                                </Button>
                            </div>
                        </div>
                    )}

                    {((currentPlan as string) === 'pro' || (currentPlan as string) === 'enterprise') && (
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
