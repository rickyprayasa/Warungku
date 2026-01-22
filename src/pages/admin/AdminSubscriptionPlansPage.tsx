import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Crown, Zap, Building2, Check } from 'lucide-react';

interface SimplePlan {
    type: 'free' | 'pro' | 'enterprise';
    name: string;
    description: string;
    monthly_price: number;
    yearly_price: number;
    features: string[];
    is_active: boolean;
    max_products?: number;
    max_users?: number;
}

export function AdminSubscriptionPlansPage() {
    const [plans, setPlans] = useState<SimplePlan[]>([
        {
            type: 'free',
            name: 'Free',
            description: 'Mulai gratis untuk warung kecil',
            monthly_price: 0,
            yearly_price: 0,
            features: [],
            is_active: true,
            max_products: 50,
            max_users: 1,
        },
        {
            type: 'pro',
            name: 'Pro',
            description: 'Untuk warung berkembang',
            monthly_price: 50000,
            yearly_price: 500000,
            features: [],
            is_active: true,
            max_products: 500,
            max_users: 3,
        },
        {
            type: 'enterprise',
            name: 'Enterprise',
            description: 'Untuk bisnis skala besar',
            monthly_price: 200000,
            yearly_price: 2000000,
            features: [],
            is_active: true,
            max_products: 999999,
            max_users: 999999,
        },
    ]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .in('name', ['Free', 'Pro', 'Enterprise']);

            if (error) {
                console.error('[AdminSubscriptionPlans] Error fetching plans:', error);
                throw error;
            }

            console.log('[AdminSubscriptionPlans] Fetched plans from DB:', data);

            if (data && data.length > 0) {
                // Map database plans to simple format
                const fetchedPlans: SimplePlan[] = ['free', 'pro', 'enterprise'].map((type: string) => {
                    const dbPlan = data.find((p: any) => p.name.toLowerCase() === type);
                    const defaultPlan = plans.find(p => p.type === type)!;

                    if (!defaultPlan) {
                        console.warn('[AdminSubscriptionPlans] Default plan not found for type:', type);
                        return {
                            type: type as any,
                            name: type.charAt(0).toUpperCase() + type.slice(1),
                            description: '',
                            monthly_price: 0,
                            yearly_price: 0,
                            features: [],
                            is_active: true,
                        };
                    }

                    return {
                        ...defaultPlan,
                        features: dbPlan?.features || defaultPlan.features,
                        is_active: dbPlan?.is_active ?? defaultPlan.is_active,
                        monthly_price: dbPlan?.price || defaultPlan.monthly_price,
                        yearly_price: dbPlan?.yearly_price || defaultPlan.yearly_price,
                    };
                });
                setPlans(fetchedPlans);
            } else {
                console.log('[AdminSubscriptionPlans] No plans found in DB, using defaults');
            }
        } catch (error) {
            console.error('[AdminSubscriptionPlans] Error fetching plans:', error);
            toast.error('Gagal memuat paket langganan');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            for (const plan of plans) {
                console.log('[AdminSubscriptionPlans] Saving plan:', plan.type, plan.name);

                // Check if plan exists
                const { data: existing, error: findError } = await supabase
                    .from('subscription_plans')
                    .select('id')
                    .eq('name', plan.name)
                    .maybeSingle();

                if (findError) {
                    console.error('[AdminSubscriptionPlans] Error finding plan:', findError);
                    throw findError;
                }

                const planData = {
                    name: plan.name,
                    description: plan.description,
                    price: plan.monthly_price,
                    yearly_price: plan.yearly_price,
                    duration_days: plan.type === 'free' ? 30 : 30,
                    features: plan.features,
                    is_active: plan.is_active,
                    max_products: plan.max_products,
                    max_users: plan.max_users,
                    plan_type: plan.type,
                };

                console.log('[AdminSubscriptionPlans] Plan data:', planData);

                let error;
                if (existing) {
                    console.log('[AdminSubscriptionPlans] Updating existing plan:', existing.id);
                    const { error: updateError } = await supabase
                        .from('subscription_plans')
                        .update(planData)
                        .eq('id', existing.id);
                    error = updateError;
                } else {
                    console.log('[AdminSubscriptionPlans] Inserting new plan');
                    const { error: insertError } = await supabase
                        .from('subscription_plans')
                        .insert([planData]);
                    error = insertError;
                }

                if (error) {
                    console.error('[AdminSubscriptionPlans] Error saving plan:', error);
                    throw error;
                }

                console.log('[AdminSubscriptionPlans] Plan saved successfully');
            }

            toast.success('Paket langganan berhasil disimpan!');

            // Refresh data from database to confirm changes
            await fetchPlans();
        } catch (error: any) {
            console.error('Error saving plans:', error);
            toast.error(`Gagal menyimpan paket: ${error?.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePlanChange = (type: string, field: keyof SimplePlan, value: any) => {
        setPlans(prev => prev.map(plan => {
            if (plan.type === type) {
                return { ...plan, [field]: value };
            }
            return plan;
        }));
    };

    const handleFeatureAdd = (type: string, feature: string) => {
        if (!feature.trim()) return;
        handlePlanChange(type, 'features', [
            ...(plans.find(p => p.type === type)?.features || []),
            feature.trim()
        ]);
    };

    const handleFeatureRemove = (type: string, index: number) => {
        const plan = plans.find(p => p.type === type);
        if (plan) {
            const newFeatures = [...plan.features];
            newFeatures.splice(index, 1);
            handlePlanChange(type, 'features', newFeatures);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'free':
                return <Zap className="w-6 h-6" />;
            case 'pro':
                return <Crown className="w-6 h-6" />;
            case 'enterprise':
                return <Building2 className="w-6 h-6" />;
            default:
                return null;
        }
    };

    const getPlanColor = (type: string) => {
        switch (type) {
            case 'free':
                return 'border-gray-400 bg-gray-50';
            case 'pro':
                return 'border-brand-orange bg-orange-50';
            case 'enterprise':
                return 'border-purple-500 bg-purple-50';
            default:
                return 'border-gray-400 bg-gray-50';
        }
    };

    const getButtonColor = (type: string) => {
        switch (type) {
            case 'free':
                return 'bg-gray-400 hover:bg-gray-600 text-white';
            case 'pro':
                return 'bg-brand-orange hover:bg-brand-black hover:text-white text-brand-black';
            case 'enterprise':
                return 'bg-purple-500 hover:bg-purple-700 text-white';
            default:
                return 'bg-gray-400 hover:bg-gray-600 text-white';
        }
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange mx-auto"></div>
                <p className="text-center mt-4 font-mono">Memuat paket langganan...</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold text-brand-black flex items-center gap-3">
                        <Crown className="w-8 h-8 text-brand-orange" />
                        Paket Langganan
                    </h1>
                    <p className="text-muted-foreground font-mono text-sm mt-1">
                        Kelola 3 paket langganan utama platform
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-brand-black text-brand-white hover:bg-brand-orange hover:text-brand-black border-2 border-brand-black rounded-none font-mono font-bold"
                >
                    {isSaving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-brand-black border-t-transparent rounded-full animate-spin mr-2" />
                            Menyimpan...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Simpan Semua
                        </>
                    )}
                </Button>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <Card key={plan.type} className={`border-4 rounded-none shadow-hard ${getPlanColor(plan.type)}`}>
                        <CardHeader>
                            <div className="flex items-center justify-between mb-2">
                                <div className={`p-2 rounded-none ${getButtonColor(plan.type).split(' ')[0]} text-white`}>
                                    {getIcon(plan.type)}
                                </div>
                                <Switch
                                    checked={plan.is_active}
                                    onCheckedChange={(checked) => handlePlanChange(plan.type, 'is_active', checked)}
                                />
                            </div>
                            <CardTitle className="text-2xl font-display font-bold">{plan.name}</CardTitle>
                            <CardDescription className="font-mono text-sm mt-2">
                                {plan.description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Prices */}
                            <div className="space-y-3">
                                <div>
                                    <Label className="font-mono text-sm">Harga Bulanan</Label>
                                    <Input
                                        type="number"
                                        value={plan.monthly_price}
                                        onChange={(e) => handlePlanChange(plan.type, 'monthly_price', parseInt(e.target.value) || 0)}
                                        className="rounded-none border-2 border-brand-black font-mono"
                                    />
                                </div>
                                <div>
                                    <Label className="font-mono text-sm">Harga Tahunan</Label>
                                    <Input
                                        type="number"
                                        value={plan.yearly_price}
                                        onChange={(e) => handlePlanChange(plan.type, 'yearly_price', parseInt(e.target.value) || 0)}
                                        className="rounded-none border-2 border-brand-black font-mono"
                                    />
                                </div>
                            </div>

                            {/* Limits */}
                            {plan.type !== 'enterprise' && (
                                <div className="space-y-3">
                                    <div>
                                        <Label className="font-mono text-sm">Maksimal Produk</Label>
                                        <Input
                                            type="number"
                                            value={plan.max_products}
                                            onChange={(e) => handlePlanChange(plan.type, 'max_products', parseInt(e.target.value) || 0)}
                                            className="rounded-none border-2 border-brand-black font-mono"
                                        />
                                    </div>
                                    <div>
                                        <Label className="font-mono text-sm">Maksimal User</Label>
                                        <Input
                                            type="number"
                                            value={plan.max_users}
                                            onChange={(e) => handlePlanChange(plan.type, 'max_users', parseInt(e.target.value) || 0)}
                                            className="rounded-none border-2 border-brand-black font-mono"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <Label className="font-mono text-sm">Deskripsi</Label>
                                <Textarea
                                    value={plan.description}
                                    onChange={(e) => handlePlanChange(plan.type, 'description', e.target.value)}
                                    className="rounded-none border-2 border-brand-black font-mono mt-1"
                                    rows={2}
                                />
                            </div>

                            {/* Features */}
                            <div>
                                <Label className="font-mono text-sm mb-2 block">Fitur</Label>
                                <FeatureEditor
                                    features={plan.features}
                                    onAdd={(feature) => handleFeatureAdd(plan.type, feature)}
                                    onRemove={(index) => handleFeatureRemove(plan.type, index)}
                                />
                            </div>

                            {/* Price Display */}
                            <div className="p-3 bg-white border-2 border-brand-black mt-4">
                                <div className="text-center">
                                    <p className="text-xs font-mono text-muted-foreground">Harga yang ditampilkan</p>
                                    <p className="text-xl font-bold font-mono mt-1">
                                        {formatCurrency(plan.monthly_price)}
                                        <span className="text-sm font-normal">/bulan</span>
                                    </p>
                                    {plan.yearly_price > 0 && (
                                        <p className="text-xs font-mono text-green-600 mt-1">
                                            atau {formatCurrency(plan.yearly_price)}/tahun
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Info Card */}
            <Card className="border-4 border-brand-black rounded-none bg-blue-50">
                <CardContent className="p-6">
                    <p className="font-mono text-sm text-blue-800">
                        <strong>ℹ️ Info:</strong> Perubahan harga dan fitur akan langsung berlaku untuk semua user.
                        Pastikan untuk mereview perubahan sebelum menyimpan.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

interface FeatureEditorProps {
    features: string[];
    onAdd: (feature: string) => void;
    onRemove: (index: number) => void;
}

function FeatureEditor({ features, onAdd, onRemove }: FeatureEditorProps) {
    const [newFeature, setNewFeature] = useState('');

    const handleAdd = () => {
        if (newFeature.trim()) {
            onAdd(newFeature);
            setNewFeature('');
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="Tambah fitur..."
                    className="rounded-none border-2 border-brand-black font-mono text-sm"
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAdd();
                        }
                    }}
                />
                <Button
                    type="button"
                    onClick={handleAdd}
                    size="sm"
                    className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-mono font-bold"
                >
                    <Check className="w-4 h-4" />
                </Button>
            </div>
            <div className="flex flex-wrap gap-1">
                {features.map((feature, index) => (
                    <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white border-2 border-brand-black rounded-none text-xs font-mono"
                    >
                        {feature}
                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            className="text-red-500 hover:text-red-700"
                        >
                            ×
                        </button>
                    </span>
                ))}
            </div>
        </div>
    );
}
