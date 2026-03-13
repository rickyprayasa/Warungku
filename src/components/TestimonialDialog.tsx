import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export function TestimonialDialog() {
    const { user, storeId } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [testimonial, setTestimonial] = useState<any>(null);
    const [formData, setFormData] = useState({
        content: '',
        rating: 5
    });

    const fetchTestimonial = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await (supabase
                .from('testimonials') as any)
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
    }, [user?.id]);

    useEffect(() => {
        if (open && user) {
            fetchTestimonial();
        }
    }, [open, user, fetchTestimonial]);

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
                status: 'pending'
            };

            let error;

            if (testimonial) {
                const { error: updateError } = await (supabase
                    .from('testimonials') as any)
                    .update(payload)
                    .eq('id', testimonial.id);
                error = updateError;
            } else {
                const { error: insertError } = await (supabase
                    .from('testimonials') as any)
                    .insert([payload]);
                error = insertError;
            }

            if (error) throw error;

            toast.success('Terima kasih sudah memberikan ratingnya! 🌟');
            fetchTestimonial();
            setOpen(false); // Close dialog after success
        } catch (error: any) {
            console.error('Error submitting testimonial:', error);
            toast.error('Gagal mengirim testimoni: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    className="relative p-0 group transition-all duration-300 hover:scale-110"
                    title="Beri Rating & Testimoni"
                >
                    {/* @ts-expect-error lord-icon is a custom element */}
                    <lord-icon
                        src="https://cdn.lordicon.com/uihwbzln.json"
                        trigger="morph"
                        state="morph-select"
                        colors="primary:#f59e0b,secondary:#fbbf24"
                        style={{ width: '36px', height: '36px' }}
                    />
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white border-4 border-brand-black p-0 overflow-hidden rounded-none shadow-hard">
                <DialogHeader className="bg-brand-orange p-4 border-b-4 border-brand-black">
                    <DialogTitle className="text-xl font-display font-bold flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        Testimoni Anda
                    </DialogTitle>
                    <DialogDescription className="text-brand-black/70 font-mono text-sm">
                        Bagikan pengalaman Anda menggunakan Omzetin
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
                        </div>
                    ) : (
                        <>
                            {testimonial && (
                                <div className="mb-4 p-3 border-2 border-green-500 bg-green-50 text-sm">
                                    <div className="flex items-center gap-2 font-bold text-green-700">
                                        <CheckCircle className="w-4 h-4" />
                                        Terima kasih sudah memberikan rating! Anda bisa update kapan saja.
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-bold text-sm">Rating</Label>
                                    <div className="flex gap-0">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, rating: star })}
                                                className="focus:outline-none transition-transform hover:scale-110"
                                            >
                                                {/* @ts-expect-error lord-icon is a custom element */}
                                                <lord-icon
                                                    src="https://cdn.lordicon.com/uihwbzln.json"
                                                    trigger="hover"
                                                    colors={star <= formData.rating ? "primary:#f59e0b,secondary:#fbbf24" : "primary:#d1d5db,secondary:#e5e7eb"}
                                                    style={{ width: '40px', height: '40px' }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="content" className="font-bold text-sm">Pengalaman Anda</Label>
                                    <Textarea
                                        id="content"
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        placeholder="Ceritakan pengalaman Anda..."
                                        className="min-h-[100px] border-2 border-brand-black rounded-none focus-visible:ring-0 focus-visible:border-brand-orange font-mono text-sm"
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-brand-black text-white hover:bg-brand-orange hover:text-brand-black border-2 border-transparent hover:border-brand-black rounded-none font-bold uppercase shadow-hard-sm hover:shadow-none transition-all"
                                >
                                    {submitting ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengirim...</>
                                    ) : (
                                        testimonial ? 'Update Testimoni' : 'Kirim Testimoni'
                                    )}
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
