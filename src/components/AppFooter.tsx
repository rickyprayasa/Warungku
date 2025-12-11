import { ExternalLink, Youtube, Instagram, Share2, Download, Facebook, Twitter, Share, Mail, Phone, MapPin } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function AppFooter() {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(() => {
    if (qrRef.current === null) {
      return;
    }

    toPng(qrRef.current, { cacheBust: true, backgroundColor: 'white' })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'omzetin-qr.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Failed to generate QR code image', err);
      });
  }, [qrRef]);

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'OMZETIN',
          text: shareText,
          url: 'https://omzetin.web.id',
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText('https://omzetin.web.id');
        toast.success("Link berhasil disalin!", {
          description: "Silakan bagikan link yang telah disalin.",
        });
      } catch (err) {
        console.error('Failed to copy: ', err);
        toast.error("Gagal menyalin link.");
      }
    }
  };

  const shareUrl = "https://omzetin.web.id";
  const shareText = "🚀 Revolusi Warung Kamu dengan OMZETIN! Aplikasi kasir GRATIS yang bikin jualan makin rapi, stok aman, dan omzet melesat! 💰✨ Yuk, cobain sekarang!";

  return (
    <footer className="bg-brand-black text-brand-white border-t-4 border-brand-orange">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Column 1: Brand */}
          <div className="text-center md:text-left">
            <a href="/" className="inline-block hover:opacity-80 transition-opacity">
              <h3 className="font-display text-2xl font-bold text-brand-orange uppercase tracking-wider">OMZETIN</h3>
            </a>
            <p className="font-mono text-sm text-gray-400 max-w-md mt-2">
              Sistem POS modern untuk warung, dirancang untuk Generasi Z.
            </p>
            <p className="font-mono text-xs text-gray-500 mt-4">
              Dibangun dengan ❤️ di Cloudflare.
            </p>
          </div>

          {/* Column 2: Contact Info */}
          <div className="text-center md:text-left">
            <h4 className="font-display text-lg font-bold text-brand-orange uppercase tracking-wider mb-4">Kontak Kami</h4>
            <div className="space-y-4">
              <div className="flex items-start justify-center md:justify-start gap-3 group">
                <Mail className="w-5 h-5 text-brand-orange shrink-0 mt-0.5" />
                <a
                  href="mailto:cs.kontak@rsquareidea.my.id"
                  className="font-mono text-sm text-gray-300 hover:text-brand-orange transition-colors"
                >
                  cs.kontak@rsquareidea.my.id
                </a>
              </div>

              <div className="flex items-start justify-center md:justify-start gap-3 group">
                <Phone className="w-5 h-5 text-brand-orange shrink-0 mt-0.5" />
                <a
                  href="https://wa.me/6285794047694"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-gray-300 hover:text-brand-orange transition-colors"
                >
                  085794047694
                </a>
              </div>

              <div className="flex items-start justify-center md:justify-start gap-3 group">
                <MapPin className="w-5 h-5 text-brand-orange shrink-0 mt-0.5" />
                <p className="font-mono text-sm text-gray-300 text-left">
                  Perumahan Bumi Arum Regency,<br />
                  Kab. Bandung, Kec. Rancaekek,<br />
                  Kel. Cangkuang 40394
                </p>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <button className="flex items-center justify-center md:justify-start gap-2 font-mono text-sm text-gray-300 hover:text-brand-orange transition-colors group w-full md:w-auto mt-2">
                    <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Bagikan OMZETIN
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-brand-black border-brand-orange text-brand-white">
                  <DialogHeader>
                    <DialogTitle className="text-center font-display text-xl text-brand-orange uppercase tracking-wider">
                      Scan untuk Membuka
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col items-center justify-center p-6 space-y-4">
                    <div ref={qrRef} className="p-4 bg-white rounded-xl">
                      <div className="p-4 bg-white rounded-xl shadow-[0_0_15px_rgba(255,138,0,0.5)] border border-brand-orange/20">
                        <QRCodeSVG
                          value="https://omzetin.web.id"
                          size={200}
                          level="H"
                          includeMargin={false}
                        />
                      </div>
                    </div>
                    <p className="text-center font-mono text-sm text-gray-400">
                      Arahkan kamera HP Anda ke QR Code di atas untuk membuka OMZETIN.
                    </p>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-orange text-brand-black font-bold rounded-lg hover:bg-brand-orange/90 transition-colors w-full justify-center"
                    >
                      <Download className="w-4 h-4" />
                      Download QR Code
                    </button>

                    <div className="w-full pt-4 border-t border-gray-800">
                      <p className="text-center font-mono text-xs text-gray-500 mb-3 uppercase tracking-wider">
                        Bagikan via
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(shareText)}%20${encodeURIComponent(shareUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-[#25D366]/10 hover:bg-[#25D366] border border-[#25D366]/20 hover:border-[#25D366] rounded-lg transition-all group"
                          title="WhatsApp"
                        >
                          <svg className="w-5 h-5 text-[#25D366] group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </a>
                        <a
                          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-[#1877F2]/10 hover:bg-[#1877F2] border border-[#1877F2]/20 hover:border-[#1877F2] rounded-lg transition-all group"
                          title="Facebook"
                        >
                          <Facebook className="w-5 h-5 text-[#1877F2] group-hover:text-white transition-colors" />
                        </a>
                        <a
                          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2] border border-[#1DA1F2]/20 hover:border-[#1DA1F2] rounded-lg transition-all group"
                          title="Twitter"
                        >
                          <Twitter className="w-5 h-5 text-[#1DA1F2] group-hover:text-white transition-colors" />
                        </a>
                        <button
                          onClick={handleWebShare}
                          className="p-2 bg-brand-orange/10 hover:bg-brand-orange border border-brand-orange/20 hover:border-brand-orange rounded-lg transition-all group"
                          title="Share to other apps"
                        >
                          <Share className="w-5 h-5 text-brand-orange group-hover:text-brand-black transition-colors" />
                        </button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Social Media */}
            <div className="mt-6">
              <h5 className="font-mono text-xs font-bold text-gray-400 uppercase mb-3">Ikuti Kami</h5>
              <div className="flex items-center justify-center md:justify-start gap-3">
                <a
                  href="https://www.youtube.com/@RSQUAREIDEA"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-brand-white/10 hover:bg-red-600 border-2 border-brand-white/20 hover:border-red-600 rounded-lg transition-all group"
                  title="YouTube"
                >
                  <Youtube className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                </a>
                <a
                  href="https://www.instagram.com/rsquareidea/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-brand-white/10 hover:bg-pink-600 border-2 border-brand-white/20 hover:border-pink-600 rounded-lg transition-all group"
                  title="Instagram"
                >
                  <Instagram className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                </a>
                <a
                  href="https://www.tiktok.com/@rsquareidea?_t=ZS-8wWydvIjmGG&_r=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-brand-white/10 hover:bg-black border-2 border-brand-white/20 hover:border-white rounded-lg transition-all group"
                  title="TikTok"
                >
                  <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Column 3: RSQUARE */}
          <div className="flex flex-col items-center md:items-end gap-4">
            <span className="font-mono text-sm font-bold text-brand-white uppercase tracking-wider">
              Dipersembahkan oleh
            </span>
            <div
              className="flex items-center gap-3 group bg-brand-white p-3 border-2 border-brand-orange rounded-lg shadow-[2px_2px_0px_0px_rgba(255,138,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(255,138,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-default"
            >
              <img
                src="/rsquare-logo-40.png"
                srcSet="/rsquare-logo-40.png 1x, /rsquare-logo-80.png 2x"
                alt="RSQUARE Logo"
                width={40}
                height={40}
                className="h-10 w-10 transition-transform duration-300 group-hover:scale-110"
              />
              <span className="font-display text-xl font-bold text-brand-black uppercase tracking-wider">RSQUARE</span>
            </div>
            <p className="font-mono text-xs text-gray-400 text-center md:text-right max-w-xs">
              Menyediakan template aplikasi Google Sheets untuk bisnis Anda.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-brand-white/10">
          <p className="text-center font-mono text-xs text-gray-500">
            © {new Date().getFullYear()} OMZETIN by RSQUARE. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}