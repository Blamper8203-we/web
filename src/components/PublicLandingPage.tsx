import { useState, useEffect } from "react";
import "./PublicLandingPage.css";

// Izolacja Tailwind na poziomie komponentu (aby nie zepsuć reszty programu)
const TAILWIND_SCRIPT_ID = "tailwind-cdn-landing";

export function PublicLandingPage({ 
  onOpenNewProject, 
  onOpenProjectFile,
  onOpenFeedback
}: { 
  onOpenNewProject: () => void;
  onOpenProjectFile: () => void;
  onOpenFeedback: () => void;
}) {

  const [isReady, setIsReady] = useState(false);

  // Wstrzykiwanie bezpiecznego Tailwinda bez Preflighta (tylko w obszarze Landingu)
  useEffect(() => {
    if (!document.getElementById(TAILWIND_SCRIPT_ID)) {
      const configScript = document.createElement("script");
      configScript.innerHTML = `
        window.tailwind = {
          config: {
            important: '#landing-page-root',
            corePlugins: {
              preflight: false,
            },
            theme: {
              extend: {
                fontFamily: {
                  sans: ['Roboto', 'sans-serif'],
                  mono: ['Fira Code', 'monospace'],
                },
                colors: {
                  brand: {
                    bg: '#090D16',
                    card: '#111827',
                    accent: '#F59E0B',
                    blueNeon: '#3B82F6',
                    success: '#10B981'
                  }
                }
              }
            }
          }
        };
      `;
      document.head.appendChild(configScript);

      const script = document.createElement("script");
      script.id = TAILWIND_SCRIPT_ID;
      script.src = "https://cdn.tailwindcss.com";
      script.onload = () => {
        // Małe opóźnienie, aby dać Tailwindowi czas na przetworzenie klas
        setTimeout(() => setIsReady(true), 150);
      };
      document.head.appendChild(script);

      // Ikony Lucide z CDN
      const lucideScript = document.createElement("script");
      lucideScript.src = "https://unpkg.com/lucide@latest";
      lucideScript.onload = () => {
        if ((window as any).lucide) {
          (window as any).lucide.createIcons();
        }
      };
      document.head.appendChild(lucideScript);

      if (!document.getElementById("google-fonts-roboto")) {
          const fontLink = document.createElement("link");
          fontLink.id = "google-fonts-roboto";
          fontLink.rel = "stylesheet";
          fontLink.href = "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap";
          document.head.appendChild(fontLink);
      }
    } else {
      setIsReady(true);
      if ((window as any).lucide) {
        setTimeout(() => (window as any).lucide.createIcons(), 50);
      }
    }

    return () => {
      // Skrypty zostawiamy na wypadek przejścia w tę i z powrotem, ale ich zakres i tak ogranicza się do #landing-page-root
    };
  }, []);



  const [activeArticle, setActiveArticle] = useState<number>(1);

  const knowledgeBase = {
      1: {
          title: "Projektowanie schematu instalacji elektrycznej krok po kroku",
          desc: "Kompletny przewodnik dla instalatora od pustej szyny po finalny wydruk protokołu odbiorczego.",
          content: (
              <>
                  <p className="text-xs text-gray-400 leading-relaxed">
                      Montaż rozdzielnic mieszkaniowych wymaga precyzji i dokładnych wyliczeń prądowych. Tradycyjne narzędzia CAD wymagają godzin spędzonych na ręcznym kreśleniu każdej linii obwodowej i tabeli rozdzielczej. DinBoard automatyzuje ten proces, ułatwiając generowanie czytelnych rysunków dla inwestora.
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                      Intuicyjny panel boczny pozwala w ciągu ułamków sekund przenosić wyłączniki nadprądowe, co bezpośrednio modyfikuje główny bilans jednokreskowy, a tym samym tworzy fundamenty doskonałej instalacji domowej.
                  </p>
                  <div className="border-l-2 border-amber-500 pl-4 py-1 italic text-xs text-gray-300 mt-4">
                      "Dobrze sporządzony schemat jednokreskowy i precyzyjne rozplanowanie szyn DIN to wizytówka profesjonalnego elektroinstalatora."
                  </div>
              </>
          )
      },
      2: {
          title: "Jak obliczyć bilans mocy w domu jednorodzinnym",
          desc: "Dowiedz się, jak uniknąć kosztownych przerw zasilania dzięki wczesnemu wykrywaniu asymetrii rzędów i właściwemu rozdziałowi L1-L3.",
          content: (
              <>
                  <p className="text-xs text-gray-400 leading-relaxed">
                      Kluczowym elementem bezpiecznej instalacji jest zachowanie minimalnej asymetrii obciążenia fazowego w systemach trójfazowych (3F TN-S / TN-C). Nasze algorytmy dbają o to, aby odbiorniki jednofazowe o dużym poborze mocy (jak płyty indukcyjne, pralki czy przepływowe podgrzewacze wody) były rozkładane w sposób optymalny na fazy L1, L2 oraz L3.
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed mt-4">
                      Brak równowagi doprowadzi nie tylko do obciążenia i wybijania zabezpieczenia głównego, ale również potęguje problem upalenia przewodu neutralnego PEN w przypadku przeciążeń. DinBoard liczy te asymetrie i zwraca ewentualne komunikaty błędu już na etapie planowania projektu, a nie przy tablicy w realnym świecie.
                  </p>
              </>
          )
      }
  };

  const [faqState, setFaqState] = useState<Record<number, boolean>>({});
  const toggleFaq = (id: number) => {
      setFaqState(prev => ({ ...prev, [id]: !prev[id] }));
      setTimeout(() => {
          if ((window as any).lucide) (window as any).lucide.createIcons();
      }, 10);
  };

  const [showFab, setShowFab] = useState<boolean>(false);
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      // Pokaż FAB, gdy zjedziemy w dół o więcej niż 600px
      if (e.currentTarget.scrollTop > 600) {
          setShowFab(true);
      } else {
          setShowFab(false);
      }
  };

  return (
    <div id="landing-page-root" onScroll={handleScroll} className={`bg-[#090D16] text-gray-100 font-sans antialiased min-h-screen ${isReady ? 'is-ready' : ''}`}>
      
      {/* Reset podstawowych styli żeby nie odziedziczyć syfu ze starej aplikacji wew. tailwind scope */}
      <style>{`
        #landing-page-root {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          height: 100vh;
          width: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          background-color: #090D16;
          z-index: 1000;
          font-family: 'Roboto', sans-serif !important;
          opacity: 0;
          transition: opacity 0.6s ease-in-out;
        }
        #landing-page-root.is-ready {
          opacity: 1;
        }
        #landing-page-root * {
          box-sizing: border-box;
          font-family: 'Roboto', sans-serif !important;
        }
      `}</style>

      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#090D16]/80 border-b border-gray-800/60 transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden drop-shadow-lg shadow-black/20">
                      <img src="/favicon-192.png" alt="DinBoard Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                      <span className="text-lg font-extrabold tracking-tight text-white">Din<span className="text-amber-500">Board</span></span>
                      <span className="text-[9px] block text-gray-400 -mt-1 font-mono tracking-widest uppercase">Web Application</span>
                  </div>
              </div>
              
              <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
                  <a href="#funkcje" className="hover:text-white transition-colors">Możliwości</a>
                  <a href="#demo-sandbox" className="hover:text-white transition-colors">Interfejs</a>
                  <a href="#artykuly" className="hover:text-white transition-colors">Baza wiedzy</a>
                  <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              </nav>

              <div className="flex items-center gap-3">
                  <a href="https://suppi.pl/dinboard" target="_blank" rel="noreferrer" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition-all flex items-center gap-2 shadow-md">
                      <i data-lucide="coffee" className="w-4 h-4"></i>
                      <span className="hidden sm:inline">Wesprzyj projekt</span>
                  </a>
              </div>
          </div>
      </header>

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
                          <button onClick={onOpenProjectFile} className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-gray-200 border border-slate-700 font-medium rounded-lg text-sm transition-all flex items-center gap-2">
                              <i data-lucide="folder-open" className="w-4 h-4"></i>
                              Otwórz projekt z dysku
                          </button>
                      </div>
                  </div>

                  {/* Prawa Kolumna - Płytka Startowa */}
                  <div className="lg:col-span-5 flex justify-center">
                      <div className="w-full max-w-sm">
                          <button onClick={onOpenNewProject} className="w-full group block relative p-8 bg-slate-900/60 hover:bg-slate-900 border-2 border-dashed border-blue-500/30 hover:border-blue-500/80 rounded-2xl transition-all duration-300 text-center glow-blue">
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

      {/* SEKCJA ZE ZRZUTEM EKRANU APLIKACJI */}
      <section id="demo-sandbox" className="py-16 bg-[#0B0F19] border-b border-gray-900 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-10">
                  <span className="text-amber-500 text-xs font-bold tracking-widest uppercase font-mono block mb-2">PODGLĄD APLIKACJI</span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white m-0 pb-2">Przejrzysty i intuicyjny interfejs roboczy</h2>
                  <p className="text-sm text-gray-400 m-0">Zobacz, jak zaprojektowaliśmy przestrzeń roboczą programu DinBoard pod kątem szybkiej i wygodnej pracy instalatora.</p>
              </div>

              <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80 bg-slate-900">
                  <img src="/assets/desktop-app.png" alt="Zrzut ekranu aplikacji DinBoard" className="w-full h-auto block" />
              </div>
          </div>
      </section>
      <section id="funkcje" className="py-20 bg-[#090D16] relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-3xl mx-auto mb-16">
                  <span className="text-blue-500 text-xs font-bold tracking-widest uppercase font-mono block mb-2">DLACZEGO DINBOARD?</span>
                  <h2 className="text-3xl font-extrabold text-white m-0">Stworzony, by oszczędzać czas instalatorów</h2>
                  <p className="text-gray-400 mt-2">Przejdź od pomysłu do gotowej szafy i protokołu w kilka minut. Bez skomplikowanego, drogiego oprogramowania typu CAD.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="p-6 bg-[#111827] hover:bg-slate-900 border border-slate-800/80 hover:border-blue-500/30 rounded-2xl transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <i data-lucide="layers" className="w-5 h-5"></i>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2 m-0">Rysowanie szyny DIN</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">Proste i szybkie układanie aparatów zabezpieczających i modułowych metodą przeciągnij i upuść. Błyskawicznie zaprojektujesz czytelny wygląd frontu rozdzielnicy.</p>
                  </div>

                  <div className="p-6 bg-[#111827] hover:bg-slate-900 border border-slate-800/80 hover:border-amber-500/30 rounded-2xl transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <i data-lucide="git-merge" className="w-5 h-5"></i>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2 m-0">Schemat Jednokreskowy</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">Aplikacja automatycznie buduje schemat elektryczny na podstawie ułożonych na szynie aparatów. Koniec z mozolnym, ręcznym rysowaniem linii obwodowych.</p>
                  </div>

                  <div className="p-6 bg-[#111827] hover:bg-slate-900 border border-slate-800/80 hover:border-emerald-500/30 rounded-2xl transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <i data-lucide="file-text" className="w-5 h-5"></i>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2 m-0">Dokumentacja PDF</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">Generuj przejrzyste rysunki montażowe oraz dokumentację odbiorczą powykonawczą gotową do wydruku w kilka sekund, z zachowaniem Twojego logotypu.</p>
                  </div>

                  <div className="p-6 bg-[#111827] hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <i data-lucide="shield-check" className="w-5 h-5"></i>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2 m-0">Prywatność i bezpieczeństwo</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">Twoje projekty są w 100% poufne. Aplikacja przetwarza dane w Twojej przeglądarce, a pliki projektów (.dinboard) zapisujesz bezpiecznie na własnym dysku.</p>
                  </div>

                  <div className="p-6 bg-[#111827] hover:bg-slate-900 border border-slate-800/80 hover:border-rose-500/30 rounded-2xl transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <i data-lucide="cpu" className="w-5 h-5"></i>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2 m-0">Inteligentna weryfikacja</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">Wbudowane algorytmy walidacji na bieżąco sprawdzają poprawność połączeń, pilnują rozkładu obciążenia fazowego i chronią Cię przed krytycznymi błędami.</p>
                  </div>

                  <div className="p-6 bg-[#111827] hover:bg-slate-900 border border-slate-800/80 hover:border-yellow-500/30 rounded-2xl transition-all group">
                      <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <i data-lucide="database" className="w-5 h-5"></i>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2 m-0">Baza własnych aparatów</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">Swobodnie importuj pliki wektorowe SVG aparatów zaprojektowanych w zewnętrznych programach graficznych i z łatwością twórz własną bazę unikalnych komponentów.</p>
                  </div>
              </div>
          </div>
      </section>

      <section id="artykuly" className="py-20 bg-[#070A12] border-t border-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                  <div className="lg:col-span-6 space-y-6">
                      <span className="text-amber-500 text-xs font-bold tracking-widest font-mono uppercase">KOMPENDIUM WIEDZY</span>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white m-0 min-h-[72px]">
                          {knowledgeBase[activeArticle as keyof typeof knowledgeBase].title}
                      </h2>
                      
                      <div className="min-h-[160px]">
                          {knowledgeBase[activeArticle as keyof typeof knowledgeBase].content}
                      </div>
                  </div>

                  <div className="lg:col-span-6 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 space-y-4">
                      <span className="text-xs font-mono text-gray-400 uppercase tracking-widest block">Baza wiedzy:</span>
                      
                      <div className="space-y-3">
                          {[1, 2].map((id) => (
                              <button 
                                  key={id}
                                  onClick={() => setActiveArticle(id)}
                                  className={`w-full text-left p-4 rounded-xl border transition-all group flex items-start gap-3 ${
                                      activeArticle === id 
                                          ? 'bg-slate-900 border-blue-500/80 ring-1 ring-blue-500/20' 
                                          : 'bg-slate-950/50 border-slate-800/80 hover:border-blue-500/40'
                                  }`}
                              >
                                  <i data-lucide="arrow-right" className={`w-4 h-4 mt-0.5 transition-transform ${activeArticle === id ? 'text-amber-500 translate-x-1' : 'text-blue-500 group-hover:translate-x-1'}`}></i>
                                  <div>
                                      <span className={`text-sm font-bold block ${activeArticle === id ? 'text-white' : 'text-blue-400 group-hover:text-blue-300'}`}>
                                          {knowledgeBase[id as keyof typeof knowledgeBase].title}
                                      </span>
                                      <span className="text-[11px] text-gray-500 block mt-1">
                                          {knowledgeBase[id as keyof typeof knowledgeBase].desc}
                                      </span>
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      </section>

      <section id="faq" className="py-20 bg-[#090D16] border-t border-gray-900">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                  <span className="text-blue-500 text-xs font-bold tracking-widest font-mono uppercase block mb-2">Baza Wiedzy</span>
                  <h2 className="text-3xl font-extrabold text-white m-0">Najczęściej zadawane pytania (FAQ)</h2>
              </div>

              <div className="space-y-4">
                  {[
                    { id: 1, title: "Czy DinBoard wymaga instalacji na komputerze?", desc: "Nie! DinBoard to nowoczesna aplikacja webowa. Działa bezpośrednio w przeglądarce internetowej na komputerach PC, Mac, tabletach, a nawet telefonach. Brak konieczności uciążliwej instalacji i konfiguracji." },
                    { id: 2, title: "W jakim formacie mogę zapisać pliki i dokumentację?", desc: "Dokumentację rzutów szaf oraz listę obwodów możesz pobrać jako pliki PDF (gotowe do wydruku dla klienta). Aplikacja oferuje również eksport zestawienia BOM (materiałów) do pliku CSV oraz bezstratne zrzuty wysokiej jakości szafy i schematów w formacie PNG." },
                    { id: 3, title: "Czy program wspiera bilansowanie obciążeń trójfazowych?", desc: "Tak! Zintegrowany algorytm analizuje moce przypisane do poszczególnych aparatów zabezpieczających i przyporządkowuje obwody jednofazowe do faz L1, L2, L3 tak, aby zminimalizować asymetrię prądową w instalacji odbiorczej." }
                  ].map(faq => (
                    <div key={faq.id} className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden">
                        <button onClick={() => toggleFaq(faq.id)} className="w-full text-left p-5 flex justify-between items-center text-white hover:text-amber-500 transition-colors">
                            <span className="font-bold text-xs sm:text-sm">{faq.title}</span>
                            <i data-lucide="chevron-down" className={`w-4 h-4 text-gray-400 transform transition-transform duration-300 ${faqState[faq.id] ? 'rotate-180' : ''}`}></i>
                        </button>
                        {faqState[faq.id] && (
                            <div className="px-5 pb-5 text-xs text-gray-400 leading-relaxed border-t border-slate-800/50 pt-3">
                                {faq.desc}
                            </div>
                        )}
                    </div>
                  ))}
              </div>
          </div>
      </section>

      <footer className="bg-[#05080E] border-t border-gray-900 py-12 text-gray-500 text-[11px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded flex items-center justify-center overflow-hidden grayscale opacity-70">
                      <img src="/favicon-192.png" alt="DinBoard Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                      <span className="text-sm font-bold text-white block">DinBoard</span>
                      <span className="block text-[10px] text-gray-600">Narzędzie dla nowoczesnych elektryków.</span>
                  </div>
              </div>
              
              <div className="flex gap-6">
                  <a href="#" className="hover:text-amber-500 transition-colors">Polityka Prywatności</a>
                  <a href="#" className="hover:text-amber-500 transition-colors">Warunki korzystania</a>
                  <a onClick={onOpenFeedback} className="hover:text-amber-500 transition-colors cursor-pointer">Zgłoś błąd / Kontakt</a>
              </div>
              
              <span className="text-gray-600">© 2026 DinBoard.pl. Wszelkie prawa zastrzeżone.</span>
          </div>
      </footer>

      {/* Floating Action Button */}
      <button 
          onClick={onOpenNewProject}
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[90] px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-[0_8px_30px_rgba(59,130,246,0.25)] flex items-center gap-2 transition-all duration-500 transform ${showFab ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-24 opacity-0 scale-90 pointer-events-none'}`}
      >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <i data-lucide="plus" className="w-3.5 h-3.5 text-white"></i>
          </div>
          <span className="text-xs">Nowy projekt</span>
      </button>
    </div>
  );
}
