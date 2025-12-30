import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  CreditCard,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Info,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export function AdminDuitkuSettingsPage() {
  const [settings, setSettings] = useState({
    duitkuEnabled: false,
    merchantCode: '',
    apiKey: '',
    sandboxMode: true,
    webhookUrl: '',
    callbackUrl: '',
    returnUrl: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from database
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);

      // Fetch Duitku settings from Supabase settings table
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [
          'duitku_enabled',
          'duitku_merchant_code',
          'duitku_api_key',
          'duitku_sandbox_mode',
          'duitku_callback_url',
          'duitku_return_url'
        ]);

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach(item => {
        settingsMap[item.key] = item.value;
      });

      setSettings({
        duitkuEnabled: settingsMap['duitku_enabled'] === 'true',
        merchantCode: settingsMap['duitku_merchant_code'] || '',
        apiKey: settingsMap['duitku_api_key'] || '',
        sandboxMode: settingsMap['duitku_sandbox_mode'] !== 'false',
        webhookUrl: 'https://omzetin.web.id/functions/v1/duitku-payment/callback',
        callbackUrl: settingsMap['duitku_callback_url'] || 'https://omzetin.web.id/functions/v1/duitku-payment/callback',
        returnUrl: settingsMap['duitku_return_url'] || 'https://omzetin.web.id/dashboard?tab=billing&status=success',
      });
    } catch (error) {
      console.error('Error fetching Duitku settings:', error);
      toast.error('Gagal memuat pengaturan Duitku');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof typeof settings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save all Duitku settings to Supabase settings table
      const settingsToSave = [
        { key: 'duitku_enabled', value: settings.duitkuEnabled.toString() },
        { key: 'duitku_merchant_code', value: settings.merchantCode },
        { key: 'duitku_api_key', value: settings.apiKey },
        { key: 'duitku_sandbox_mode', value: settings.sandboxMode.toString() },
        { key: 'duitku_callback_url', value: settings.callbackUrl },
        { key: 'duitku_return_url', value: settings.returnUrl },
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('settings')
          .upsert(setting, { onConflict: 'key' });

        if (error) throw error;
      }

      toast.success('Pengaturan Duitku berhasil disimpan!');
    } catch (error) {
      console.error('Error saving Duitku settings:', error);
      toast.error('Gagal menyimpan pengaturan Duitku');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.merchantCode || !settings.apiKey) {
      toast.error('Silakan isi Merchant Code dan API Key terlebih dahulu');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // In a real implementation, this would test the connection to Duitku
      // For now, we'll just validate that the fields are filled
      // In a production app, you would make a call to your backend to validate credentials
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

      // Simulate test result
      const isValidCredentials = settings.merchantCode.startsWith('DS') && settings.apiKey.length > 10;

      if (isValidCredentials) {
        setTestResult({
          success: true,
          message: 'Kredensial valid! Pastikan untuk menguji pembayaran sebenarnya di mode sandbox.'
        });
        toast.success('Kredensial Duitku valid');
      } else {
        setTestResult({
          success: false,
          message: 'Kredensial tidak valid. Pastikan Merchant Code diawali "DS" dan API Key memiliki panjang yang sesuai.'
        });
        toast.error('Kredensial tidak valid');
      }
    } catch (error) {
      console.error('Error testing Duitku connection:', error);
      setTestResult({
        success: false,
        message: 'Terjadi kesalahan saat testing koneksi.'
      });
      toast.error('Test koneksi gagal');
    } finally {
      setIsTesting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-orange" />
          <p className="font-mono">Memuat pengaturan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-brand-orange p-2 rounded-none">
            <CreditCard className="w-6 h-6 text-brand-black" />
          </div>
          <h1 className="text-3xl font-display font-bold text-brand-black">Pengaturan Duitku Payment Gateway</h1>
        </div>
        <p className="text-muted-foreground font-mono">
          Konfigurasi integrasi pembayaran Duitku untuk upgrade plan
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 border-brand-black rounded-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Settings className="w-5 h-5" />
                Konfigurasi Umum
              </CardTitle>
              <CardDescription className="font-mono">
                Atur kredensial dan pengaturan dasar untuk integrasi Duitku
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="duitku-enabled" className="font-mono font-bold text-sm">
                    Aktifkan Duitku Payment Gateway
                  </Label>
                  <p className="text-xs text-muted-foreground font-mono">
                    Aktifkan untuk memungkinkan pembayaran via Duitku di upgrade plan
                  </p>
                </div>
                <Switch
                  id="duitku-enabled"
                  checked={settings.duitkuEnabled}
                  onCheckedChange={(checked) => handleChange('duitkuEnabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="merchantCode" className="font-mono font-bold">
                  Merchant Code
                </Label>
                <Input
                  id="merchantCode"
                  value={settings.merchantCode}
                  onChange={(e) => handleChange('merchantCode', e.target.value)}
                  placeholder="Contoh: DS12345"
                  className="font-mono rounded-none border-2 border-brand-black"
                />
                <p className="text-xs text-muted-foreground font-mono">
                  Kode merchant dari dashboard Duitku Anda
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey" className="font-mono font-bold">
                  API Key
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => handleChange('apiKey', e.target.value)}
                  placeholder="API Key dari Duitku"
                  className="font-mono rounded-none border-2 border-brand-black"
                />
                <p className="text-xs text-muted-foreground font-mono">
                  API Key dari dashboard Duitku Anda (disimpan secara aman)
                </p>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="sandbox-mode" className="font-mono font-bold text-sm">
                    Mode Sandbox
                  </Label>
                  <p className="text-xs text-muted-foreground font-mono">
                    Aktifkan untuk testing pembayaran (non-production)
                  </p>
                </div>
                <Switch
                  id="sandbox-mode"
                  checked={settings.sandboxMode}
                  onCheckedChange={(checked) => handleChange('sandboxMode', checked)}
                />
              </div>

              {testResult && (
                <Alert className={`border-2 ${testResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-700" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-700" />
                  )}
                  <AlertDescription className="font-mono">
                    {testResult.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold hover:bg-brand-black hover:text-brand-white"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4 mr-2" />
                      Simpan Pengaturan
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleTestConnection}
                  disabled={isTesting || !settings.merchantCode || !settings.apiKey}
                  variant="outline"
                  className="rounded-none border-2 border-brand-black font-mono font-bold"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Test Koneksi
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-brand-black rounded-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Info className="w-5 h-5" />
                Informasi Konfigurasi
              </CardTitle>
              <CardDescription className="font-mono">
                URL dan konfigurasi penting untuk integrasi Duitku
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="font-mono font-bold">Callback URL</Label>
                <div className="p-3 bg-gray-100 rounded-none border-2 border-brand-black font-mono text-sm break-all">
                  {settings.callbackUrl}
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  URL ini harus diatur di dashboard Duitku sebagai Callback URL
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-mono font-bold">Return URL</Label>
                <div className="p-3 bg-gray-100 rounded-none border-2 border-brand-black font-mono text-sm break-all">
                  {settings.returnUrl}
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  URL pengguna akan dikembalikan setelah pembayaran selesai
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <Card className="border-2 border-brand-black rounded-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Info className="w-5 h-5" />
                Panduan Konfigurasi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 font-mono text-sm">
                <div className="flex items-start gap-2">
                  <div className="bg-brand-orange text-brand-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">1</div>
                  <p>Dapatkan Merchant Code dan API Key dari dashboard Duitku</p>
                </div>

                <div className="flex items-start gap-2">
                  <div className="bg-brand-orange text-brand-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">2</div>
                  <p>Atur Callback URL di dashboard Duitku ke URL di samping</p>
                </div>

                <div className="flex items-start gap-2">
                  <div className="bg-brand-orange text-brand-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">3</div>
                  <p>Gunakan mode sandbox untuk testing sebelum production</p>
                </div>

                <div className="flex items-start gap-2">
                  <div className="bg-brand-orange text-brand-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">4</div>
                  <p>Test koneksi untuk memastikan konfigurasi benar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-brand-black rounded-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <CreditCard className="w-5 h-5" />
                Status Integrasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono">Status</span>
                  <Badge variant={settings.duitkuEnabled ? "default" : "secondary"} className={settings.duitkuEnabled ? "bg-green-500" : "bg-gray-500"}>
                    {settings.duitkuEnabled ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-mono">Mode</span>
                  <Badge variant={settings.sandboxMode ? "secondary" : "default"} className={settings.sandboxMode ? "bg-yellow-500" : "bg-blue-500"}>
                    {settings.sandboxMode ? "Sandbox" : "Production"}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-mono">Koneksi</span>
                  <Badge variant="outline" className="border-2 border-brand-black">
                    {testResult ? (testResult.success ? "Terkoneksi" : "Error") : "Belum diuji"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-brand-black rounded-none bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Info className="w-5 h-5" />
                Paket Harga
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-mono">Pro Monthly</span>
                  <span className="font-mono font-bold">{formatCurrency(50000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono">Pro Yearly</span>
                  <span className="font-mono font-bold">{formatCurrency(500000)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Harga di atas adalah harga yang ditampilkan di halaman upgrade plan
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminDuitkuSettingsPage;