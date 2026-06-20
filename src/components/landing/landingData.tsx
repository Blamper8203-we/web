
export const SLIDER_IMAGES = [
  "/assets/WKRÓTCE.png",
  "/assets/desktop-app.png",
  "/assets/image2.png",
  "/assets/image3.png",
  "/assets/image4.png",
];

export const knowledgeBase = {
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
    ),
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
    ),
  },
};

export const faqData = [
  {
    id: 1,
    title: "Czy DinBoard wymaga instalacji na komputerze?",
    desc: "Nie! DinBoard to nowoczesna aplikacja webowa. Działa bezpośrednio w przeglądarce internetowej na komputerach PC, Mac, tabletach, a nawet telefonach. Brak konieczności uciążliwej instalacji i konfiguracji.",
  },
  {
    id: 2,
    title: "W jakim formacie mogę zapisać pliki i dokumentację?",
    desc: "Dokumentację rzutów szaf oraz listę obwodów możesz pobrać jako pliki PDF (gotowe do wydruku dla klienta). Aplikacja oferuje również eksport zestawienia BOM (materiałów) do pliku CSV oraz bezstratne zrzuty wysokiej jakości szafy i schematów w formacie PNG.",
  },
  {
    id: 3,
    title: "Czy program wspiera bilansowanie obciążeń trójfazowych?",
    desc: "Tak! Zintegrowany algorytm analizuje moce przypisane do poszczególnych aparatów zabezpieczających i przyporządkowuje obwody jednofazowe do faz L1, L2, L3 tak, aby zminimalizować asymetrię prądową w instalacji odbiorczej.",
  },
];
