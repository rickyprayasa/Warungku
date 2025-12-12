import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Construction } from 'lucide-react';

export function AdminAnalyticsPage() {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-display font-bold text-brand-black flex items-center gap-3">
                    <BarChart3 className="w-8 h-8" />
                    Platform Analytics
                </h1>
                <p className="text-muted-foreground font-mono text-sm mt-1">
                    Statistik dan analitik platform
                </p>
            </div>

            {/* Coming Soon */}
            <Card className="border-4 border-brand-black rounded-none shadow-hard">
                <CardContent className="p-12 text-center">
                    <Construction className="w-16 h-16 mx-auto text-brand-orange mb-4" />
                    <h2 className="text-2xl font-display font-bold mb-2">Coming Soon</h2>
                    <p className="text-muted-foreground font-mono">
                        Fitur Analytics sedang dalam pengembangan.
                    </p>
                    <p className="text-sm text-muted-foreground font-mono mt-4">
                        Akan menampilkan grafik dan statistik seperti:
                    </p>
                    <ul className="text-sm text-muted-foreground font-mono mt-2 space-y-1">
                        <li>• Total revenue trend</li>
                        <li>• Active users per day/week/month</li>
                        <li>• New signups trend</li>
                        <li>• Most active stores</li>
                        <li>• Plan distribution</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
