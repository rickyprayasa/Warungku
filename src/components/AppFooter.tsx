import { ExternalLink, Youtube, Instagram } from 'lucide-react';

export function AppFooter() {
  return (
    <footer className="bg-brand-black text-brand-white border-t-4 border-brand-orange">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Column 1: Brand */}
          <div className="text-center md:text-left">
            <h3 className="font-display text-2xl font-bold text-brand-orange uppercase tracking-wider">OMZETIN</h3>
            <p className="font-mono text-sm text-gray-400 max-w-md mt-2">
              Sistem POS modern untuk warung, dirancang untuk Generasi Z.
            </p>
            <p className="font-mono text-xs text-gray-500 mt-4">
              Dibangun dengan ❤️ di Cloudflare.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="text-center md:text-left">
            <h4 className="font-display text-lg font-bold text-brand-orange uppercase tracking-wider mb-4">Tautan Cepat</h4>
            <div className="space-y-3">
              <a
                href="https://rsquareidea.my.id/templates"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center md:justify-start gap-2 font-mono text-sm text-gray-300 hover:text-brand-orange transition-colors group"
              >
                <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Galeri Template Google Sheets
              </a>
              <a
                href="https://rsquareidea.my.id/jasa-kustom.html"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center md:justify-start gap-2 font-mono text-sm text-gray-300 hover:text-brand-orange transition-colors group"
              >
                <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Request Template Kustom
              </a>
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
            <a
              href="https://rsquareidea.my.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group bg-brand-white p-3 border-2 border-brand-orange rounded-lg shadow-[2px_2px_0px_0px_rgba(255,138,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(255,138,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              <img
                src="https://i.imgur.com/MmO4CAn.png"
                alt="RSQUARE Logo"
                className="h-10 w-auto transition-transform duration-300 group-hover:scale-110"
              />
              <span className="font-display text-xl font-bold text-brand-black uppercase tracking-wider">RSQUARE</span>
            </a>
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