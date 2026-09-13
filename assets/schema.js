/* =========================================================
   Zeszyt Marki — schemat modułów
   Odwzorowuje 02-WORKFLOW.md i 03-SZABLONY.md.
   Odnośniki [A s.30] itd. zachowane w ściągach prowadzącego.
   ========================================================= */

/* --- pomocnicze do kryteriów ukończenia --- */
const has = (d, k) => typeof d[k] === 'string' && d[k].trim().length > 2;
const hasAny = (d, k) => {
  const v = d[k];
  if (Array.isArray(v)) return v.filter(x => String(x || '').trim()).length > 0;
  return has(d, k);
};
const listLen = (d, k) => Array.isArray(d[k]) ? d[k].filter(x => String(x || '').trim()).length : 0;
const pairsLen = (d, k) => Array.isArray(d[k]) ? d[k].filter(r => String(r?.[0] || '').trim() && String(r?.[1] || '').trim()).length : 0;
const hasNumber = (d, k) => /\d/.test(String(d[k] || ''));

const probs = d => Array.isArray(d.problemy) ? d.problemy : [];
const probsKept = d => probs(d).filter(p => String(p.text || '').trim() && !p.cut);
const probsRepeat = d => probsKept(d).filter(p => p.repeat);
const probsCost = d => probsKept(d).filter(p => String(p.cost || '').trim());

const legendsFull = d => {
  const L = Array.isArray(d.legendy) ? d.legendy : [];
  return L.filter(l => l && has(l, 'kontekst') && has(l, 'problem') && has(l, 'wglad') &&
    has(l, 'podejscie') && has(l, 'rezultat') && has(l, 'lekcja'));
};
const legendsWithInsight = d => (Array.isArray(d.legendy) ? d.legendy : []).filter(l => l && has(l, 'wglad'));

const angleCount = d => {
  const I = d.idee || {};
  let n = 0;
  Object.values(I).forEach(o => {
    n += String(o?.katy || '').split('\n').filter(s => s.trim().length > 2).length;
  });
  return n;
};
const ideasComplete = d => {
  const I = d.idee || {};
  return probsKept(d).filter(p => {
    const o = I[p.id];
    return o && has(o, 'rozwiazanie') && has(o, 'idea');
  }).length;
};

