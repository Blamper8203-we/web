export interface BlogArticle {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  tags: string[];
}

export const blogArticles: BlogArticle[] = [
  {
    slug: "jak-prawidlowo-rozplanowac-fazy-w-rozdzielnicy",
    title: "Jak prawidłowo rozplanować fazy w rozdzielnicy mieszkaniowej?",
    excerpt: "Równomierne obciążenie faz to podstawa stabilnej instalacji. Dowiedz się, jak zapobiegać przeciążeniom i asymetrii w nowoczesnych domach.",
    date: "2026-06-10",
    author: "Artur Tomaszewski",
    tags: ["Projektowanie", "Podstawy", "Bilans mocy"],
    content: `
Zaprojektowanie prawidłowego rozdziału energii na poszczególne fazy (L1, L2, L3) w rozdzielnicy mieszkaniowej jest jednym z najważniejszych zadań elektryka. Nieodpowiednie zbalansowanie faz może prowadzić do częstych wyłączeń zabezpieczenia głównego, spadków napięć, a nawet uszkodzeń odbiorników wrażliwych.

## Czym jest asymetria fazowa?
Asymetria fazowa występuje, gdy jedna z faz jest obciążona znacznie bardziej niż pozostałe. Przykładowo, jeśli podłączymy piekarnik, pralkę i zmywarkę pod fazę L1, a oświetlenie LED pod L2 i L3, w momencie jednoczesnego uruchomienia tych sprzętów prąd na L1 może przekroczyć wartość znamionową zabezpieczenia przedlicznikowego, co skutkuje awarią zasilania w całym domu.

## Zasady dobrego planowania
1. **Identyfikacja największych odbiorników**: W pierwszej kolejności należy spisać wszystkie urządzenia o mocy powyżej 2 kW (płyta indukcyjna, piekarnik, pralka, suszarka bębnowa, pompa ciepła, bojler).
2. **Podział odbiorników 1-fazowych**: Jeśli mamy trzy urządzenia 1-fazowe dużej mocy (np. piekarnik, pralka, zmywarka), należy rozdzielić je tak, by każde pracowało na innej fazie.
3. **Płyty indukcyjne (odbiorniki 2/3-fazowe)**: Nowoczesne płyty indukcyjne zazwyczaj zasilane są z dwóch faz (np. L1 i L2). Oznacza to, że faza L3 zostaje w pełni wolna i to na niej najlepiej umieścić inne prądożerne urządzenia jednofazowe (np. piekarnik podblatowy, jeśli nie jest zintegrowany z płytą).
4. **Obwody gniazd ogólnych**: Rozdziel je równomiernie. Gniazda kuchenne (mikrofala, czajnik) potrafią pobierać sporo prądu w impulsach.
5. **Oświetlenie**: Jest najmniej problematyczne z punktu widzenia obciążenia, ale z punktu widzenia użyteczności - warto, aby oświetlenie w jednym pomieszczeniu (lub przyległych) nie było zasilane z tej samej fazy co pobliskie gniazda. W razie zwarcia i zrzutu zabezpieczeń na danej fazie, nie zostajemy w całkowitych ciemnościach.

## Narzędzia wspierające
W DINBoard Web wbudowaliśmy funkcję automatycznego zliczania bilansu faz. Dzięki przypisaniu przybliżonej mocy i fazy do konkretnego obwodu w module obwodów, system od razu poinformuje Cię o ewentualnym niedociążeniu lub przeciążeniu jednej z faz, pozwalając na szybką korektę projektu jeszcze przed przystąpieniem do sznurowania szafy.
    `
  },
  {
    slug: "schemat-jednokreskowy-jak-czytac",
    title: "Co to jest schemat jednokreskowy i jak go czytać?",
    excerpt: "Schemat ideowy to uniwersalny język każdego instalatora. Zobacz, z jakich elementów się składa i jak bezbłędnie interpretować dokumentację techniczną.",
    date: "2026-06-12",
    author: "Artur Tomaszewski",
    tags: ["Dokumentacja", "Schematy", "Poradnik"],
    content: `
Schemat jednokreskowy (ideowy) to znormalizowany rysunek techniczny, który przedstawia układ instalacji elektrycznej w uproszczonej formie. "Jednokreskowy" oznacza, że wiązka przewodów (np. faza, neutralny i ochronny) jest reprezentowana za pomocą jednej grubej linii, co znacznie zwiększa czytelność rysunku w przypadku skomplikowanych rozdzielnic.

## Kluczowe elementy schematu jednokreskowego

1. **Szyny zbiorcze**: Przedstawiane jako poziome lub pionowe grube linie, z których odchodzą poszczególne obwody.
2. **Zabezpieczenia główne**: Wyłączniki izolacyjne (rozłączniki), aparatura zabezpieczająca przedlicznikowa.
3. **Zabezpieczenia przeciwprzepięciowe (SPD)**: Charakterystyczny symbol z symbolem uziemienia, podłączony równolegle do głównych szyn zasilających.
4. **Wyłączniki różnicowoprądowe (RCD)**: Oznaczane przeważnie owalem połączonym z linią prostą. Chronią określone grupy obwodów.
5. **Wyłączniki nadprądowe (MCB)**: Oznaczane jako prostokąty z ukośną linią i charakterystycznym zaokrągleniem, odpowiedzialne za ochronę obwodów przed zwarciem i przeciążeniem.
6. **Oznaczenia parametrów**: Każdy aparat ma wypisane kluczowe parametry: prąd znamionowy (np. 16A), charakterystykę (np. B, C), prąd różnicowy (np. 30mA dla RCD).

## Jak czytać schemat krok po kroku?
Zasada jest prosta: **od góry do dołu** (lub od zasilania do odbioru).
1. Zlokalizuj punkt zasilania (Złącze Kablowe, Licznik).
2. Prześledź drogę prądu do Rozłącznika Izolacyjnego Głównego (FR).
3. Sprawdź, gdzie podłączone są Ograniczniki Przepięć.
4. Zobacz podział zasilania na poszczególne Wyłączniki Różnicowoprądowe (RCD). Zwróć uwagę, które wyłączniki nadprądowe "podlegają" pod dany RCD.
5. Na samym dole schematu (lub na końcach linii odchodzących) znajdziesz nazwy obwodów (np. "Gniazda Kuchnia", "Oświetlenie Salon") oraz przekroje kabli (np. YDYp 3x2.5).

Wykorzystując aplikację DINBoard Web, proces tworzenia takiego schematu jest w pełni zautomatyzowany. Wystarczy skonfigurować listę obwodów, a system sam wyrysuje schemat jednokreskowy zgodnie z polskimi normami.
    `
  },
  {
    slug: "najczestsze-bledy-montaz-szaf",
    title: "Najczęstsze błędy przy montażu szaf elektrycznych",
    excerpt: "Poznaj pułapki, w które wpadają nawet doświadczeni instalatorzy, i dowiedz się, jak ich unikać, zachowując najwyższe standardy bezpieczeństwa.",
    date: "2026-06-15",
    author: "Artur Tomaszewski",
    tags: ["Praktyka", "Błędy", "Montaż"],
    content: `
Montaż rozdzielnicy to proces wymagający precyzji, wiedzy i przestrzegania norm. Mimo to, regularnie spotyka się w terenie instalacje wykonane z kardynalnymi błędami. Zebraliśmy te pojawiające się najczęściej.

## 1. Zbyt wiele obwodów na jednym wyłączniku RCD
Normy (m.in. PN-HD 60364) oraz dobra praktyka inżynierska wskazują, aby nie podłączać wszystkich obwodów w domu do jednego, trójfazowego wyłącznika różnicowoprądowego. W przypadku uszkodzenia jednego urządzenia (np. zalana grzałka w bojlerze), RCD wyrzuca całe zasilanie w domu. Ponadto, trójfazowy RCD w obwodach jednofazowych stwarza ryzyko utraty zera, co może doprowadzić do spalenia sprzętów elektronicznych (pojawienie się napięcia 400V w gniazdkach).

## 2. Zły dobór przekrojów przewodów drutujących ("sznurowania")
Szyny łączeniowe i przewody wewnątrz rozdzielnicy muszą być dobrane pod kątem **zabezpieczenia poprzedzającego** (zazwyczaj zabezpieczenia przedlicznikowego), a nie prądu znamionowego aparatu. Użycie przewodu LgY 4 mm² do mostkowania pomiędzy RCD a blikiem przy zabezpieczeniu głównym 40A to proszenie się o pożar. Absolutnym minimum w nowoczesnych domach jest LgY 10 mm².

## 3. Brak odpowiednich tulejek i zarabiania końcówek
Przewody linkowe (LgY) wymagają **bezwzględnego** zarobienia tulejkami zaciskowymi przy użyciu odpowiedniej praski. Umieszczanie "gołej" linki w zacisku aparatu modułowego powoduje ucinanie części drutów, słaby styk, iskrzenie i ostatecznie - stopienie izolacji i aparatu.

## 4. Ograniczniki przepięć zbyt daleko od wejścia
Zgodnie ze sztuką, ograniczniki przepięć (SPD) powinny znajdować się jak najbliżej miejsca wejścia kabla zasilającego do rozdzielnicy. Ponadto, długość przewodów łączących SPD z główną szyną wyrównawczą (PE) nie powinna przekraczać 0.5 metra. Robienie pętli i zwojów drutu drastycznie zwiększa indukcyjność, przez co ogranicznik nie zadziała prawidłowo przy uderzeniu pioruna.

## 5. Zbyt mała rozdzielnica (brak rezerwy miejsca)
Normy wyraźnie mówią o pozostawieniu minimum 20-30% wolnego miejsca w rozdzielnicy na przyszłe rozbudowy (fotowoltaika, pompa ciepła, ładowarka EV). "Upchanie" aparatury na siłę powoduje problemy z odprowadzaniem ciepła, a co za tym idzie - przedwczesne zadziałania wyłączników nadprądowych w upalne dni.
    `
  },
  {
    slug: "oznaczenia-aparatury-przewodnik",
    title: "Oznaczenia aparatury w rozdzielnicach – przewodnik",
    excerpt: "Co oznacza Q1, F2, F3.1? Kompletny poradnik dotyczący literowych i numerycznych oznaczeń referencyjnych aparatury elektrycznej.",
    date: "2026-06-18",
    author: "Artur Tomaszewski",
    tags: ["Teoria", "Dokumentacja", "Normy"],
    content: `
Poprawne i jednoznaczne opisywanie aparatury na schematach i bezpośrednio w rozdzielnicy to podstawa szybkiej diagnostyki w przypadku awarii. Stosowanie międzynarodowej normy ISO/IEC ułatwia współpracę miedzy projektantami a instalatorami.

## Najpopularniejsze kody literowe:
*   **Q** - Łączniki i rozłączniki w torach głównych prądowych (np. Rozłącznik izolacyjny to zazwyczaj **Q1** lub **QG**).
*   **F** - Urządzenia zabezpieczające. W tej grupie znajdują się wyłączniki nadprądowe (MCB), wyłączniki różnicowoprądowe (RCD), a także bezpieczniki topikowe. (np. **F1**, **F2**).
*   **T** - Transformatory, zasilacze (np. dzwonkowe, LED).
*   **K** - Przekaźniki i styczniki (np. stycznik do załączania ogrzewania, przekaźniki bistabilne).
*   **X** - Zaciski, złącza, bloki rozdzielcze, listwy zaciskowe (np. **X1**, **XPE**, **XN**).

## Systemy numeracji
Istnieje kilka szkół numerycznego oznaczania aparatów.

1. **Numeracja ciągła**: Kolejne aparaty to F1, F2, F3, F4... Najprostsza, ale nie pokazuje hierarchii.
2. **Numeracja zagnieżdżona (hierarchiczna)**: Bardzo popularna w przypadku wyłączników RCD. 
   - RCD otrzymuje oznaczenie np. **F1**. 
   - Wyłączniki nadprądowe "podpięte" pod ten RCD otrzymują oznaczenia **F1.1**, **F1.2**, **F1.3**. 
   - Dzięki temu elektryk patrząc na schemat od razu wie, że obwód F1.3 jest chroniony przez wyłącznik różnicowoprądowy F1.

W DINBoard Web zaimplementowaliśmy inteligentny system autogeneracji oznaczeń, który automatycznie stosuje odpowiednie prefixy i pozwala na włączenie numeracji hierarchicznej jednym kliknięciem, gwarantując pełną spójność między dokumentacją a stanem faktycznym.
    `
  },
  {
    slug: "mcb-vs-rcd-roznice",
    title: "Różnice między wyłącznikiem nadprądowym (MCB) a różnicowoprądowym (RCD)",
    excerpt: "Podstawowa wiedza dla każdego adepta sztuki elektrycznej. Czym się różnią i przed czym chronią najważniejsze zabezpieczenia w naszych domach?",
    date: "2026-06-21",
    author: "Artur Tomaszewski",
    tags: ["Podstawy", "Aparatura"],
    content: `
Często spotykamy się z niezrozumieniem podstawowych funkcji dwóch najważniejszych aparatów w każdej rozdzielnicy. Choć z zewnątrz wyglądają podobnie (plastikowe moduły z hebelkiem), ich zadania są zupełnie inne.

## Wyłącznik nadprądowy (MCB - Miniature Circuit Breaker)
Często nazywany potocznie "eską". 
**Przed czym chroni?** Głównie przed zjawiskiem zwarcia i przeciążenia. Chroni instalację elektryczną (przewody) przed stopieniem się izolacji i pożarem.
**Jak działa?** Posiada dwa wyzwalacze:
- Bimetalowy (termiczny) - działa wolniej, reaguje na długotrwały przepływ prądu większego niż znamionowy (np. podłączenie zbyt wielu grzejników pod jedno gniazdo).
- Elektromagnetyczny - działa natychmiastowo w ułamku sekundy, reaguje na ogromny prąd zwarciowy (np. zetknięcie przewodu fazowego z neutralnym).

## Wyłącznik różnicowoprądowy (RCD - Residual Current Device)
Nazywany potocznie "różnicówką".
**Przed czym chroni?** Głównie przed porażeniem prądem elektrycznym ludzi i zwierząt.
**Jak działa?** Wyłącznik ten na bieżąco porównuje prąd "wpływający" do obwodu przewodem fazowym z prądem "wypływającym" przewodem neutralnym. Zgodnie z prawami fizyki, wartości te powinny być identyczne. Jeśli nastąpi uszkodzenie izolacji i część prądu "ucieknie" np. przez obudowę pralki do uziemienia (lub przez ciało człowieka!), RCD wykryje tę różnicę (tzw. prąd upływu). 
Standardowe wyłączniki mieszkaniowe mają prąd różnicowy 30mA (0.03A). Jeśli uciekający prąd przekroczy tę wartość, aparat odłączy zasilanie w czasie rzędu kilkudziesięciu milisekund, ratując nam życie.

## Połączenie obu funkcji - RCBO
Coraz częściej stosowane są aparaty typu RCBO (często potocznie nazywane "kombi"). To połączenie wyłącznika RCD i MCB w jednej obudowie (zazwyczaj o szerokości 1 modułu dla układów jednofazowych). Są idealne tam, gdzie brakuje miejsca w rozdzielnicy i pozwalają na wysoce selektywną ochronę. Zastosowanie RCBO rozwiązuje problem rozłączania wielu obwodów przy awarii jednego urządzenia.
    `
  },
  {
    slug: "dobor-przekrojow-przewodow",
    title: "Dobór przekrojów przewodów do zabezpieczeń",
    excerpt: "Jaki kabel do gniazdek, a jaki do oświetlenia? Tabela doboru przekrojów i kluczowe zasady bezpiecznej instalacji.",
    date: "2026-06-23",
    author: "Artur Tomaszewski",
    tags: ["Praktyka", "Kable", "Projektowanie"],
    content: `
Kluczową zasadą każdej instalacji elektrycznej jest to, że **zabezpieczenie nadprądowe (MCB) dobieramy zawsze do obciążalności długotrwałej przewodu**. Bezpiecznik ma zadziałać zanim kabel nagrzeje się do niebezpiecznej temperatury. Odwrotne myślenie ("dopasuję bezpiecznik do urządzenia") często prowadzi do sytuacji, w której zbyt mocny bezpiecznik pozwala na przepływ prądu topiącego kable w ścianie.

## Podstawowe standardy w domach jednorodzinnych:

1. **Oświetlenie**
   - Typowy przewód: YDYp 3x1.5 mm²
   - Standardowe zabezpieczenie: **B10A** (lub B6A)
   - Wyjaśnienie: Przewód 1.5mm2 wytrzymuje więcej niż 10A, jednak B10A jest optymalne ze względu na prądy rozruchowe nowoczesnych zasilaczy LED, jednocześnie bardzo dobrze chroniąc włączniki światła (które często mają obciążalność właśnie 10A).

2. **Gniazda ogólnego przeznaczenia (1-fazowe)**
   - Typowy przewód: YDYp 3x2.5 mm²
   - Standardowe zabezpieczenie: **B16A**
   - Wyjaśnienie: Gniazda standardowo projektowane są na 16A (ok. 3680W). Przewód 2.5mm2 ułożony w tynku bez problemu bezpiecznie przewodzi taki prąd ciągły.

3. **Płyta indukcyjna (trójfazowa / dwufazowa)**
   - Typowy przewód: YDYp 5x2.5 mm² (dla standardowych płyt ok. 7kW)
   - Zabezpieczenie: **B16A** (wyłącznik 3-polowy)
   - Zwróć uwagę: W niektórych przypadkach (długie odległości, grube ocieplenie) projektant może narzucić przewód 5x4.0 mm², zwłaszcza gdy stosowana jest pełna płyta trójfazowa (co zdarza się bardzo rzadko w warunkach domowych).

## Warunki ułożenia mają znaczenie!
Należy pamiętać, że obciążalność kabla zależy od sposobu jego ułożenia. Kabel ułożony luzem w tynku schłodzi się łatwiej niż kabel zasypany grubą warstwą wełny mineralnej na poddaszu. W miejscach utrudnionego oddawania ciepła należy stosować redukcje dopuszczalnego prądu długotrwałego i w konsekwencji - grubsze kable.
    `
  },
  {
    slug: "zasady-montazu-ogranicznikow-przepiec",
    title: "Zasady montażu ograniczników przepięć (SPD)",
    excerpt: "Gdzie i jak poprawnie instalować Ograniczniki Przepięć. Odstępy, długość linek i rola głównej szyny wyrównawczej.",
    date: "2026-06-25",
    author: "Artur Tomaszewski",
    tags: ["Ochrona", "SPD", "Montaż"],
    content: `
Ogranicznik przepięć (SPD - Surge Protective Device) jest jak pasy bezpieczeństwa w samochodzie. Zazwyczaj "nic nie robi", ale gdy nastąpi wyładowanie atmosferyczne (piorun) lub przepięcie łączeniowe w sieci energetycznej, to on przyjmuje na siebie energię zagrażającą cennemu sprzętowi elektronicznemu w domu.

## Typy SPD:
- **T1 (dawniej klasa B)** - Ochrona przed prądami piorunowymi. Stosowane gdy dom ma instalację odgromową.
- **T2 (dawniej klasa C)** - Ochrona przed przepięciami łączeniowymi i indukowanymi.
W praktyce domowej najczęściej stosuje się bloki zintegrowane **T1+T2**.

## Najważniejsza zasada montażu: Reguła 0.5 metra
Całkowita długość przewodów przyłączeniowych SPD (od przewodu fazowego przez SPD do szyny wyrównawczej PE) **nie może przekraczać 0.5 m**. Dlaczego?
Podczas wyładowania piorunowego prąd narasta niezwykle stromo. Taki szybkozmienny prąd powoduje powstawanie znacznego spadku napięcia na samej indukcyjności przewodu (ok. 1kV na każdy metr przewodu). Jeśli przewód odprowadzający będzie miał 1.5 metra, napięcie na chronionych zaciskach znacznie wzrośnie, niszcząc elektronikę pomimo działania ochronnika!

## Pętle i zagięcia
Przewody do SPD należy prowadzić maksymalnie krótko i w linii prostej. Unikaj kątów prostych, zagięć o małym promieniu, a absolutnie zakazane jest formowanie rezerw przewodu w formie "pętli".

## V-połączenie (Połączenie typu V)
Jeśli nie masz możliwości utrzymania reżimu 0.5 m ze względu na gabaryty rozdzielnicy, należy zastosować metodę typu V. Przewód fazowy zasilający wchodzi na zacisk SPD, a następnie wychodzi z drugiego zacisku w tym samym module do głównego rozłącznika instalacji. Przepięcie jest "łapane" natychmiast, bez spadków napięć na przewodach bocznikujących.
    `
  },
  {
    slug: "afdd-zabezpieczenie-przeciwpozarowe",
    title: "Zabezpieczenie przeciwpożarowe AFDD – czy warto?",
    excerpt: "Detektory iskrzenia to nowość na rynku zabezpieczeń mieszkaniowych. Czym są, jak działają i czy są obowiązkowe w Polsce?",
    date: "2026-06-28",
    author: "Artur Tomaszewski",
    tags: ["Nowości", "Bezpieczeństwo", "AFDD"],
    content: `
AFDD (Arc Fault Detection Device), czyli urządzenia do detekcji iskrzenia, to nowoczesne zabezpieczenia, które wypełniają lukę w systemach ochrony. Standardowe wyłączniki nadprądowe (MCB) nie potrafią wykryć prądu iskrzenia o wartościach nominalnych dla danego obwodu (np. iskrzenie uszkodzonego przedłużacza pobierającego 5A przy zabezpieczeniu B16). Takie iskrzenie potrafi wygenerować temperaturę powyżej 6000°C, co jest częstą przyczyną pożarów instalacji elektrycznych.

## Jak działa AFDD?
Urządzenie bez przerwy analizuje cyfrową charakterystykę (szum o wysokiej częstotliwości) przepływającego prądu. Posiada wbudowany mikroprocesor, który odróżnia normalne iskrzenie (np. szczotki w wiertarce lub silniku odkurzacza) od iskrzenia niebezpiecznego (np. naderwany przewód, poluzowany styk w puszce, przebity gwoździem kabel). Gdy wykryje to drugie, natychmiast odcina zasilanie.

## Czy są obowiązkowe?
W wielu krajach zachodnich (np. w Niemczech) stosowanie AFDD w nowych instalacjach w sypialniach i pokojach dziecięcych jest obowiązkowe. W Polsce norma PN-HD 60364-4-42 w obecnym brzmieniu **zaleca** ich stosowanie, w szczególności w:
- Sypialniach i miejscach przeznaczonych do spania.
- Budynkach drewnianych (o podwyższonym ryzyku pożarowym).
- Szkołach, szpitalach, domach opieki.

## Wady i wyzwania
Główną barierą w powszechnym stosowaniu AFDD jest ich wysoka cena (od kilkuset do ponad tysiąca złotych za moduł chroniący jeden obwód) oraz zajmowane miejsce w rozdzielnicy. Ponadto, wczesne generacje tych urządzeń potrafiły czasem błędnie reagować na stary sprzęt elektroniczny, choć współczesne układy są dużo doskonalsze.
    `
  },
  {
    slug: "rozdzielnica-smart-home",
    title: "Nowoczesna rozdzielnica w systemie Smart Home",
    excerpt: "Inteligentny dom zaczyna się od serca – odpowiednio zaprojektowanej rozdzielnicy. Co musisz wiedzieć, by być gotowym na smart home?",
    date: "2026-06-30",
    author: "Artur Tomaszewski",
    tags: ["Smart Home", "Automatyka", "Trendy"],
    content: `
Rozdzielnice elektryczne ewoluowały. Zamiast prostych skrzynek z bezpiecznikami, nowoczesne szafy centralne (w domach z systemem przewodowym Smart Home, np. KNX, Loxone) to skomplikowane węzły logiczne. Projektując taką instalację, należy przestrzegać kilku fundamentalnych zasad.

## Topologia "w gwiazdę"
W tradycyjnej instalacji przewody układane są od puszki do puszki. W instalacji smart home najczęściej stosuje się topologię gwiazdy: każdy obwód oświetleniowy, wybrane gniazda i rolety prowadzone są bezpośrednio z tablicy rozdzielczej. Wymaga to użycia wielokrotnie większej ilości kabli, jednak pozwala na pełne sterowanie systemem z jednego miejsca (np. ze styczników lub modułów przekaźnikowych).

## Rozmiar ma znaczenie (gigantyczne szafy)
Standardowa szafa 4x24 (96 modułów) w domu inteligentnym najczęściej okaże się ułamkiem potrzeb. Systemy smart home wymagają:
- Wielu zasilaczy DC (często 24V).
- Wielokanałowych aktorów roletowych i świetlnych (często zajmujących 8-12 modułów każdy).
- Ogromnych ilości złączek rzędowych (listew zaciskowych), by uporządkować zbiegające się setki kabli.
- Odpowiedniego odstępu między aparatami do odprowadzania ciepła.
W domach o powierzchni 150m2, nierzadko stosuje się wolnostojące szafy rzędu 2x144 modułów.

## Podział sekcji (Separacja napięć)
Bardzo ważne jest zachowanie fizycznego podziału przestrzeni w rozdzielnicy na część zasilaną napięciem sieciowym 230/400V (AC) oraz część niskonapięciową 24V (DC) i magistralną. Wymagają tego normy bezpieczeństwa, co chroni system przez indukowaniem się napięć niszczących delikatne układy mikroprocesorowe.

W aplikacji DINBoard możesz swobodnie modelować ogromne szafy, używać własnych modułów SVG reprezentujących urządzenia KNX czy sterowniki PLC, precyzyjnie kalkulując przy tym miejsce na listwy zaciskowe piętrowe.
    `
  },
  {
    slug: "dokumentacja-odbiorcza-instalacji",
    title: "Co musi zawierać poprawna dokumentacja odbiorcza instalacji?",
    excerpt: "Oddajesz projekt inwestorowi? Upewnij się, że masz wszystko. Zobacz z czego składa się profesjonalna dokumentacja powykonawcza.",
    date: "2026-07-02",
    author: "Artur Tomaszewski",
    tags: ["Dokumentacja", "Prawo", "Standardy"],
    content: `
Samo zamontowanie gniazdek, ułożenie kabli i złożenie rozdzielnicy to tylko część pracy instalatora. Prawidłowe zakończenie inwestycji i przeniesienie odpowiedzialności za bezpieczeństwo wymaga przekazania inwestorowi kompletnej dokumentacji technicznej i odbiorczej.

## Składniki kompletnej dokumentacji:

1. **Schemat jednokreskowy rozdzielnicy** (powykonawczy) - Musi odzwierciedlać stan faktyczny, a nie tylko pierwotny projekt architekta. Zmiany (dodatkowe gniazdka, inna trasa obwodów) muszą zostać na nim naniesione. Zawiera oznaczenia, wartości i charakterystyki aparatury.
2. **Deklaracje Zgodności CE wbudowanych materiałów** - Przynajmniej karta dołączona do głównej obudowy rozdzielnicy poświadczająca jej parametry po zmontowaniu (wg normy PN-EN 61439-3 dla rozdzielnic DBO).
3. **Pomiary Elektryczne (Protokół odbiorczy)**
   - Pomiar rezystancji izolacji (wszystkie obwody miedzy fazami, N i PE, wykonane przed podłączeniem elektroniki!).
   - Pomiary impedancji pętli zwarcia (skuteczność samoczynnego wyłączenia zasilania - SWZ).
   - Testowanie wyłączników RCD (czas i prąd zadziałania wyłączników różnicowoprądowych).
   - Pomiar ciągłości połączeń ochronnych i wyrównawczych.
4. **Zestawienie materiałowe (BOM - Bill of Materials)** - Choć opcjonalne prawnie, to stanowi dobrą praktykę. 
5. **Rysunki rzutów budowlanych** - Plany pięter z naniesionymi orientacyjnymi trasami kabli i położeniem puszek odgałęźnych (kluczowe przy późniejszych remontach, wierceniach otworów w ścianach).

## A co jeśli dokumentacji brak?
Zgodnie z Prawem Budowlanym inwestor bez protokołu odbiorczego pomiarów elektrycznych nie powinien uzyskać zgody nadzoru na użytkowanie budynku. Brak takiej zgody to również furtka dla firm ubezpieczeniowych, aby odmówić wypłaty odszkodowania w razie pożaru posesji.
    `
  }
];
