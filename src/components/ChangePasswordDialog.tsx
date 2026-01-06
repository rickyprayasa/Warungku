
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ChangePasswordDialogProps {
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function ChangePasswordDialog({ trigger, open, onOpenChange }: ChangePasswordDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;
    const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 6) {
            toast.error('Password minimal 6 karakter');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Konfirmasi password tidak cocok');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            toast.success('Password berhasil diubah');
            setPassword('');
            setConfirmPassword('');
            setIsOpen?.(false);
        } catch (error: any) {
            console.error('Error updating password:', error);
            toast.error(`Gagal mengubah password: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[400px] rounded-none border-4 border-brand-black bg-white p-0">
                <div className="bg-brand-orange p-4 border-b-4 border-brand-black">
                    <DialogHeader>
                        <DialogTitle className="font-display font-black text-xl text-brand-black uppercase tracking-wider flex items-center gap-2">
                            <KeyRound className="w-5 h-5" />
                            Ganti Password
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">Password Baru</Label>
                        <Input
                            id="new-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="rounded-none border-2 border-brand-black"
                            placeholder="Minimal 6 karakter"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Konfirmasi Password</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="rounded-none border-2 border-brand-black"
                            placeholder="Ulangi password baru"
                            required
                        />
                    </div>

                    <div className="pt-2">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand-black text-brand-white hover:bg-brand-orange hover:text-brand-black border-2 border-transparent hover:border-brand-black rounded-none font-mono font-bold uppercase transition-all"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Simpan Password
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
