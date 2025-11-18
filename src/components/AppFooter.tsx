export function AppFooter() {
  return (
    <footer className="bg-brand-black text-brand-white border-t-4 border-brand-orange">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h3 className="font-display text-2xl font-bold text-brand-orange">WarungOS</h3>
            <p className="font-mono text-sm text-muted-foreground max-w-md mt-2">
              Sistem POS modern untuk warung, dirancang untuk Generasi Z.
            </p>
            <p className="font-mono text-xs text-muted-foreground/50 mt-4">
              Dibangun dengan ❤��� di Cloudflare.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-4">
            <span className="font-mono text-sm font-bold text-brand-white">
              Dipersembahkan oleh
            </span>
            <div className="flex flex-col items-center md:items-end gap-3">
              <a
                href="https://rsquareidea.my.id/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group bg-brand-white p-3 border-2 border-brand-orange shadow-hard-sm hover:shadow-hard transition-all"
              >
                <img
                  src="https://i.imgur.com/MmO4CAn.png"
                  alt="RSQUARE Logo"
                  className="h-10 w-auto transition-transform duration-300 group-hover:scale-110"
                />
                <span className="font-display text-xl font-bold text-brand-black">RSQUARE</span>
              </a>
              <p className="font-mono text-xs text-muted-foreground text-center md:text-right max-w-xs">
                Menyediakan template aplikasi Google Sheets untuk bisnis Anda.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}