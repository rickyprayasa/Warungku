import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { offlineSync } from '@/lib/offline-sync';

export function OfflineStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Update online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to offline queue changes
    const unsubscribe = offlineSync.subscribe((queue) => {
      setPendingCount(queue.length);
    });

    // Initial count
    setPendingCount(offlineSync.getPendingCount());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // Don't show anything if online and no pending items
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`flex items-center gap-2 px-4 py-2 border-2 border-black shadow-hard ${
          isOnline
            ? 'bg-green-100 text-green-900'
            : 'bg-red-100 text-red-900'
        }`}
      >
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span className="font-mono text-sm font-bold">
              Online
              {pendingCount > 0 && ` (${pendingCount} pending)`}
            </span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span className="font-mono text-sm font-bold">
              Offline
              {pendingCount > 0 && ` (${pendingCount} tersimpan)`}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