/* --- schemat --- */
const SCHEMA = [

/* ═══════════════════════════ 0 ═══════════════════════════ */
{
  id: 'm0',
  num: '0',
  title: 'Start',
  step: 'Krok 1.1 — Wywiad wstępny',
  time: '90–120 min',
  lede: 'Surowy materiał, zanim cokolwiek zinterpretujemy. To jest rozmowa, nie formularz — połowa odpowiedzi rodzi się dopiero po dopytaniu. Zapisuj sformułowania klienta dosłownie; wracają w module 4 i 8.',
  sections: [
    {
      title: 'Dane',
      fields: [
        { k: 'klient', t: 'text', q: 'Klient', ph: 'Imię i nazwisko' },
        { k: 'data_start', t: 'text', q: 'Data rozpoczęcia', ph: 'RRRR-MM-DD' },
        { k: 'prowadzi', t: 'text', q: 'Kto prowadzi proces', ph: 'Imię osoby z zespołu' },
        { k: 'branza', t: 'text', q: 'Branża', ph: 'trener personalny / fizjoterapia / studio / inne' }
      ]
    },
    {
      title: 'Biznes',
      note: 'Liczby są tu obowiązkowe, nawet jeśli wydają się nie na temat — bez nich moduł 1 i cała bramka rebrandingowa nie mają podstawy.',
      fields: [
        { k: 'b_oferta', t: 'textarea', q: 'Co dokładnie sprzedajesz?', sub: 'Wszystkie pakiety i formy współpracy.', rows: 3 },
        { k: 'b_ceny', t: 'textarea', q: 'Ile kosztuje każdy?', rows: 2 },
        { k: 'b_klienci', t: 'textarea', q: 'Ilu masz dziś aktywnych klientów? Ilu stacjonarnie, ilu online?', rows: 2 },
        {
          k: 'b_skad', t: 'textarea', q: 'Skąd przyszedł każdy z ostatnich pięciu klientów?',
          sub: 'Polecenie / social / siłownia / inne — po kolei, nie zbiorczo.', rows: 3,
          hint: 'Kryterium ukończenia całego wywiadu: wiesz, skąd klient ma klientów i ilu. Jeśli odpowiedź brzmi „z polecenia", zapisz to jako fakt, nie jako domysł.'
        },
        { k: 'b_z_tresci', t: 'textarea', q: 'Ilu z nich przyszło dlatego, że zobaczyło twoje treści?', rows: 2 },
        { k: 'b_zapytania', t: 'textarea', q: 'Ile zapytań dostajesz miesięcznie? Ile z nich kończy się sprzedażą?', rows: 2 },
        { k: 'b_sufit', t: 'textarea', q: 'Ilu klientów byłbyś w stanie obsłużyć, gdyby jutro przyszli?', rows: 2 },
        { k: 'b_cisza', t: 'textarea', q: 'Co się dzieje, gdy przez miesiąc nic nie publikujesz?', rows: 2 }
      ]
    },
    {
      title: 'Klienci',
      note: 'To jest najcenniejsza część wywiadu. Notuj cytatami.',
      fields: [
        { k: 'k_najlepszy', t: 'textarea', q: 'Opisz ostatniego klienta, z którym praca była najlepsza.', sub: 'Kto to, w jakiej sytuacji przyszedł.', rows: 3 },
        { k: 'k_zly', t: 'textarea', q: 'Opisz klienta, z którym nie powinieneś był zaczynać. Dlaczego?', rows: 3 },
        {
          k: 'k_z_czym', t: 'textarea', q: 'Z czym ludzie do ciebie przychodzą — ich słowami, nie twoimi?', rows: 4,
          hint: 'Tu leży surowiec pod moduł 4. Nie tłumacz na język branżowy w trakcie zapisywania.'
        },
        { k: 'k_obiekcje', t: 'textarea', q: 'O co pytają, zanim się zdecydują? Jakie mają obiekcje?', rows: 3 },
        { k: 'k_strach', t: 'textarea', q: 'Czego się boją? Co już próbowali i nie zadziałało?', rows: 3 },
        { k: 'k_po_trzech', t: 'textarea', q: 'Co mówią po trzech miesiącach współpracy, czego nie mówili na początku?', rows: 3 }
      ]
    },
    {
      title: 'Metoda',
      note: 'Tu leży materiał na różnicowanie i tezy kontrariańskie z modułu 5.',
      fields: [
        { k: 'm_inaczej', t: 'textarea', q: 'Co robisz inaczej niż inni w twoim mieście?', rows: 3 },
        {
          k: 'm_wkurza', t: 'textarea', q: 'Co cię wkurza w tym, jak pracuje większość ludzi w twojej branży?', rows: 4,
          hint: 'Najważniejsze pytanie w tej sekcji. Drąż aż do konkretów — „robią to źle" nie wystarczy, potrzebujesz czterech nazwanych rzeczy.'
        },
        { k: 'm_opor', t: 'textarea', q: 'Z jakim swoim przekonaniem spotykasz się z oporem u klientów?', rows: 3 },
        { k: 'm_nie_robie', t: 'textarea', q: 'Czego NIE robisz, choć wszyscy robią?', rows: 3 }
      ]
    },
    {
      title: 'Treść i czas',
      fields: [
        { k: 't_dzis', t: 'textarea', q: 'Co publikujesz dziś i od jak dawna?', rows: 2 },
        { k: 't_zapytanie', t: 'textarea', q: 'Która treść przyniosła ci realne zapytanie? Pamiętasz którąkolwiek?', rows: 2 },
        {
          k: 't_godziny', t: 'textarea', q: 'Ile godzin tygodniowo realnie masz na treść?', sub: 'Nie ile chciałbyś mieć.', rows: 2,
          hint: 'Policz z grafiku treningów, nie z entuzjazmu na spotkaniu. Ta liczba wraca w module 6 jako podstawa kadencji.'
        },
        { k: 't_okno', t: 'textarea', q: 'Kiedy w tygodniu masz okno bez klientów?', rows: 2 },
        { k: 't_meczy', t: 'textarea', q: 'Co w robieniu treści męczy cię najbardziej?', rows: 2 },
        { k: 't_lubi', t: 'textarea', q: 'Co robisz z przyjemnością?', rows: 2 }
      ]
    },
    {
      title: 'Człowiek',
      note: 'Warstwa ludzka. Wraca w module 5 jako interest stacking.',
      fields: [
        { k: 'c_poza', t: 'textarea', q: 'Co robisz poza pracą?', rows: 3 },
        { k: 'c_znajomi', t: 'textarea', q: 'Co powiedziałbyś o sobie na spotkaniu ze znajomymi, czego nie powiedziałbyś na koncie?', rows: 3 },
        { k: 'c_tabu', t: 'textarea', q: 'O czym nie chcesz mówić publicznie?', rows: 2 }
      ]
    }
  ],
  crit: [
    { label: 'Klient i data uzupełnione', test: d => has(d, 'klient') && has(d, 'data_start') },
    { label: 'Wiadomo, skąd przyszło ostatnich pięciu klientów', test: d => has(d, 'b_skad') },
    { label: 'Zapisane realne godziny na treść', test: d => has(d, 't_godziny') },
    { label: 'Są cztery nazwane rzeczy, które klienta wkurzają w branży', test: d => has(d, 'm_wkurza') },
    { label: 'Problemy klientów zapisane ich słowami', test: d => has(d, 'k_z_czym') }
  ]
},

/* ═══════════════════════════ 1 ═══════════════════════════ */
{
  id: 'm1',
  num: '1',
  title: 'Karta Kierunku',
  step: 'Krok 1.2 — Brand Journey ◆',
  time: '60–90 min',
  lede: 'Cztery pytania zadane wstecz: od celu do dziś. Ustalamy, co marka ma osiągnąć dla biznesu — i sprawdzamy, czy w ogóle jest właściwym narzędziem.',
  sections: [
    {
      title: 'Cztery pytania',
      small: 'A s.3-4',
      fields: [
        {
          k: 'kier_rezultat', t: 'textarea', rows: 3,
          q: '1. Jaki jest twój pożądany rezultat?',
          sub: 'Co marka ma osiągnąć dla ciebie lub twojego biznesu? Liczba albo stan, nie hasło.',
          hint: 'Nie przyjmuj „chcę więcej zasięgów". Zasięg nie jest rezultatem, tylko środkiem — dopytaj, po co mu ten zasięg. „Chcę być rozpoznawalny" też nie przechodzi.',
          ex: 'Pełny grafik stacjonarny (18 klientów) i 8 klientów online w abonamencie. Dziś: 11 stacjonarnych, 2 online. Perspektywa: 12 miesięcy.'
        },
        {
          k: 'kier_kojarzony', t: 'textarea', rows: 3,
          q: '2. Z czym musisz być kojarzony, żeby to się wydarzyło?',
          ex: 'Trener dla facetów po czterdziestce, którzy chcą odzyskać sprawność, a nie wyrzeźbić brzuch. Ktoś, kto tłumaczy dlaczego, a nie tylko liczy serie.'
        },
        {
          k: 'kier_robic', t: 'textarea', rows: 3,
          q: '3. Co musisz robić, żeby być z tym kojarzonym?',
          ex: 'Regularnie pokazywać rozbiory realnych przypadków; zabierać głos przeciwko planom pod sylwetkę u 45-latków; nagrywać z klientami, nie solo.'
        },
        {
          k: 'kier_nauczyc', t: 'textarea', rows: 3,
          q: '4. Czego musisz się nauczyć teraz, żeby to było możliwe?',
          ex: 'Mówić do kamery bez czytania; opowiadać przypadek klienta tak, żeby nie łamać jego prywatności.'
        }
      ]
    },
    {
      title: 'Punkt decyzyjny',
      fields: [
        {
          k: 'kier_decyzja', t: 'gate',
          q: 'Czy marka osobista jest właściwym środkiem do rezultatu z pytania 1?',
          note: 'Framework wprost dopuszcza odpowiedź „nie". Jeśli klient chce w trzy miesiące zapełnić grafik w jednej dzielnicy, treść organiczna jest wolniejsza niż reklama lokalna i współpraca z siłownią. Świadoma rezygnacja teraz jest tańsza dla obu stron niż rozstanie po kwartale.',
          options: [
            { v: 'tak', label: 'Tak — idziemy dalej' },
            { v: 'nie', label: 'Nie — właściwym środkiem jest co innego' }
          ]
        },
        { k: 'kier_alt', t: 'textarea', rows: 2, q: 'Jeśli nie — właściwy środek to:', showIf: { k: 'kier_decyzja', v: ['nie'] } },
        { k: 'kier_uzasadnienie', t: 'textarea', rows: 2, q: 'Uzasadnienie decyzji', sub: 'Jedno–dwa zdania. Wracasz do tego przy każdej niejasnej decyzji w dalszych modułach.' }
      ]
    }
  ],
  gateKey: 'kier_decyzja',
  gateBlockValues: ['nie'],
  gateBlockMsg: 'Decyzja brzmi „nie". Dalsze moduły nie mają sensu, dopóki nie wrócicie do pytania 1.',
  crit: [
    { label: 'Odpowiedź na pytanie 1 zawiera liczbę albo opisany stan, nie hasło', test: d => hasNumber(d, 'kier_rezultat') },
    { label: 'Wszystkie cztery pytania wypełnione', test: d => ['kier_rezultat', 'kier_kojarzony', 'kier_robic', 'kier_nauczyc'].every(k => has(d, k)) },
    { label: 'Punkt decyzyjny rozstrzygnięty', test: d => !!d.kier_decyzja },
    { label: 'Decyzja ma zapisane uzasadnienie', test: d => has(d, 'kier_uzasadnienie') }
  ]
},

/* ═══════════════════════════ 2 ═══════════════════════════ */
{
  id: 'm2',
  num: '2',
  title: 'Audyt i wybór toru',
  step: 'Krok 1.3 ◆ + bramka rebrandingowa',
  time: '60–90 min',
  lede: 'Z czym klient jest dziś kojarzony i czy to zgadza się z Kartą Kierunku. Wynik przesądza, czy idziemy torem od zera, czy przez rebranding.',
  sections: [
    {
      title: 'Audyt konta',
      note: 'Przejrzyj 30–50 ostatnich publikacji. Wypisz, o czym faktycznie są — nie o czym klient myśli, że są.',
      fields: [
        {
          k: 'aud_dzis', t: 'textarea', rows: 4,
          q: 'O czym faktycznie są ostatnie publikacje?',
          hint: 'Nie oceniaj konta po estetyce. Chaotyczna siatka nie oznacza złych skojarzeń, a dopieszczona siatka nie oznacza dobrych.'
        },
        {
          k: 'aud_pytania', t: 'textarea', rows: 3,
          q: 'O co ludzie pytają w komentarzach i wiadomościach?',
          sub: 'To jest najtwardszy dowód na istniejące skojarzenia.'
        },
        {
          k: 'aud_dystans', t: 'choice',
          q: 'Dystans między „dziś kojarzony z" a „chce być kojarzony z"',
          options: [
            { v: 'brak', label: 'Konto puste, martwe albo świeże' },
            { v: 'maly', label: 'Skojarzenia zgodne z kierunkiem — dystans mały' },
            { v: 'duzy', label: 'Skojarzenia rozjeżdżają się z kierunkiem — dystans duży' }
          ]
        }
      ]
    },
    {
      title: 'Bramka rebrandingowa',
      small: 'C s.5-13',
      note: 'Wypełniasz tylko wtedy, gdy dystans jest duży. Ostrzeżenie źródła: większość ludzi sądzących, że potrzebuje rebrandingu, potrzebuje jaśniejszego pozycjonowania. Najdroższy błąd w całym procesie to rebranding tam, gdzie wystarczyłoby odświeżenie.',
      showIf: { k: 'aud_dystans', v: ['duzy'] },
      fields: [
        {
          k: 'reb_trigger', t: 'textarea', rows: 3,
          q: 'Który trigger jest prawdziwy i dlaczego?',
          sub: '1. Zmęczenie własną marką · 2. Zła reputacja · 3. Coś istotnego się zmieniło (ekspertyza albo cel). Wystarczy jeden.',
          hint: 'Jeśli żaden nie jest prawdziwy, NIE robisz rebrandingu — wracasz do modułu 4 i porządkujesz pozycjonowanie.'
        },
        {
          k: 'reb_runway', t: 'textarea', rows: 5,
          q: 'Rebrand Runway — cztery pytania',
          sub: '1. Jaki % przychodu pochodzi z leadów z marki osobistej? · 2. Ile z tego od ludzi, którzy trafili przez konkretny temat? · 3. Gdybyś jutro przestał o nim publikować, jak długo biznes funkcjonuje? · 4. Jakie masz inne kanały pozyskania?',
          hint: 'Uwaga przy małym kliencie: niska zależność bywa skutkiem tego, że marka jeszcze nic nie generuje, a nie tego, że biznes jest od niej niezależny. To nie jest ta sama sytuacja. Nazwij to wprost, zamiast wpisywać klienta w ścieżkę 1.'
        },
        {
          k: 'reb_zaleznosc', t: 'choice',
          q: 'Zależność przychodu od marki osobistej',
          options: [
            { v: 'wysoka', label: 'Wysoka' },
            { v: 'srednia', label: 'Średnia' },
            { v: 'niska', label: 'Niska' },
            { v: 'zero', label: 'Zerowy lead flow — nie ma czego chronić ani przenosić' }
          ]
        },
        {
          k: 'reb_sciezka', t: 'choice',
          q: 'Wybrana ścieżka',
          note: 'Jeśli pasuje ścieżka 3, bierz ją. Mniejsze ryzyko, więcej korzyści, zachowujesz wszystko, co zbudowane. Ścieżka 1 wymaga rezerwy na 6–18 miesięcy — mały lokalny biznes zwykle się do niej nie kwalifikuje.',
          options: [
            { v: 's1', label: 'Ścieżka 1 — pełny rebranding, otwarcie' },
            { v: 's2', label: 'Ścieżka 2 — etapowy, nowa marka budowana równolegle' },
            { v: 's3', label: 'Ścieżka 3 — tylko odświeżenie, bez porzucania skojarzeń' }
          ]
        },
        { k: 'reb_uzasadnienie', t: 'textarea', rows: 2, q: 'Uzasadnienie wyboru ścieżki' }
      ]
    },
    {
      title: 'Punkt decyzyjny — tor',
      fields: [
        {
          k: 'tor', t: 'gate',
          q: 'Którym torem idziemy?',
          note: 'Przy torze rebrandingowym pamiętaj: bolesne problemy w module 4 dotyczą NOWEGO odbiorcy. Wzięcie problemów starej publiczności zakotwiczy klienta z powrotem w marce, którą próbuje zostawić.',
          options: [
            { v: 'zero', label: 'Tor od zera — moduły 3–8 po kolei' },
            { v: 'zero_bench', label: 'Tor od zera, ale mamy dane historyczne — policzymy medianę' },
            { v: 'reb', label: 'Tor rebrandingowy — moduły 3–8 pod nową przestrzeń' }
          ]
        }
      ]
    }
  ],
  crit: [
    { label: 'Wiadomo, o czym faktycznie są ostatnie publikacje', test: d => has(d, 'aud_dzis') || d.aud_dystans === 'brak' },
    { label: 'Dystans oceniony', test: d => !!d.aud_dystans },
    { label: 'Przy dużym dystansie: trigger i ścieżka rozstrzygnięte', test: d => d.aud_dystans !== 'duzy' || (has(d, 'reb_trigger') && !!d.reb_sciezka) },
    { label: 'Tor wybrany', test: d => !!d.tor }
  ]
},

/* ═══════════════════════════ 3 ═══════════════════════════ */
{
  id: 'm3',
  num: '3',
  title: 'Bank Dowodów',
  step: 'Krok 1.4 / 1.5',
  time: '90–120 min',
  lede: 'Dowód, z którego będzie żyła treść przez najbliższe miesiące. Autorytet powstaje z dowodu, nie z twierdzenia — a blizny liczą się tak samo jak wygrane.',
  sections: [
    {
      title: 'Trzy Legendy',
      small: 'C s.19-22',
      note: 'Sześć kroków na historię. Rezultat nie musi być liczbowy — liczy się też mniej nawracających problemów, mniejsze ryzyko, większa przewidywalność, lepsza retencja.',
      fields: [
        {
          k: 'legendy', t: 'legends',
          hint: 'Typowy błąd u trenera: zdjęcia „przed/po" jako dowód. Pokazują rezultat bez wglądu, więc sugerują, że każdy trener zrobiłby to samo. Pytaj: dlaczego u tego człowieka nic wcześniej nie działało i co zobaczyłeś, czego nie zobaczyli inni.'
        }
      ]
    },
    {
      title: 'Lista skrótowa',
      fields: [
        { k: 'bank_wygrane', t: 'list', q: 'Pozostałe wygrane', sub: 'Jednym zdaniem każda.', ph: 'np. Klient wrócił do biegania po dwóch latach przerwy', min: 3 },
        {
          k: 'bank_porazki', t: 'list', q: 'Porażki z lekcją, która wciąż jest w użyciu', min: 2,
          ph: 'np. Za szybko dołożyłem objętość u klienta po kontuzji — dziś czekam dwa tygodnie dłużej',
          hint: 'Blizny pokazują, że ktoś robił robotę, a nie tylko o niej mówił. Klient będzie chciał je pominąć — nie pozwól.'
        }
      ]
    },
    {
      title: 'Anonimizacja',
      note: 'Domyślnie tak. Nazwy zamieniamy na typ i sytuację, daty na kwartały, liczby na przedziały. Historia zdrowotna klienta to dane wrażliwe — zgoda jest wymagana niezależnie od tego, jak dumny z wyniku jest sam klient.',
      fields: [
        {
          k: 'anon_zasada', t: 'textarea', rows: 3,
          q: 'Jaka jest nasza granica anonimizacji u tego klienta?',
          sub: 'Test: czy powiedziałbyś to jutro w podcaście? Czy ujawnia poufne dane albo tożsamość bez zgody? Czy może komuś zaszkodzić?',
          ex: 'Anonimizujemy tożsamość, zachowujemy sytuację i mechanizm. Żadnego imienia, wieku co do roku ani rozpoznawalnego zdjęcia bez pisemnej zgody.'
        }
      ]
    },
    {
      title: 'Bank Zainteresowań',
      note: 'Wypełniasz TYLKO wtedy, gdy Legendy dały cienki wynik albo klient wchodzi w obszar, w którym faktycznie jest na początku. Trener z portfelem klientów mówiący z pozycji ucznia obniża sobie postrzeganą kompetencję dokładnie w chwili, gdy odbiorca decyduje o wydaniu pieniędzy.',
      fields: [
        { k: 'int_uczy', t: 'textarea', rows: 3, q: 'Czego uczysz się teraz?' },
        { k: 'int_testuje', t: 'textarea', rows: 2, q: 'Co testujesz?' },
        { k: 'int_pytania', t: 'textarea', rows: 3, q: 'Na jakie pytania szukasz odpowiedzi?' }
      ]
    }
  ],
  crit: [
    { label: 'Trzy Legendy mają wypełniony krok „wgląd"', test: d => legendsWithInsight(d).length >= 3 },
    { label: 'Przynajmniej jedna Legenda kompletna we wszystkich sześciu krokach', test: d => legendsFull(d).length >= 1 },
    { label: 'Minimum trzy dodatkowe wygrane', test: d => listLen(d, 'bank_wygrane') >= 3 },
    { label: 'Minimum dwie porażki z lekcją', test: d => listLen(d, 'bank_porazki') >= 2 },
    { label: 'Granica anonimizacji zapisana', test: d => has(d, 'anon_zasada') }
  ]
},

/* ═══════════════════════════ 4 ═══════════════════════════ */
{
  id: 'm4',
  num: '4',
  title: 'Karta Odbiorcy',
  step: 'Krok 2.1 + 2.7',
  time: '2–3 h',
  lede: 'Surowiec pod całą późniejszą treść. Problemy zapisane słowami odbiorcy, nie naszymi — i lista słów, których nie wolno użyć.',
  sections: [
    {
      title: 'Sytuacja',
      fields: [
        {
          k: 'odb_sytuacja', t: 'textarea', rows: 2,
          q: 'Mój idealny klient to ktoś, kto obecnie…',
          sub: 'Ma opisywać sytuację, nie tożsamość.',
          hint: 'Tożsamość: „mężczyzna 45 lat, pracownik biurowy". Sytuacja: „po raz trzeci wraca na siłownię po dłuższej przerwie". Tylko drugie da się zaadresować w hooku.',
          ex: 'Ktoś, kto obecnie po raz trzeci wraca na siłownię po dłuższej przerwie i nie chce, żeby skończyło się jak poprzednio.'
        }
      ]
    },
    {
      title: 'Bolesne problemy',
      small: 'A s.20-23',
      note: 'Minimum 15 pozycji przed filtrem, 10–15 po. Materiał wyłącznie z rozmów sprzedażowych, wiadomości, komentarzy i obiekcji — nie z wyobraźni. Zapisuj w pierwszej osobie, dokładnie tak, jak powiedziałby to klient.',
      fields: [
        {
          k: 'problemy', t: 'problems',
          hint: 'Filtr bólu: wykreśl wszystko łagodne, mgliste, intelektualne i aspiracyjne. Test powtarzalności: zaznacz to, co wraca u różnych osób i na różnych rozmowach — problem z jednej rozmowy to jeszcze nie filar. Dla pięciu najmocniejszych dopisz koszt zaniechania: pieniądze, czas, pewność siebie, relacje, szansa, energia.'
        }
      ]
    },
    {
      title: 'Język odbiorcy',
      small: 'C s.60-61',
      note: 'Pięć pytań, wszystkie o idealnego odbiorcę. Druga lista jest w praktyce ważniejsza od pierwszej — to ona wycina żargon.',
      fields: [
        {
          k: 'jez_uzywa', t: 'list', q: 'Słowa, których używa', min: 5,
          ph: 'np. krzyż, strzyka, posypałem się, wrócić do formy'
        },
        {
          k: 'jez_nie', t: 'list', q: 'Słowa, które rozumie, ale sam ich nie używa — NIE UŻYWAMY', min: 5,
          ph: 'np. mobilność piersiowa, deficyt kaloryczny, GPP',
          hint: 'Ta lista działa dalej jako automatyczna kontrola: w modułach 5, 7 i 8 zeszyt sam podświetli te słowa, jeśli wejdą do tekstu. Im uczciwiej ją wypełnisz, tym mniej roboty później.'
        },
        { k: 'jez_rozpozna', t: 'list', q: 'Nazwiska, marki, narzędzia i miejsca, które rozpozna', min: 3, ph: 'np. Strava, smartwatch, lokalne siłownie sieciowe' },
        {
          k: 'jez_estetyka', t: 'textarea', rows: 2, q: 'Jaka estetyka czyta się u niego jako wiarygodna?',
          sub: 'Czysto i profesjonalnie czy surowo i z terenu?',
          ex: 'Surowo, z siłowni, w koszulce treningowej. Studio i idealne światło czyta się jako „sprzedawca", nie „trener".'
        },
        {
          k: 'jez_scroll', t: 'textarea', rows: 2, q: 'Co konkretnie zatrzyma go w scrollu?',
          sub: 'Jaki strach, jaki cel, jaka frustracja.',
          hint: 'Do tego pytania wracasz przy każdym hooku w module 7 i 8.',
          ex: 'Obraz jego własnego poranka i cudza historia faceta w jego wieku. Nie zatrzymuje go obietnica sylwetki.'
        }
      ]
    }
  ],
  crit: [
    { label: 'Sytuacja opisana, nie tożsamość', test: d => has(d, 'odb_sytuacja') },
    { label: 'Po filtrze zostało 10–15 problemów', test: d => probsKept(d).length >= 10 && probsKept(d).length <= 15 },
    { label: 'Test powtarzalności wykonany na minimum 5 pozycjach', test: d => probsRepeat(d).length >= 5 },
    { label: 'Koszt zaniechania dopisany do pięciu najmocniejszych', test: d => probsCost(d).length >= 5 },
    { label: 'Lista „NIE UŻYWAMY" ma minimum 5 pozycji', test: d => listLen(d, 'jez_nie') >= 5 },
    { label: 'Wiadomo, co zatrzyma odbiorcę w scrollu', test: d => has(d, 'jez_scroll') }
  ]
},

/* ═══════════════════════════ 5 ═══════════════════════════ */
{
  id: 'm5',
  num: '5',
  title: 'Karta Pozycjonowania',
  step: 'Kroki 2.2 – 2.6 ◆',
  time: '4–5 h',
  lede: 'Dokument, który klient akceptuje pisemnie. Nie zaczynamy produkcji przed akceptacją — wszystko, co powstanie wcześniej, trzeba będzie wyrzucić, gdy klient po miesiącu powie, że „to nie do końca on".',
  sections: [
    {
      title: 'Granice tematu',
      small: 'Krok 2.2',
      fields: [
        {
          k: 'poz_dread', t: 'textarea', rows: 2,
          q: 'O jakim jednym temacie, gdybyś musiał mówić publicznie przez trzy lata, zacząłbyś nienawidzić własnej marki?',
          hint: 'Test więzienia. Jeśli go pominiesz, algorytm wybierze temat za klienta i klient się wypali — a wypalony klient wypowiada umowę.'
        },
        {
          k: 'poz_handcuff', t: 'textarea', rows: 2,
          q: 'Czy zdarzył się post, po którym pojawiła się myśl „chyba muszę teraz o tym mówić"?',
          sub: 'Jeśli tak — czy chcesz być z tym kojarzony za dwa lata? Bez odpowiedzi pośrednich.'
        },
        {
          k: 'poz_rdzen', t: 'list', q: 'Temat rdzeniowy', min: 1, max: 3,
          sub: 'Trzy kryteria naraz: realne doświadczenie, przyjemność z myślenia o nim, gotowość mówienia o nim nawet przy spadku zasięgów.',
          ph: 'np. powrót do sprawności po czterdziestce'
        },
        {
          k: 'poz_nie_rusza', t: 'textarea', rows: 2, q: 'Temat, którego NIE ruszamy',
          sub: 'Mimo że wiesz, że dobrze się klika.',
          hint: 'Bez tego pola test nie zadziałał. Klient musi umieć wskazać temat, z którego świadomie rezygnuje.',
          ex: 'Suplementacja i redukcja jako temat sam w sobie — klika, ale nie chcę być z tym kojarzony za dwa lata.'
        },
        {
          k: 'poz_przylegle', t: 'list', q: 'Tematy przyległe', min: 3, max: 5,
          sub: 'Każdy przechodzi trzy filtry: istotny dla odbiorcy, wiążący się z niszą, mówiony z autorytetem lub szczerym zainteresowaniem.',
          ph: 'np. sen i regeneracja'
        },
        {
          k: 'poz_ludzka', t: 'list', q: 'Warstwa ludzka — elementy spoza pracy', min: 5,
          sub: 'Realne, nie wyprodukowane. Dawne zawody, hobby, zainteresowania, przekonania, styl życia, obsesje.',
          ph: 'np. gra w piłkę w lidze amatorskiej w czwartki'
        }
      ]
    },
    {
      title: 'Różnicowanie',
      small: 'Krok 2.3',
      note: 'Cztery rzeczy, które ludzie w branży robią lub mówią, a z którymi klient się nie zgadza — i po prawej ich przeciwieństwo.',
      fields: [
        {
          k: 'poz_roznicowanie', t: 'pairs', rows: 4,
          cols: ['Co robią / mówią inni', 'Moje przeciwieństwo'],
          hint: 'Typowy błąd: ogólniki („jestem za uczciwością"). Pytaj o konkret — co dokładnie robią inni w tym mieście, co go wkurza. Materiał masz już w module 0, pytanie „co cię wkurza".',
          ex: '„Sprzedają 45-latkowi plan pisany dla 25-latka" → „Buduję plan od tego, co facet musi umieć w życiu, nie od podziału na partie"'
        }
      ]
    },
    {
      title: 'Skojarzenia i nienegocjowalne',
      fields: [
        { k: 'poz_za', t: 'list', q: 'Jestem ZA', min: 2, max: 2, ph: 'np. trening jako sprawność na kolejne 30 lat', lint: true },
        { k: 'poz_przeciw', t: 'list', q: 'Jestem PRZECIW', min: 2, max: 2, ph: 'np. straszenie kontuzją jako metoda sprzedaży', lint: true },
        {
          k: 'poz_nienegocjowalne', t: 'list', q: 'Nienegocjowalne', min: 3, max: 5, lint: true,
          sub: 'Rzeczy, które każda treść wzmacnia niezależnie od formatu i platformy.',
          ph: 'np. Każda treść tłumaczy dlaczego, nie tylko co',
          hint: 'Kryterium: ta lista ma nadawać się do wysłania montażyście i grafikowi jako kryterium akceptacji. Jeśli nie nadaje się — jest za ogólna.'
        }
      ]
    },
    {
      title: 'Tezy kontrariańskie i wspólny wróg',
      small: 'Krok 2.4',
      note: 'Teza mówi o twoim przekonaniu — „oto moje zdanie". Wróg to ta sama teza wycelowana w problem odbiorcy — „oto, co stoi między tobą a tym, czego chcesz". Wrogiem jest koncepcja lub praktyka, nigdy osoba ani firma.',
      fields: [
        {
          k: 'poz_tezy', t: 'pairs', rows: 3, lint: true,
          cols: ['Teza kontrariańska', 'Ta sama teza jako wróg'],
          hint: 'Nie wybieraj teraz zwycięzcy — która teza jest właściwa, rozstrzyga się po 3–6 miesiącach testowania. Kryterium na teraz: każda teza da się dokończyć zdaniem „…dlatego większość odbiorców nie dostaje rezultatu". I nie wymyślaj tezy dla kontrowersji: jeśli nie jest jego, nie utrzyma się.',
          ex: '„Po czterdziestce nie potrzebujesz planu na sylwetkę, tylko na sprawność" → „Gonienie za sylwetką jest powodem, dla którego wracasz na siłownię trzeci raz i trzeci raz odpadasz"'
        }
      ]
    },
    {
      title: 'Interest stacking',
      small: 'Krok 2.6',
      note: 'Wybierz trzy elementy warstwy ludzkiej, które klient dotąd ukrywał jako nieprofesjonalne — zwykle to one najbardziej pogłębiają więź. Dla każdego zapisz, jak pojawi się WEWNĄTRZ zwykłej treści, a nie jako jej temat.',
      fields: [
        {
          k: 'poz_stacking', t: 'pairs', rows: 3,
          cols: ['Element', 'Jak pojawia się wewnątrz treści'],
          hint: 'Kryterium ukończenia: żadna pozycja w prawej kolumnie nie brzmi „nagramy o tym rolkę". Dozwolone: tło kadru, ubiór, metafora, przykład, miejsce nagrania, ton, język, którego przestajesz wycinać.',
          ex: '„Dwoje małych dzieci" → „Przykłady obciążeń z życia: wniesienie dziecka po schodach, wózek do bagażnika. Nie wycina hałasu w tle."'
        }
      ]
    },
    {
      title: 'Zdanie pozycjonujące',
      small: 'Krok 2.5 ◆',
      note: 'Nie ma być efektowne ani promocyjne. Ma być takie, żeby ktoś, kto przeczyta tylko je, wiedział, gdzie klient stoi i dla kogo jest.',
      fields: [
        { k: 'zd_odbiorca', t: 'text', q: 'Wierzę, że…', sub: 'odbiorca', ph: 'faceci po czterdziestce', lint: true },
        { k: 'zd_pragnienie', t: 'text', q: '…chcący…', sub: 'pragnienie', ph: 'wrócić do formy', lint: true },
        { k: 'zd_przekonanie', t: 'text', q: '…powinni…', sub: 'moje przekonanie', ph: 'budować sprawność, którą utrzymają sami', lint: true },
        {
          k: 'zd_zamiast', t: 'text', q: '…a nie…', sub: 'powszechna opinia w niszy', ph: 'kupować kolejny plan na sylwetkę', lint: true,
          hint: 'Typowy błąd: zdanie opisujące usługę zamiast przekonania. „Wierzę, że każdy zasługuje na dobry trening" nie jest pozycjonowaniem, bo nikt nie twierdzi inaczej. Jeśli nie da się wskazać, kto się z tezą nie zgadza, jest pusta.'
        },
        { k: 'zd_preview', t: 'preview' },
        {
          k: 'poz_akceptacja', t: 'gate',
          q: 'Czy klient akceptuje Kartę Pozycjonowania?',
          note: 'Kryterium: klient potrafi powiedzieć to zdanie z pamięci, własnymi słowami. Celem jest, żeby z czasem odbiorcy umieli powtórzyć je klientowi.',
          options: [
            { v: 'tak', label: 'Tak — karta zatwierdzona, można produkować' },
            { v: 'poprawki', label: 'Jeszcze nie — wracamy z poprawkami' }
          ]
        },
        { k: 'poz_data_akcept', t: 'text', q: 'Data zatwierdzenia', ph: 'RRRR-MM-DD', showIf: { k: 'poz_akceptacja', v: ['tak'] } }
      ]
    }
  ],
  gateKey: 'poz_akceptacja',
  gateBlockValues: ['poprawki', ''],
  gateBlockMsg: 'Karta nie jest zatwierdzona. Moduły 6–8 to już produkcja — nie otwieraj ich przed akceptacją klienta.',
  crit: [
    { label: 'Temat, którego NIE ruszamy, jest nazwany', test: d => has(d, 'poz_nie_rusza') },
    { label: 'Temat rdzeniowy i 3–5 tematów przyległych', test: d => listLen(d, 'poz_rdzen') >= 1 && listLen(d, 'poz_przylegle') >= 3 },
    { label: 'Minimum 5 elementów warstwy ludzkiej', test: d => listLen(d, 'poz_ludzka') >= 5 },
    { label: 'Cztery wiersze różnicowania', test: d => pairsLen(d, 'poz_roznicowanie') >= 4 },
    { label: 'Po dwa skojarzenia „za" i „przeciw"', test: d => listLen(d, 'poz_za') >= 2 && listLen(d, 'poz_przeciw') >= 2 },
    { label: '3–5 nienegocjowalnych', test: d => listLen(d, 'poz_nienegocjowalne') >= 3 },
    { label: 'Trzy tezy, każda z wersją „wróg"', test: d => pairsLen(d, 'poz_tezy') >= 3 },
    { label: 'Trzy elementy interest stackingu z opisem, jak wchodzą w treść', test: d => pairsLen(d, 'poz_stacking') >= 3 },
    { label: 'Zdanie pozycjonujące kompletne', test: d => ['zd_odbiorca', 'zd_pragnienie', 'zd_przekonanie', 'zd_zamiast'].every(k => has(d, k)) },
    { label: 'Karta zatwierdzona przez klienta', test: d => d.poz_akceptacja === 'tak' }
  ]
},

/* ═══════════════════════════ 6 ═══════════════════════════ */
{
  id: 'm6',
  num: '6',
  title: 'Karta Systemu',
  step: 'Kroki 3.1 – 3.3',
  time: '2 h',
  lede: 'Kadencja, którą klient trafi w stu procentach. Konsekwencja bije intensywność, trwałość bije optymalizację. Jeśli plan wymaga dyscypliny, jest za agresywny.',
  sections: [
    {
      title: 'Fundament trwałości',
      small: 'Krok 3.1',
      fields: [
        {
          k: 'sys_godziny', t: 'text', q: 'Ile godzin tygodniowo klient realnie da na treść przez 12–18 miesięcy?',
          sub: 'Bez wliczania spokojniejszych tygodni, przyszłych pracowników i zrywów motywacji.',
          ph: 'np. 2 h — środa rano', hint: 'Przyjęcie deklaracji „mogę codziennie" to najczęstszy błąd w tym kroku.'
        },
        { k: 'sys_daje', t: 'textarea', rows: 2, q: 'Co w produkcji daje mu energię?' },
        {
          k: 'sys_zabiera', t: 'textarea', rows: 2, q: 'Co ją zabiera?',
          sub: 'Wszystko z tej listy minimalizujemy, wsadzamy w batch, przejmujemy albo usuwamy.',
          hint: 'U trenera to prawie zawsze montaż, opakowanie i publikowanie — czyli dokładnie zakres, który przejmuje agencja. Realny sufit klienta liczymy po naszej stronie procesu, nie po jego. To jest argument sprzedażowy wyprowadzony z metody, nie z cennika.'
        },
        { k: 'sys_publikacje', t: 'text', q: 'Kadencja — liczba publikacji w miesiącu', ph: 'np. 8 (2 tygodniowo)' },
        { k: 'sys_sesje', t: 'text', q: 'Kadencja — liczba sesji nagraniowych w miesiącu', ph: 'np. 1' },
        { k: 'sys_okno', t: 'textarea', rows: 2, q: 'Okno świeżości', sub: 'Kiedy jest najostrzejszy mentalnie i ile sesji realnie obroni w tym oknie.' },
        { k: 'sys_miejsce', t: 'textarea', rows: 2, q: 'Środowisko', sub: 'Miejsce, pora, poziom energii, potrzebny poziom struktury. Jeśli potrzebuje idealnego setupu za każdym razem, stworzy mniej.' }
      ]
    },
    {
      title: 'Medium i platformy',
      small: 'Krok 3.2',
      fields: [
        {
          k: 'sys_medium', t: 'choice', q: 'Medium bazowe',
          note: 'Pytania w kolejności priorytetu: w czym chciałby się pokazywać co tydzień, w czym czuje się najbardziej naturalnie, w czym ma dziś największą umiejętność. Gdy odpowiedzi się różnią, optymalizuj pod to, co lubi. Ale przy rezygnacji z wideo nazwij klientowi koszt wprost: to rezygnacja z zasięgu na Instagramie i TikToku, czyli z dwóch kanałów, na których jego odbiorca faktycznie jest.',
          options: [
            { v: 'wideo', label: 'Wideo' }, { v: 'audio', label: 'Audio' },
            { v: 'tekst', label: 'Tekst' }, { v: 'obraz', label: 'Obraz' }
          ]
        },
        { k: 'sys_glowna', t: 'text', q: 'Platforma główna', sub: 'Dostaje najlepsze myślenie.', ph: 'np. Instagram' },
        { k: 'sys_zapas', t: 'text', q: 'Platforma zapasowa', sub: 'Przyjmuje wyłącznie treść przerobioną.', ph: 'np. TikTok' },
        {
          k: 'sys_oko', t: 'text', q: 'Eye of Sauron — punkt skupienia na najbliższy kwartał', ph: 'np. Instagram',
          hint: 'Kryterium: jest jedna platforma, o której cały zespół wie, że to ona jest teraz „okiem". Przesunięcie oka to decyzja kwartalna, nie reakcja na jeden słaby tydzień.'
        }
      ]
    },
    {
      title: 'Formaty sygnaturowe',
      small: 'Krok 3.3',
      note: 'Dwa formaty powtarzalne plus jeden robiony dla przyjemności, nawet jeśli wypada słabiej. Trzy pytania kontrolne: czy zrobiłby to 50 razy, czy gra to na jego atutach, czy pasuje do wybranego medium.',
      fields: [
        {
          k: 'fmt_1', t: 'text', q: 'Format powtarzalny #1', ph: 'np. jedno ćwiczenie, trzy błędy, które robi 90% ludzi po czterdziestce',
          hint: 'Kryterium: oba formaty powtarzalne dają się nagrać w tej samej sesji, w tym samym ustawieniu. Inaczej kadencja nie wyjdzie.'
        },
        { k: 'fmt_2', t: 'text', q: 'Format powtarzalny #2', ph: 'np. rozbiór maila od klienta' },
        { k: 'fmt_lubiany', t: 'text', q: 'Format robiony dla przyjemności', ph: 'np. kulisy sesji z klientem' }
      ]
    }
  ],
  crit: [
    { label: 'Realne godziny policzone', test: d => has(d, 'sys_godziny') },
    { label: 'Kadencja zapisana liczbą publikacji i sesji, nie przymiotnikiem', test: d => hasNumber(d, 'sys_publikacje') && hasNumber(d, 'sys_sesje') },
    { label: 'Lista „zabiera energię" wypełniona', test: d => has(d, 'sys_zabiera') },
    { label: 'Medium bazowe wybrane', test: d => !!d.sys_medium },
    { label: 'Jedna platforma wskazana jako „oko"', test: d => has(d, 'sys_oko') },
    { label: 'Dwa formaty powtarzalne + jeden lubiany', test: d => has(d, 'fmt_1') && has(d, 'fmt_2') && has(d, 'fmt_lubiany') }
  ]
},

/* ═══════════════════════════ 7 ═══════════════════════════ */
{
  id: 'm7',
  num: '7',
  title: 'Mapa Filarów',
  step: 'Krok 3.4',
  time: '90–120 min',
  lede: 'Zapas tematów, żeby nikt nigdy nie zaczynał od pustej kartki. Problemy przeniosły się tu automatycznie z modułu 4 — dokładasz unikalne rozwiązanie, dowód, Ideę i kąty.',
  sections: [
    {
      title: 'Idee i kąty',
      note: 'Reguła odrzucania: jeśli do problemu nie da się napisać unikalnego rozwiązania, klient sam go nie rozwiązał. Wytnij go i zastąp innym. Kąt zmienia wejście do tematu (historia, błąd, porównanie, pytanie od klienta, liczba, sprzeciw), nie słowa.',
      fields: [
        {
          k: 'idee', t: 'ideas', lint: true,
          hint: 'Cel: minimum 30 kątów — to zapas na kwartał przy kadencji dwóch publikacji tygodniowo. Nie filtruj w trakcie wypisywania, filtruj po. Pięć Idei daje minimum 30 kątów.'
        }
      ]
    }
  ],
  crit: [
    { label: 'Minimum 5 problemów ma unikalne rozwiązanie i Ideę', test: d => ideasComplete(d) >= 5 },
    { label: 'Minimum 30 kątów w zapasie', test: d => angleCount(d) >= 30 }
  ]
},

/* ═══════════════════════════ 8 ═══════════════════════════ */
{
  id: 'm8',
  num: '8',
  title: 'Profil i bio',
  step: 'Krok 3.6',
  time: '45 min',
  lede: 'Profil ma mówić to samo co zdanie pozycjonujące. Jest pierwszym filtrem odbiorcy — język i estetyka wprost z modułu 4.',
  sections: [
    {
      title: 'Profil',
      fields: [
        { k: 'pro_platforma', t: 'text', q: 'Platforma', ph: 'np. Instagram' },
        { k: 'pro_nazwa', t: 'text', q: 'Nazwa', sub: 'Imię i nazwisko + jedno słowo kontekstu.', ph: 'np. Kamil Orłowski | trener', lint: true },
        { k: 'pro_bio1', t: 'text', q: 'Bio, linia 1', sub: 'Dla kogo to konto jest.', lint: true, ph: 'Dla facetów 40+, którzy wracają do formy kolejny raz.' },
        { k: 'pro_bio2', t: 'text', q: 'Bio, linia 2', sub: 'Przekonanie / z czym się nie zgadzasz.', lint: true, ph: 'Sprawność, którą utrzymasz sam. Nie plan na sylwetkę.' },
        {
          k: 'pro_bio3', t: 'text', q: 'Bio, linia 3', sub: 'Dowód — jeden, konkretny.', lint: true, ph: '6 lat, ponad 80 osób, żadnej diety cud.',
          hint: 'Typowy błąd u trenera: bio jako lista certyfikatów. Certyfikat nie jest ani problemem odbiorcy, ani przekonaniem — jest dowodem i jego miejsce jest w treści, nie w pierwszej linijce.'
        },
        { k: 'pro_bio4', t: 'text', q: 'Bio, linia 4', sub: 'Co zrobić dalej.', lint: true, ph: 'Napisz „START" w wiadomości — odpiszę, czy w ogóle jestem ci potrzebny.' },
        { k: 'pro_link', t: 'text', q: 'Link' },
        { k: 'pro_wyroznione', t: 'list', q: 'Wyróżnione relacje', min: 2, max: 4, sub: 'Jedno na etap decyzji odbiorcy.', ph: 'np. Zacznij tu' },
        { k: 'pro_zdjecie', t: 'textarea', rows: 2, q: 'Zdjęcie profilowe', sub: 'Zgodne z estetyką z Karty Odbiorcy.' }
      ]
    },
    {
      title: 'Kontrola',
      note: 'Ktoś spoza zespołu, po przeczytaniu samego bio, ma umieć powiedzieć, dla kogo to konto jest i dla kogo nie jest.',
      fields: [
        { k: 'pro_test', t: 'textarea', rows: 2, q: 'Kto to sprawdził i co powiedział?' }
      ]
    }
  ],
  crit: [
    { label: 'Cztery linie bio wypełnione', test: d => ['pro_bio1', 'pro_bio2', 'pro_bio3', 'pro_bio4'].every(k => has(d, k)) },
    { label: 'Żadna linia bio nie zawiera słowa z listy NIE UŻYWAMY', test: d => true, lintCheck: ['pro_nazwa', 'pro_bio1', 'pro_bio2', 'pro_bio3', 'pro_bio4'] },
    { label: '2–4 wyróżnione relacje', test: d => listLen(d, 'pro_wyroznione') >= 2 },
    { label: 'Bio sprawdzone przez kogoś spoza zespołu', test: d => has(d, 'pro_test') }
  ]
}

];

