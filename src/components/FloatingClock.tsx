import { useEffect, useState } from 'react';
import { Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useWarungStore } from '@/lib/store';

export function FloatingClock() {
    const isAuthenticated = useWarungStore((state) => state.isAuthenticated);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const stored = localStorage.getItem('clock-collapsed');
        return stored === 'true';
    });
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const stored = localStorage.getItem('sidebar-collapsed');
        return stored === 'true';
    });

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Listen for sidebar collapse changes
    useEffect(() => {
        const handleStorageChange = () => {
            const stored = localStorage.getItem('sidebar-collapsed');
            setSidebarCollapsed(stored === 'true');
        };

        window.addEventListener('storage', handleStorageChange);
        const interval = setInterval(handleStorageChange, 100);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('clock-collapsed', String(newState));
    };

    if (!isAuthenticated) return null;

    const formatTime = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return { hours, minutes, seconds };
    };

    const formatDate = (date: Date) => {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
        
        const dayName = days[date.getDay()];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        
        return { dayName, day, month, year };
    };

    const time = formatTime(currentTime);
    const dateInfo = formatDate(currentTime);

    // Calculate left position based on sidebar state (on desktop only)
    const leftPosition = sidebarCollapsed ? 'left-[calc(5rem+1.5rem)]' : 'left-[calc(16rem+1.5rem)]';

    return (
        <div className={`hidden md:block fixed top-6 z-[9999] ${leftPosition} pointer-events-auto select-none transition-all duration-300`}>
            <div className="bg-brand-white border-4 border-brand-black rounded-none shadow-hard overflow-hidden">
                {isCollapsed ? (
                    // Collapsed View - Compact horizontal layout
                    <button 
                        onClick={toggleCollapse}
                        className="flex items-center gap-3 p-3 hover:bg-brand-orange/10 transition-colors"
                    >
                        <Clock className="w-5 h-5 text-brand-orange flex-shrink-0" />
                        <div className="flex items-baseline gap-1 font-mono font-black text-xl text-brand-black">
                            <span>{time.hours}</span>
                            <span>:</span>
                            <span>{time.minutes}</span>
                        </div>
                        <div className="h-6 w-px bg-brand-black/20" />
                        <Calendar className="w-4 h-4 text-brand-orange flex-shrink-0" />
                        <p className="font-mono text-sm font-bold text-brand-black whitespace-nowrap">
                            {dateInfo.day} {dateInfo.month}
                        </p>
                        <ChevronDown className="w-4 h-4 text-brand-black/50 ml-1" />
                    </button>
                ) : (
                    // Expanded View - Full horizontal layout
                    <div className="flex items-center gap-4 p-4">
                        {/* Time Display */}
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-brand-orange flex-shrink-0" />
                            <div className="flex items-baseline gap-1 font-mono font-black text-2xl text-brand-black">
                                <span>{time.hours}</span>
                                <span className="animate-pulse">:</span>
                                <span>{time.minutes}</span>
                                <span className="text-lg text-brand-orange animate-pulse">:{time.seconds}</span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-10 w-px bg-brand-black/20" />

                        {/* Date Display */}
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-brand-orange flex-shrink-0" />
                            <div>
                                <p className="font-mono text-xs font-bold text-brand-orange uppercase tracking-wider leading-none">
                                    {dateInfo.dayName}
                                </p>
                                <p className="font-display font-bold text-brand-black text-base leading-tight mt-1">
                                    {dateInfo.day} {dateInfo.month} {dateInfo.year}
                                </p>
                            </div>
                        </div>

                        {/* Collapse Button */}
                        <button
                            onClick={toggleCollapse}
                            className="ml-2 p-1 hover:bg-brand-orange/20 transition-colors rounded-none"
                            title="Ciutkan"
                        >
                            <ChevronUp className="w-4 h-4 text-brand-black/50" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
