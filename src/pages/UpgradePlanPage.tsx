import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, CreditCard, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_days: number;
    features: string[];
    is_active: boolean;
}

export function UpgradePlanPage() {
    const { store } = useAuth();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('is_active', true)
                .order('price', { ascending: true });

            if (error) throw error;
            setPlans(data || []);
        } catch (error) {
            console.error('Error fetching plans:', error);
            toast.error('Gagal memuat daftar paket');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpgrade = async (plan: Plan) => {
        if (!store) return;
        setIsProcessing(plan.id);

        try {
            // Check if Duitku is enabled by fetching settings
            const { data: settingsData, error: settingsError } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'duitku_enabled')
                .single();

            if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 means no rows found
                throw settingsError;
            }

            const duitkuEnabled = settingsData ? settingsData.value === 'true' : true; // Default to true if not set

            if (!duitkuEnabled) {
                toast.error('Pembayaran Duitku sedang dinonaktifkan. Silakan hubungi admin.');
                return;
            }

            // Call Edge Function
            const { data, error } = await supabase.functions.invoke('duitku-payment/create-invoice', {
                body: {
                    plan_id: plan.id,
                    store_id: store.id,
                    payment_method: 'VC', // Default to Virtual Account or let Duitku handle selection on their page if supported
                },
            });

            if (error) throw error;

            if (data?.paymentUrl) {
                // Redirect to Duitku Payment Page
                window.location.href = data.paymentUrl;
            } else {
                throw new Error('No payment URL returned');
            }
        } catch (error: any) {
            console.error('Error creating invoice:', error);
            toast.error('Gagal membuat tagihan: ' + (error.message || 'Unknown error'));
        } finally {
            setIsProcessing(null);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <div className="container mx-auto py-12 px-4">
            <div className="text-center mb-12">
                <div className="flex justify-center gap-4 mb-4">
                    <h1 className="text-4xl font-display font-bold text-brand-black">
                        Upgrade Toko Anda
                    </h1>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchPlans}
                        disabled={isLoading}
                        className="rounded-none border-2 border-brand-black"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
                <p className="text-muted-foreground font-mono max-w-2xl mx-auto">
                    Pilih paket yang sesuai dengan kebutuhan bisnis Anda. Nikmati fitur premium untuk meningkatkan omzet penjualan.
                </p>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan) => (
                        <Card key={plan.id} className="border-4 border-brand-black rounded-none shadow-hard hover:shadow-hard-lg transition-all flex flex-col">
                            <CardHeader className="text-center border-b-2 border-brand-black bg-gray-50">
                                <CardTitle className="font-display text-2xl">{plan.name}</CardTitle>
                                <CardDescription className="font-mono mt-2">{plan.description}</CardDescription>
                                <div className="mt-4">
                                    <span className="text-4xl font-bold font-mono text-brand-black">
                                        {formatCurrency(plan.price)}
                                    </span>
                                    <span className="text-muted-foreground font-mono text-sm">
                                        /{plan.duration_days === 30 ? 'bulan' : 'tahun'}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 flex-grow">
                                <ul className="space-y-3">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <div className="bg-green-100 p-1 rounded-full border-2 border-brand-black mt-0.5">
                                                <Check className="w-3 h-3 text-green-700 font-bold" />
                                            </div>
                                            <span className="font-mono text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter className="p-6 border-t-2 border-brand-black bg-gray-50">
                                <Button
                                    onClick={() => handleUpgrade(plan)}
                                    disabled={!!isProcessing}
                                    className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase shadow-hard hover:bg-brand-black hover:text-brand-white transition-all"
                                >
                                    {isProcessing === plan.id ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Memproses...
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="w-4 h-4 mr-2" />
                                            Pilih Paket Ini
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
