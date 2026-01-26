import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
    MessageCircle,
    CheckCircle,
    XCircle,
    Clock,
    Star,
    Search,
    Filter,
    Loader2,
    Store as StoreIcon
} from 'lucide-react';

interface Testimonial {
    id: string;
    store_id: string;
    user_id: string;
    content: string;
    rating: number;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    updated_at: string;
    stores?: {
        name: string;
        slug: string;
    };
}

export function AdminTestimonialsPage() {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        fetchTestimonials();
    }, []);

    const fetchTestimonials = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('testimonials')
                .select('*, stores(name, slug)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTestimonials(data || []);
        } catch (error) {
            console.error('Error fetching testimonials:', error);
            toast.error('Gagal memuat testimoni');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
        try {
            setUpdating(id);
            const { error } = await supabase
                .from('testimonials')
                .update({ status })
                .eq('id', id);

            if (error) throw error;

            toast.success(`Testimoni berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`);
            fetchTestimonials();
        } catch (error: any) {
            console.error('Error updating testimonial:', error);
            toast.error('Gagal memperbarui status: ' + error.message);
        } finally {
            setUpdating(null);
        }
    };

    const deleteTestimonial = async (id: string) => {
        if (!confirm('Hapus testimoni ini?')) return;

        try {
            setUpdating(id);
            const { error } = await supabase
                .from('testimonials')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success('Testimoni berhasil dihapus');
            fetchTestimonials();
        } catch (error: any) {
            console.error('Error deleting testimonial:', error);
            toast.error('Gagal menghapus: ' + error.message);
        } finally {
            setUpdating(null);
        }
    };

    const filteredTestimonials = testimonials.filter((t) => {
        const matchesFilter = filter === 'all' || t.status === filter;
        const matchesSearch =
            searchQuery === '' ||
            t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.stores?.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-none border border-green-300">
                        <CheckCircle className="w-3 h-3" /> Disetujui
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-none border border-red-300">
                        <XCircle className="w-3 h-3" /> Ditolak
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-none border border-yellow-300">
                        <Clock className="w-3 h-3" /> Menunggu
                    </span>
                );
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-display font-bold flex items-center gap-3">
                    <MessageCircle className="w-8 h-8 text-brand-orange" />
                    Manajemen Testimoni
                </h1>
                <p className="text-gray-500 font-mono text-sm mt-1">
                    Review dan kelola testimoni dari pengguna
                </p>
            </div>

            {/* Filters */}
            <div className="bg-white border-2 border-brand-black p-4 mb-6 shadow-hard-sm">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="font-bold text-sm">Filter:</span>
                    </div>
                    <div className="flex gap-2">
                        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
                            <Button
                                key={f}
                                variant={filter === f ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilter(f)}
                                className={`rounded-none font-mono text-xs ${filter === f ? 'bg-brand-black text-white' : ''
                                    }`}
                            >
                                {f === 'all' && 'Semua'}
                                {f === 'pending' && 'Menunggu'}
                                {f === 'approved' && 'Disetujui'}
                                {f === 'rejected' && 'Ditolak'}
                            </Button>
                        ))}
                    </div>
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Cari testimoni atau toko..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 rounded-none border-2 border-brand-black"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total', count: testimonials.length, color: 'bg-gray-100' },
                    { label: 'Menunggu', count: testimonials.filter((t) => t.status === 'pending').length, color: 'bg-yellow-100' },
                    { label: 'Disetujui', count: testimonials.filter((t) => t.status === 'approved').length, color: 'bg-green-100' },
                    { label: 'Ditolak', count: testimonials.filter((t) => t.status === 'rejected').length, color: 'bg-red-100' },
                ].map((stat) => (
                    <div key={stat.label} className={`${stat.color} border-2 border-brand-black p-4 shadow-hard-sm`}>
                        <div className="text-3xl font-black">{stat.count}</div>
                        <div className="text-sm font-mono text-gray-600">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Testimonials List */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
                </div>
            ) : filteredTestimonials.length === 0 ? (
                <div className="text-center p-12 bg-gray-50 border-2 border-dashed border-gray-300">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 font-mono">Tidak ada testimoni yang ditemukan</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredTestimonials.map((t) => (
                        <div
                            key={t.id}
                            className="bg-white border-2 border-brand-black p-6 shadow-hard-sm"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-brand-orange flex items-center justify-center border-2 border-brand-black">
                                        <StoreIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <div className="font-bold">{t.stores?.name || 'Toko Tidak Diketahui'}</div>
                                        <div className="text-xs text-gray-500 font-mono">/{t.stores?.slug}</div>
                                    </div>
                                </div>
                                {getStatusBadge(t.status)}
                            </div>

                            <div className="flex gap-1 mb-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`w-5 h-5 ${star <= t.rating ? 'fill-brand-yellow text-brand-black' : 'text-gray-300'
                                            }`}
                                    />
                                ))}
                            </div>

                            <p className="text-gray-700 mb-4 font-mono text-sm leading-relaxed">
                                "{t.content}"
                            </p>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                <div className="text-xs text-gray-500 font-mono">
                                    {new Date(t.created_at).toLocaleString('id-ID')}
                                </div>
                                <div className="flex gap-2">
                                    {t.status === 'pending' && (
                                        <>
                                            <Button
                                                size="sm"
                                                onClick={() => updateStatus(t.id, 'approved')}
                                                disabled={updating === t.id}
                                                className="bg-green-500 hover:bg-green-600 text-white rounded-none font-mono text-xs"
                                            >
                                                {updating === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                                                Setujui
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => updateStatus(t.id, 'rejected')}
                                                disabled={updating === t.id}
                                                className="bg-red-500 hover:bg-red-600 text-white rounded-none font-mono text-xs"
                                            >
                                                {updating === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                                                Tolak
                                            </Button>
                                        </>
                                    )}
                                    {t.status !== 'pending' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => updateStatus(t.id, 'approved')}
                                            disabled={updating === t.id || t.status === 'approved'}
                                            className="rounded-none font-mono text-xs"
                                        >
                                            Setujui Ulang
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => deleteTestimonial(t.id)}
                                        disabled={updating === t.id}
                                        className="rounded-none font-mono text-xs"
                                    >
                                        Hapus
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
