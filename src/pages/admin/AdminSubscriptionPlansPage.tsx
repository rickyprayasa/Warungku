import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_days: number;
    features: string[];
    is_active: boolean;
    created_at: string;
}

export function AdminSubscriptionPlansPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [newPlan, setNewPlan] = useState<Omit<Plan, 'id' | 'created_at'>>({
        name: '',
        description: '',
        price: 0,
        duration_days: 30,
        features: [],
        is_active: true,
    });
    const [tempFeature, setTempFeature] = useState('');

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
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

    const handleSavePlan = async (planId?: string) => {
        try {
            if (planId) {
                // Update existing plan
                const planToSave = plans.find(p => p.id === planId);
                if (!planToSave) return;

                const { error } = await supabase
                    .from('subscription_plans')
                    .update({
                        name: planToSave.name,
                        description: planToSave.description,
                        price: planToSave.price,
                        duration_days: planToSave.duration_days,
                        features: planToSave.features,
                        is_active: planToSave.is_active,
                    })
                    .eq('id', planId);

                if (error) throw error;
                toast.success('Paket berhasil diperbarui');
            } else {
                // Create new plan
                const { error } = await supabase
                    .from('subscription_plans')
                    .insert([newPlan]);

                if (error) throw error;
                toast.success('Paket baru berhasil ditambahkan');
                setNewPlan({
                    name: '',
                    description: '',
                    price: 0,
                    duration_days: 30,
                    features: [],
                    is_active: true,
                });
                setIsCreating(false);
            }
            fetchPlans();
        } catch (error) {
            console.error('Error saving plan:', error);
            toast.error('Gagal menyimpan paket');
        }
    };

    const handleDeletePlan = async (planId: string) => {
        try {
            const { error } = await supabase
                .from('subscription_plans')
                .delete()
                .eq('id', planId);

            if (error) throw error;
            toast.success('Paket berhasil dihapus');
            fetchPlans();
        } catch (error) {
            console.error('Error deleting plan:', error);
            toast.error('Gagal menghapus paket');
        }
    };

    const handleFeatureAdd = (planId?: string) => {
        if (!tempFeature.trim()) return;

        if (planId) {
            // Update existing plan's features
            setPlans(prev => prev.map(plan => {
                if (plan.id === planId) {
                    return {
                        ...plan,
                        features: [...plan.features, tempFeature.trim()]
                    };
                }
                return plan;
            }));
        } else {
            // Update new plan's features
            setNewPlan(prev => ({
                ...prev,
                features: [...prev.features, tempFeature.trim()]
            }));
        }

        setTempFeature('');
    };

    const handleFeatureRemove = (featureIndex: number, planId?: string) => {
        if (planId) {
            setPlans(prev => prev.map(plan => {
                if (plan.id === planId) {
                    const newFeatures = [...plan.features];
                    newFeatures.splice(featureIndex, 1);
                    return { ...plan, features: newFeatures };
                }
                return plan;
            }));
        } else {
            const newFeatures = [...newPlan.features];
            newFeatures.splice(featureIndex, 1);
            setNewPlan(prev => ({ ...prev, features: newFeatures }));
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDuration = (days: number) => {
        if (days === 30) return 'Bulanan';
        if (days === 365) return 'Tahunan';
        return `${days} hari`;
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-orange mx-auto"></div>
                <p className="text-center mt-4 font-mono">Memuat daftar paket...</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-display font-bold text-brand-black flex items-center gap-3">
                    <span className="bg-brand-orange p-2 rounded-none">
                        <span className="text-brand-black font-bold">P</span>
                    </span>
                    Manajemen Paket Langganan
                </h1>
                <p className="text-muted-foreground font-mono text-sm mt-1">
                    Kelola paket langganan dan harga untuk platform
                </p>
            </div>

            {/* Add New Plan Button */}
            <div className="flex justify-end">
                <Dialog open={isCreating} onOpenChange={setIsCreating}>
                    <DialogTrigger asChild>
                        <Button className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold hover:bg-brand-black hover:text-brand-white">
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah Paket Baru
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="border-4 border-brand-black rounded-none max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="font-display text-xl">
                                Tambah Paket Baru
                            </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="new-plan-name" className="font-mono font-bold">
                                        Nama Paket
                                    </Label>
                                    <Input
                                        id="new-plan-name"
                                        value={newPlan.name}
                                        onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                                        className="rounded-none border-2 border-brand-black font-mono"
                                        placeholder="Nama paket"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="new-plan-duration" className="font-mono font-bold">
                                        Durasi (hari)
                                    </Label>
                                    <Input
                                        id="new-plan-duration"
                                        type="number"
                                        value={newPlan.duration_days}
                                        onChange={(e) => setNewPlan({...newPlan, duration_days: parseInt(e.target.value) || 30})}
                                        className="rounded-none border-2 border-brand-black font-mono"
                                        placeholder="Durasi dalam hari"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="new-plan-description" className="font-mono font-bold">
                                    Deskripsi
                                </Label>
                                <Textarea
                                    id="new-plan-description"
                                    value={newPlan.description}
                                    onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                                    className="rounded-none border-2 border-brand-black font-mono"
                                    placeholder="Deskripsi paket"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <Label htmlFor="new-plan-price" className="font-mono font-bold">
                                    Harga (IDR)
                                </Label>
                                <Input
                                    id="new-plan-price"
                                    type="number"
                                    value={newPlan.price}
                                    onChange={(e) => setNewPlan({...newPlan, price: parseInt(e.target.value) || 0})}
                                    className="rounded-none border-2 border-brand-black font-mono"
                                    placeholder="Harga dalam Rupiah"
                                />
                            </div>

                            <div>
                                <Label className="font-mono font-bold">
                                    Fitur-fitur
                                </Label>
                                <div className="flex gap-2 mt-2">
                                    <Input
                                        value={tempFeature}
                                        onChange={(e) => setTempFeature(e.target.value)}
                                        className="rounded-none border-2 border-brand-black font-mono"
                                        placeholder="Tambahkan fitur baru"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleFeatureAdd();
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        onClick={() => handleFeatureAdd()}
                                        className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold hover:bg-brand-black hover:text-brand-white"
                                    >
                                        Tambah
                                    </Button>
                                </div>
                                
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {newPlan.features.map((feature, index) => (
                                        <Badge key={index} variant="secondary" className="rounded-none font-mono flex items-center gap-1">
                                            {feature}
                                            <button 
                                                type="button" 
                                                onClick={() => handleFeatureRemove(index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    id="new-plan-active"
                                    type="checkbox"
                                    checked={newPlan.is_active}
                                    onChange={(e) => setNewPlan({...newPlan, is_active: e.target.checked})}
                                    className="h-4 w-4 rounded border-brand-black"
                                />
                                <Label htmlFor="new-plan-active" className="font-mono font-bold">
                                    Aktif
                                </Label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreating(false)}
                                    className="rounded-none border-2 border-brand-black font-mono"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => handleSavePlan()}
                                    className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold hover:bg-brand-black hover:text-brand-white"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Simpan Paket
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Plans Table */}
            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                <CardHeader className="border-b-2 border-brand-black">
                    <CardTitle className="font-display flex items-center justify-between">
                        <span>Daftar Paket ({plans.length})</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b-2 border-brand-black bg-gray-50">
                                    <TableHead className="font-mono font-bold">Nama</TableHead>
                                    <TableHead className="font-mono font-bold">Deskripsi</TableHead>
                                    <TableHead className="font-mono font-bold">Harga</TableHead>
                                    <TableHead className="font-mono font-bold">Durasi</TableHead>
                                    <TableHead className="font-mono font-bold">Fitur</TableHead>
                                    <TableHead className="font-mono font-bold">Status</TableHead>
                                    <TableHead className="font-mono font-bold text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plans.map((plan) => (
                                    <TableRow key={plan.id} className="border-b-2 border-brand-black last:border-b-0">
                                        <TableCell className="font-mono font-bold">
                                            {isEditing === plan.id ? (
                                                <Input
                                                    value={plan.name}
                                                    onChange={(e) => setPlans(prev => 
                                                        prev.map(p => p.id === plan.id ? {...p, name: e.target.value} : p)
                                                    )}
                                                    className="rounded-none border-2 border-brand-black font-mono"
                                                />
                                            ) : (
                                                plan.name
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            {isEditing === plan.id ? (
                                                <Textarea
                                                    value={plan.description}
                                                    onChange={(e) => setPlans(prev => 
                                                        prev.map(p => p.id === plan.id ? {...p, description: e.target.value} : p)
                                                    )}
                                                    className="rounded-none border-2 border-brand-black font-mono"
                                                    rows={2}
                                                />
                                            ) : (
                                                <div className="max-w-xs truncate">
                                                    {plan.description}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            {isEditing === plan.id ? (
                                                <Input
                                                    type="number"
                                                    value={plan.price}
                                                    onChange={(e) => setPlans(prev => 
                                                        prev.map(p => p.id === plan.id ? {...p, price: parseInt(e.target.value) || 0} : p)
                                                    )}
                                                    className="rounded-none border-2 border-brand-black font-mono"
                                                />
                                            ) : (
                                                formatCurrency(plan.price)
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            {isEditing === plan.id ? (
                                                <Input
                                                    type="number"
                                                    value={plan.duration_days}
                                                    onChange={(e) => setPlans(prev => 
                                                        prev.map(p => p.id === plan.id ? {...p, duration_days: parseInt(e.target.value) || 30} : p)
                                                    )}
                                                    className="rounded-none border-2 border-brand-black font-mono"
                                                />
                                            ) : (
                                                formatDuration(plan.duration_days)
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-xs">
                                                {isEditing === plan.id ? (
                                                    <div>
                                                        <div className="flex gap-2 mb-2">
                                                            <Input
                                                                value={tempFeature}
                                                                onChange={(e) => setTempFeature(e.target.value)}
                                                                className="rounded-none border-2 border-brand-black font-mono"
                                                                placeholder="Tambahkan fitur"
                                                                onKeyPress={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        handleFeatureAdd(plan.id);
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                type="button"
                                                                onClick={() => handleFeatureAdd(plan.id)}
                                                                className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none text-xs"
                                                            >
                                                                Tambah
                                                            </Button>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1">
                                                            {plan.features.map((feature, index) => (
                                                                <Badge key={index} variant="secondary" className="rounded-none font-mono text-xs flex items-center gap-1">
                                                                    {feature}
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => handleFeatureRemove(index, plan.id)}
                                                                        className="text-red-500 hover:text-red-700"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {plan.features.slice(0, 3).map((feature, index) => (
                                                            <Badge key={index} variant="secondary" className="rounded-none font-mono text-xs">
                                                                {feature}
                                                            </Badge>
                                                        ))}
                                                        {plan.features.length > 3 && (
                                                            <Badge variant="outline" className="rounded-none font-mono text-xs">
                                                                +{plan.features.length - 3} lg
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`rounded-none font-mono ${plan.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                                                {plan.is_active ? 'Aktif' : 'Nonaktif'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                {isEditing === plan.id ? (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                handleSavePlan(plan.id);
                                                                setIsEditing(null);
                                                            }}
                                                            className="bg-green-500 text-white border-2 border-brand-black rounded-none hover:bg-green-600"
                                                        >
                                                            <Save className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setIsEditing(null);
                                                                // Revert changes by refetching
                                                                fetchPlans();
                                                            }}
                                                            className="border-2 border-brand-black rounded-none"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setIsEditing(plan.id);
                                                                setTempFeature('');
                                                            }}
                                                            className="border-2 border-brand-black rounded-none"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleDeletePlan(plan.id)}
                                                            className="border-2 border-red-500 text-red-500 rounded-none hover:bg-red-500 hover:text-white"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}