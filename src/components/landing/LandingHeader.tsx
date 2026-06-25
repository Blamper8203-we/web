
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#090D16]/80 border-b border-gray-800/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden drop-shadow-lg shadow-black/20">
            <img src="/favicon-192.png" alt="DinBoard Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              Din<span className="text-amber-500">Board</span>
            </span>
            <span className="text-[9px] block text-gray-400 -mt-1 font-mono tracking-widest uppercase">
              Web Application
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium font-sans text-gray-400">
          <a href="#funkcje" className="hover:text-white transition-colors">Możliwości</a>
          <a href="#demo-sandbox" className="hover:text-white transition-colors">Interfejs</a>
          <a href="#artykuly" className="hover:text-white transition-colors">Baza wiedzy</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://suppi.pl/dinboard"
            target="_blank"
            rel="noreferrer"
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition-all flex items-center gap-2 shadow-md"
          >
            <i data-lucide="coffee" className="w-4 h-4"></i>
            <span className="hidden sm:inline">Wesprzyj projekt</span>
          </a>
        </div>
      </div>
    </header>
  );
}
