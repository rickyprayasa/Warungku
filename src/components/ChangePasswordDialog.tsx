
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2, Save, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ChangePasswordDialogProps {
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    forceLock?: boolean;
    onSuccess?: () => void;
}

export function ChangePasswordDialog({ trigger, open, onOpenChange, forceLock, onSuccess }: ChangePasswordDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const calculateStrength = (pass: string) => {
        let score = 0;
        if (!pass) return { score: 0, label: '', color: 'bg-gray-200' };
        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[a-z]/.test(pass)) score += 1;
        if (/\d/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass) || pass.length >= 12) score += 1;

        if (score <= 2) return { score, label: 'Lemah', color: 'bg-red-500' };
        if (score <= 4) return { score, label: 'Sedang', color: 'bg-yellow-500' };
        return { score, label: 'Kuat', color: 'bg-green-500' };
    };

    const strength = calculateStrength(password);

    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;
    const setIsOpen = isControlled ? onOpenChange : setInternalOpen;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 8) {
            toast.error('Password minimal 8 karakter');
            return;
        }

        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
            toast.error('Password harus mengandung kombinasi huruf besar, huruf kecil, dan angka');
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

            if (forceLock) {
                // Clear the flag in db
                const { error: rpcError } = await supabase.rpc('clear_must_change_password');
                if (rpcError) console.error('Failed to clear must_change_password flag', rpcError);
            }

            toast.success('Password berhasil diubah');
            setPassword('');
            setConfirmPassword('');

            if (onSuccess) {
                onSuccess();
            } else {
                setIsOpen?.(false);
            }
        } catch (error: any) {
            console.error('Error updating password:', error);
            toast.error(`Gagal mengubah password: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={forceLock ? undefined : setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent
                className="sm:max-w-[400px] rounded-none border-4 border-brand-black bg-white p-0"
                onInteractOutside={(e) => {
                    if (forceLock) e.preventDefault();
                }}
                onEscapeKeyDown={(e) => {
                    if (forceLock) e.preventDefault();
                }}
                hideCloseButton={forceLock}
            >
                <div className="bg-brand-orange p-4 border-b-4 border-brand-black">
                    <DialogHeader>
                        <DialogTitle className="font-display font-black text-xl text-brand-black uppercase tracking-wider flex items-center gap-2">
                            <KeyRound className="w-5 h-5" />
                            Ganti Password
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
                    {forceLock && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md p-4 text-sm mb-4">
                            <p className="font-semibold mb-1">Selamat datang di Omzetin!</p>
                            <p>Demi keamanan akun Anda, silakan ubah password sementara yang diberikan ke password baru yang lebih kuat. Anda baru bisa mengakses dashboard setelah menyimpannya.</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="new-password">Password Baru</Label>
                        <div className="relative">
                            <Input
                                id="new-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="rounded-none border-2 border-brand-black pr-10"
                                placeholder="Minimal 8 karakter"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-black focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {password && (
                            <div className="pt-1">
                                <div className="flex gap-1 h-1.5 w-full">
                                    <div className={`flex-1 rounded-l-full transition-all duration-300 ${strength.score >= 1 ? strength.color : 'bg-gray-200'}`}></div>
                                    <div className={`flex-1 transition-all duration-300 ${strength.score >= 3 ? strength.color : 'bg-gray-200'}`}></div>
                                    <div className={`flex-1 rounded-r-full transition-all duration-300 ${strength.score >= 5 ? strength.color : 'bg-gray-200'}`}></div>
                                </div>
                                <p className={`text-[10px] text-right font-medium mt-1 ${strength.score <= 2 ? 'text-red-500' : strength.score <= 4 ? 'text-yellow-600' : 'text-green-600'}`}>
                                    {strength.label}
                                </p>
                            </div>
                        )}
                        <p className="text-xs text-brand-black/60 mt-1 pb-1">
                            Minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Konfirmasi Password</Label>
                        <div className="relative">
                            <Input
                                id="confirm-password"
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="rounded-none border-2 border-brand-black pr-10"
                                placeholder="Ulangi password baru"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-brand-black focus:outline-none"
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
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
