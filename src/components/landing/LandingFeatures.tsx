
export function LandingFeatures() {
  return (
    <section id="funkcje" className="py-20 bg-[#090D16] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-blue-500 text-xs font-bold tracking-widest uppercase font-mono block mb-2">
            DLACZEGO DINBOARD?
          </span>
          <h2 className="text-3xl font-extrabold text-white m-0">Stworzony, by oszczędzać czas instalatorów</h2>
          <p className="text-gray-400 mt-2">
            Przejdź od pomysłu do gotowej szafy i protokołu w kilka minut. Bez skomplikowanego, drogiego oprogramowania typu CAD.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="p-6 bg-[#111827] hover:bg-slate-900 border border-slate-800/80 hover:border-blue-500/30 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <i data-lucide="layers" className="w-5 h-5"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 m-0">Rysowanie szyny DIN</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Proste i szybkie układanie aparatów zabezpieczających i modułowych metodą przeciągnij i upuść. Błyskawicznie zaprojektujesz czytelny wygląd frontu rozdzielnicy.
            </p>
          </div>

          <div className="p-6 bg-[#111827] hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/30 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <i data-lucide="git-merge" className="w-5 h-5"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 m-0">Schemat Jednokreskowy</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Aplikacja automatycznie buduje schemat elektryczny na podstawie ułożonych na szynie aparatów. Koniec z mozolnym, ręcznym rysowaniem linii obwodowych.
            </p>
          </div>

          <div className="p-6 bg-[#111827] hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/30 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <i data-lucide="file-text" className="w-5 h-5"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 m-0">Dokumentacja PDF</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Generuj przejrzyste rysunki montażowe oraz dokumentację odbiorczą powykonawczą gotową do wydruku w kilka sekund, z zachowaniem Twojego logotypu.
            </p>
          </div>

          <div className="p-6 bg-[#111827] hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <i data-lucide="shield-check" className="w-5 h-5"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 m-0">Prywatność i bezpieczeństwo</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Twoje projekty są w 100% poufne. Aplikacja przetwarza dane w Twojej przeglądarce, a pliki projektów (.dinboard) zapisujesz bezpiecznie na własnym dysku.
            </p>
          </div>

          <div className="p-6 bg-[#111827] hover:bg-slate-900 border border-slate-800/80 hover:border-rose-500/30 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <i data-lucide="cpu" className="w-5 h-5"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 m-0">Inteligentna weryfikacja</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Wbudowane algorytmy walidacji na bieżąco sprawdzają poprawność połączeń, pilnują rozkładu obciążenia fazowego i chronią Cię przed krytycznymi błędami.
            </p>
          </div>

          <div className="p-6 bg-[#111827] hover:bg-slate-900 border border-slate-800/80 hover:border-yellow-500/30 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <i data-lucide="database" className="w-5 h-5"></i>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 m-0">Baza własnych aparatów</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Swobodnie importuj pliki wektorowe SVG aparatów zaprojektowanych w zewnętrznych programach graficznych i z łatwością twórz własną bazę unikalnych komponentów.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
