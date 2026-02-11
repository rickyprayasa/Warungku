import { useRef, useEffect, useCallback } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OnboardingTourProps {
    tourId?: string;
    steps?: any[];
    runOnce?: boolean;
    loading?: boolean;
    isActive?: boolean;
}

// Get all known tour IDs to skip them all at once
const ALL_TOUR_IDS = [
    'onboarding-tour',
    'product-page-tour',
    'sales-page-tour',
    'purchases-page-tour',
    'suppliers-page-tour',
    'cashflow-page-tour',
    'finance-page-tour',
    'requests-page-tour',
    'price-ref-tour',
    'opname-retail-tour',
    'opname-display-tour',
    'opname-terpadu-tour',
];

/** Mark all known tours as seen */
function skipAllTours() {
    ALL_TOUR_IDS.forEach(id => {
        localStorage.setItem(`has-seen-${id}`, 'true');
    });
}

const defaultSteps = [
    {
        element: '#tour-store-profile',
        popover: {
            title: 'Profil Toko',
            description: 'Atur nama, alamat, logo, dan informasi toko Anda di sini.',
            side: 'right',
            align: 'start'
        }
    },
    {
        element: '#tour-products',
        popover: {
            title: 'Manajemen Produk',
            description: 'Tambahkan dan kelola produk yang Anda jual di sini menu ini.',
            side: 'right',
            align: 'start'
        }
    },
    {
        element: '#tour-pos',
        popover: {
            title: 'Kasir (POS)',
            description: 'Mulai berjualan dengan fitur kasir digital yang mudah digunakan.',
            side: 'right',
            align: 'start'
        }
    },
    {
        element: '#tour-dashboard',
        popover: {
            title: 'Dashboard Utama',
            description: 'Pantau ringkasan penjualan, keuntungan, dan performa toko Anda.',
            side: 'right',
            align: 'start'
        }
    },
    {
        element: '#tour-add-sale',
        popover: {
            title: 'Catat Penjualan',
            description: 'Cara cepat untuk mencatat transaksi penjualan manual tanpa masuk ke menu POS.',
            side: 'bottom',
            align: 'start'
        }
    },
    {
        element: '#tour-add-purchase',
        popover: {
            title: 'Catat Pembelian',
            description: 'Catat stok masuk atau pembelian barang dari supplier untuk memperbarui inventaris.',
            side: 'bottom',
            align: 'start'
        }
    },
    {
        element: '#tour-add-product',
        popover: {
            title: 'Tambah Produk Cepat',
            description: 'Jalan pintas untuk menambahkan produk baru ke katalog toko Anda.',
            side: 'bottom',
            align: 'start'
        }
    }
];

export function OnboardingTour({ tourId = 'onboarding-tour', steps, runOnce = true, loading = false, isActive = true }: OnboardingTourProps) {
    const driverRef = useRef<any>(null);

    const createDriver = useCallback(() => {
        const storageKey = `has-seen-${tourId}`;
        const tourSteps = steps || defaultSteps;

        const driverObj = driver({
            showProgress: true,
            animate: true,
            allowClose: true,
            doneBtnText: 'Selesai',
            nextBtnText: 'Lanjut',
            prevBtnText: 'Kembali',
            progressText: '{{current}} dari {{total}}',
            steps: tourSteps,
            popoverClass: 'tour-with-skip',
            onPopoverRender: (popover: any) => {
                // Inject a "Skip Semua" button into the popover footer
                const footerBtns = popover.footerButtons;
                if (footerBtns) {
                    const skipBtn = document.createElement('button');
                    skipBtn.textContent = 'Skip Semua';
                    skipBtn.className = 'tour-skip-all-btn';
                    skipBtn.style.cssText = 'background: none; border: 1px solid #999; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; color: #666; margin-right: auto; order: -1;';
                    skipBtn.addEventListener('click', () => {
                        skipAllTours();
                        driverObj.destroy();
                    });
                    // Insert as the first button (left side)
                    footerBtns.insertBefore(skipBtn, footerBtns.firstChild);
                }
            },
            onDestroyStarted: () => {
                localStorage.setItem(storageKey, 'true');
                driverObj.destroy();
            },
        });

        driverRef.current = driverObj;
        return driverObj;
    }, [tourId, steps]);

    const destroyDriver = useCallback(() => {
        if (driverRef.current) {
            try {
                if (driverRef.current.isActive && driverRef.current.isActive()) {
                    driverRef.current.destroy();
                }
            } catch (_) { /* ignore */ }
            driverRef.current = null;
        }
    }, []);

    // Create/destroy driver based on isActive + loading state
    useEffect(() => {
        if (!isActive || loading) {
            destroyDriver();
            return;
        }

        // isActive && !loading: create driver and auto-start if not seen
        const storageKey = `has-seen-${tourId}`;
        const hasSeenTour = localStorage.getItem(storageKey);

        if (runOnce && hasSeenTour) {
            // Still create the driver so handleRestart works, but don't auto-start
            createDriver();
            return () => { destroyDriver(); };
        }

        const driverObj = createDriver();
        const timer = setTimeout(() => {
            driverObj.drive();
        }, 1500);

        return () => {
            clearTimeout(timer);
            destroyDriver();
        };
    }, [isActive, loading, tourId, steps, runOnce, createDriver, destroyDriver]);

    const handleRestart = () => {
        localStorage.removeItem(`has-seen-${tourId}`);
        // Destroy existing driver if active
        destroyDriver();
        // Create a fresh one and start it
        const driverObj = createDriver();
        setTimeout(() => {
            driverObj.drive();
        }, 300);
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-brand-orange"
                        onClick={handleRestart}
                        disabled={loading}
                    >
                        <HelpCircle className="w-5 h-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Putar Ulang Panduan</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
