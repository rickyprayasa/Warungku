
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCode } from 'lucide-react';
import { QRISSetupContent } from './QRISSetupContent';
import { useWarungStore } from '@/lib/store';

interface QRISSetupDialogProps {
  trigger?: React.ReactNode;
  compact?: boolean;
}

export function QRISSetupDialog({ trigger, compact = false }: QRISSetupDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentUser = useWarungStore((state) => state.currentUser);

  // Security Check: If not owner/admin, do not render
  if (currentUser && currentUser.role !== 'owner' && currentUser.role !== 'admin') {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size={compact ? "sm" : "default"}
            className={compact
              ? "flex-1 justify-center font-mono uppercase font-bold text-xs px-2 py-2 hover:bg-brand-orange hover:text-brand-black rounded-none transition-colors text-muted-foreground"
              : "w-full justify-start font-mono uppercase font-bold text-sm px-4 py-2 hover:bg-brand-orange hover:text-brand-black rounded-none transition-colors text-muted-foreground"
            }
          >
            <QrCode className={compact ? "w-4 h-4" : "w-4 h-4 mr-2"} />
            {!compact && "Setup QRIS"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl rounded-none border-4 border-brand-black bg-brand-white p-0 max-h-[90vh] overflow-y-auto">
        <div className="bg-brand-orange p-4 border-b-4 border-brand-black">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-2xl text-brand-black uppercase tracking-wider flex items-center gap-2">
              <QrCode className="w-6 h-6" />
              Setup QRIS Pembayaran
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6">
          <QRISSetupContent onSaveSuccess={() => setIsOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
