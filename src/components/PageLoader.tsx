import { AnimatedLogo } from '@/components/AnimatedLogo';

export const PageLoader = () => {
    return (
        <div className="fixed inset-0 bg-white flex flex-col items-center justify-center overflow-hidden z-[9999]">
            {/* OMZETIN Logo */}
            <div className="mb-8 scale-110">
                <AnimatedLogo isActive={true} showText={false} />
            </div>

            {/* Loading Bar */}
            <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-brand-orange animate-pulse"
                    style={{
                        animation: 'loadingBar 1.5s ease-in-out infinite',
                        width: '50%',
                        transformOrigin: 'left'
                    }}
                />
            </div>

            {/* Loading text */}
            <div style={{
                marginTop: '20px',
                fontFamily: 'monospace',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1A1A1A',
                textTransform: 'uppercase',
                letterSpacing: '1px',
            }}>
                Memuat komponen...
            </div>

            {/* CSS animations */}
            <style dangerouslySetInnerHTML={{
                __html: `
          @keyframes loadingBar {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `
            }} />
        </div>
    );
};
