import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Loader2, MessageCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export function TestimonialDashboard() {
    const { user, storeId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [testimonial, setTestimonial] = useState<any>(null);
    const [formData, setFormData] = useState({
        content: '',
        rating: 5
    });

    useEffect(() => {
        if (user) {
            fetchTestimonial();
        }
    }, [user]);

    const fetchTestimonial = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('testimonials')
                .select('*')
                .eq('user_id', user?.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setTestimonial(data);
                setFormData({
                    content: data.content,
                    rating: data.rating
                });
            }
        } catch (error) {
            console.error('Error fetching testimonial:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !storeId) return;

        try {
            setSubmitting(true);

            const payload = {
                store_id: storeId,
                user_id: user.id,
                content: formData.content,
                rating: formData.rating,
                status: 'pending' // Reset to pending on update
            };

            let error;

            if (testimonial) {
                // Update existing
                const { error: updateError } = await supabase
                    .from('testimonials')
                    .update(payload)
                    .eq('id', testimonial.id);
                error = updateError;
            } else {
                // Create new
                const { error: insertError } = await supabase
                    .from('testimonials')
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            toast.success('Testimoni berhasil dikirim! Menunggu persetujuan admin.');
            fetchTestimonial();
        } catch (error: any) {
            console.error('Error submitting testimonial:', error);
            toast.error('Gagal mengirim testimoni: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!testimonial || !confirm('Apakah Anda yakin ingin menghapus testimoni ini?')) return;

        try {
            setSubmitting(true);
            const { error } = await supabase
                .from('testimonials')
                .delete()
                .eq('id', testimonial.id);

            if (error) throw error;

            toast.success('Testimoni berhasil dihapus');
            setTestimonial(null);
            setFormData({ content: '', rating: 5 });
        } catch (error: any) {
            console.error('Error deleting testimonial:', error);
            toast.error('Gagal menghapus testimoni: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white border-4 border-brand-black p-6 shadow-hard mb-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-brand-orange p-2 border-2 border-brand-black shadow-hard-sm">
                        <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-display font-bold">Testimoni Anda</h2>
                </div>

                {testimonial && (
                    <div className={`mb-6 p-4 border-2 border-black ${testimonial.status === 'approved' ? 'bg-green-50' :
                            testimonial.status === 'rejected' ? 'bg-red-50' : 'bg-yellow-50'
                        }`}>
                        <div className="flex items-center gap-2 font-bold mb-2">
                            {testimonial.status === 'approved' && <><CheckCircle className="text-green-600 w-5 h-5" /> Disetujui</>}
                            {testimonial.status === 'rejected' && <><XCircle className="text-red-600 w-5 h-5" /> Ditolak</>}
                            {testimonial.status === 'pending' && <><Clock className="text-yellow-600 w-5 h-5" /> Menunggu Persetujuan</>}
                        </div>
                        <p className="text-sm text-gray-600">
                            {testimonial.status === 'approved'
                                ? 'Testimoni Anda sudah tampil di halaman depan.'
                                : testimonial.status === 'rejected'
                                    ? 'Testimoni Anda belum memenuhi standar komunitas kami. Silakan edit dan kirim ulang.'
                                    : 'Terima kasih! Testimoni Anda sedang direview oleh admin.'}
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label className="font-bold">Rating</Label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, rating: star })}
                                    className="focus:outline-none transition-transform hover:scale-110"
                                >
                                    <Star
                                        className={`w-8 h-8 ${star <= formData.rating
                                                ? 'fill-brand-yellow text-brand-black'
                                                : 'text-gray-300'
                                            }`}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content" className="font-bold">Pengalaman Anda</Label>
                        <Textarea
                            id="content"
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            placeholder="Ceritakan pengalaman Anda menggunakan Omzetin..."
                            className="min-h-[150px] border-2 border-brand-black rounded-none focus-visible:ring-0 focus-visible:border-brand-orange font-mono"
                            required
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 bg-brand-black text-white hover:bg-brand-orange hover:text-brand-black border-2 border-transparent hover:border-brand-black rounded-none font-bold uppercase shadow-hard hover:shadow-hard-sm transition-all"
                        >
                            {submitting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengirim...</>
                            ) : (
                                testimonial ? 'Update Testimoni' : 'Kirim Testimoni'
                            )}
                        </Button>

                        {testimonial && (
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={submitting}
                                onClick={handleDelete}
                                className="bg-red-500 text-white hover:bg-red-600 border-2 border-transparent hover:border-brand-black rounded-none font-bold uppercase"
                            >
                                Hapus
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
