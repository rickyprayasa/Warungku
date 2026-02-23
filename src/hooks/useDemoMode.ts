import { useWarungStore } from '@/lib/store-supabase';
import { DEMO_EMAIL } from '@/lib/constants';

export function useDemoMode() {
    const currentUser = useWarungStore((state) => state.currentUser);
    const isDemo = currentUser?.email === DEMO_EMAIL;

    return { isDemo };
}
