import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Crown } from 'lucide-react';
import { UpgradePlanContent } from './UpgradePlanContent';

interface UpgradePlanDialogProps {
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function UpgradePlanDialog({ trigger, open, onOpenChange }: UpgradePlanDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-w-6xl w-full border-4 border-brand-black rounded-none p-0 overflow-hidden">
                <div className="p-6">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="font-display text-2xl font-bold flex items-center gap-2">
                            <Crown className="w-6 h-6 text-brand-orange" />
                            Upgrade Plan
                        </DialogTitle>
                        <DialogDescription className="font-mono">
                            Pilih paket langganan yang sesuai dengan kebutuhan bisnis Anda.
                        </DialogDescription>
                    </DialogHeader>

                    <UpgradePlanContent />
                </div>
            </DialogContent>
        </Dialog>
    );
}