/* etykiety pomocnicze do eksportu */
const LABELS = {
  medium: { wideo: 'wideo', audio: 'audio', tekst: 'tekst', obraz: 'obraz' },
  tor: { zero: 'od zera', zero_bench: 'od zera (są dane historyczne)', reb: 'rebranding' },
  dystans: { brak: 'konto puste / martwe / świeże', maly: 'skojarzenia zgodne z kierunkiem', duzy: 'skojarzenia rozjeżdżają się z kierunkiem' },
  sciezka: { s1: 'ścieżka 1 — pełny rebranding', s2: 'ścieżka 2 — etapowy, za kulisami', s3: 'ścieżka 3 — odświeżenie' },
  zaleznosc: { wysoka: 'wysoka', srednia: 'średnia', niska: 'niska', zero: 'zerowy lead flow' }
};

const LEGEND_FIELDS = [
  { k: 'kontekst', q: 'Kontekst', sub: 'Kto to był, na jakim etapie, jaka stawka.' },
  { k: 'problem', q: 'Problem pod powierzchnią', sub: 'Nie objaw, tylko przyczyna.' },
  { k: 'wglad', q: 'Wgląd', sub: 'Jakie błędne założenie musiało umrzeć.' },
  { k: 'podejscie', q: 'Podejście', sub: 'Co priorytetyzowałeś, co zignorowałeś, jaki kompromis przyjąłeś.' },
  { k: 'rezultat', q: 'Rezultat', sub: 'Co się zmieniło, skąd wiesz, w jakim czasie. Nie musi być liczbowy.' },
  { k: 'lekcja', q: 'Lekcja transferowalna', sub: 'Co z tego ma wziąć ktoś inny.' }
];
