
interface LandingHeroProps {
  onOpenProjectFile: () => void;
  onOpenNewProject: () => void;
}

export function LandingHero({ onOpenProjectFile, onOpenNewProject }: LandingHeroProps) {
  return (
    <section className="relative pt-8 pb-16 md:py-20 overflow-hidden border-b border-gray-900">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none"></div>
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Lewa Kolumna */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              DINBOARD WEB v1.2
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight text-white m-0 pb-2">
              Projektowanie schematu <br />
              <span className="bg-gradient-to-r from-amber-400 via-amber-200 to-white bg-clip-text text-transparent">
                instalacji elektrycznej
              </span>
            </h1>

            <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-xl">
              DINBoard wspiera elektryka przy wykonaniu rozdzielnicy, tworzeniu czytelnego schematu instalacji, sprawdzeniu obwodów oraz przygotowaniu profesjonalnej dokumentacji odbiorczej PDF. Wszystko w Twojej przeglądarce.
            </p>

            {/* Profesjonalne info o wersji testowej */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 max-w-xl">
              <i data-lucide="alert-triangle" className="w-5 h-5 text-amber-500 shrink-0 mt-0.5"></i>
              <div className="text-xs text-gray-300">
                <strong className="text-amber-500">Wersja testowa (BETA):</strong> Aplikacja rozwija się dynamicznie. Wygenerowane schematy i obliczenia bilansu faz należy zweryfikować z wiedzą inżynierską przed montażem.
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={onOpenProjectFile}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-gray-200 border border-slate-700 font-medium rounded-lg text-sm transition-all flex items-center gap-2"
              >
                <i data-lucide="folder-open" className="w-4 h-4"></i>
                Otwórz projekt z dysku
              </button>
            </div>
          </div>

          {/* Prawa Kolumna - Płytka Startowa */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm">
              <button
                onClick={onOpenNewProject}
                className="w-full group block relative p-8 bg-slate-900/60 hover:bg-slate-900 border-2 border-dashed border-blue-500/30 hover:border-blue-500/80 rounded-2xl transition-all duration-300 text-center glow-blue"
              >
                <div className="absolute inset-0 bg-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500/20 transition-all mb-4">
                  <i data-lucide="plus" className="w-8 h-8 text-blue-400 group-hover:text-blue-300"></i>
                </div>

                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors m-0">Utwórz nowy projekt</h3>
                <p className="text-xs text-gray-500 mt-2">Rozpocznij projektowanie czystej szyny DIN, konfiguruj fazy i wygeneruj schemat montażowy.</p>

                <div className="mt-6 inline-flex items-center gap-1 text-xs text-blue-400 font-semibold group-hover:underline">
                  Uruchom darmowy edytor
                  <i data-lucide="chevron-right" className="w-4 h-4"></i>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
