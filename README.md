# Sweet Little House

Prima ricostruzione web del Subalterno 4 dalla planimetria fornita. Modello geometrico in metri, tre camere, due bagni, zona giorno, disimpegno, locale tecnico e terrazza. Garage escluso.

## Avvio locale

Servire `dist` con un server HTTP statico, per esempio `python -m http.server 4173 --bind 127.0.0.1 --directory dist`, poi aprire http://127.0.0.1:4173. Non aprire index.html direttamente con file://, perché usa moduli JavaScript.

Non serve una compilazione. Three.js 0.180.0 e OrbitControls sono inclusi in `dist/vendor`, con relativa licenza. Google Fonts è facoltativo; in assenza di rete intervengono i font di sistema.

## Pubblicazione

Il sito è pubblicato su GitHub Pages all'indirizzo https://danielepassabi.github.io/sweet-little-house/. Il workflow `Deploy GitHub Pages` valida JavaScript e geometria, quindi pubblica automaticamente il contenuto di `dist` a ogni push sul branch `master`. Può anche essere avviato manualmente dalla sezione Actions della repository.

## Comandi

- Panoramica: trascinare per ruotare, rotella/pinch per avvicinarsi, tasto destro per spostare il centro.
- Pianta: vista dall’alto, rotella per zoom. Selezione ambiente dalla lista.
- Visita: clic su Entra nella casa, WASD/frecce per camminare (1,5 m/s), Shift per correre (3 m/s), Spazio per un salto breve, mouse per guardarsi intorno, Esc per mettere in pausa. Su dispositivi touch: frecce a schermo, Salta, Corri tenuto premuto e trascinamento. Altezza occhi iniziale: 1,75 m. Alla perdita del focus la visita va in pausa; Entra nella casa la riattiva. Se il blocco del mouse non è disponibile, si può trascinare nella scena.
- Righello: selezionare due punti del pavimento in panoramica o pianta.

## Riferimenti e approssimazioni

- Pianta `data/planimetria.pdf`, stato attuale confermato dall’utente.
- Altezza interna 2,60 m indicata dall’utente.
- Quote orizzontali ricostruite mediante tracciamento della pianta rasterizzata, calibrata a circa 86 unità grafiche per metro. La geometria segue le quote ma conserva piccoli errori di tracciamento: non è un rilievo esecutivo o una garanzia di precisione al centimetro.
- Spessori delle pareti semplificati. Altezze di porte e finestre, davanzali e larghezze non quotate stimate.
- Porte interne rappresentate come passaggi aperti con cornice; portoncino chiuso. Portafinestra sulla terrazza aperta per metà.
- Gres chiaro opaco nella zona giorno e gres grigio caldo leggermente più scuro nei due bagni; formato iniziale **60 × 60 cm stimato**, selezionabile. Camere e disimpegno della zona notte hanno parquet in rovere naturale a doghe sfalsate. Le finiture sono texture procedurali in scala metrica, non singoli solidi.
- Prato esterno procedurale con variazioni di tono, microfilamenti e rilievo leggero, circondato da alberelli appoggiati al terreno e visibile in panoramica, pianta e dalle aperture durante la visita. Cielo azzurro, nuvole volumetriche e una corona di montagne lontane completano le viste esterne.
- Primo arredo della zona giorno: divano angolare a tre moduli da 2,25 m, con chaise compatta da 1,30 m, in tessuto grigio scuro; televisore da circa 80 pollici e mobile basso nero disposti secondo lo schizzo fornito. Il locale tecnico ospita caldaia, contatore, lavabo e colonna lavatrice-asciugatrice addossati alla parete di fondo. In terrazza trovano posto un tavolino quadrato con due sedie e un divanetto a tutta parete con righe bianche e lilla. Gli ingombri sono inclusi nelle collisioni della modalità Visita.
- Terrazza con parapetto e copertura semplificati. Sole direzionale fisso dall’alto a sinistra della pianta, a circa 34° sull’orizzonte; luce illustrativa, non calcolo astronomico del sito.
- Dati originali e fotogrammi non fanno parte del sito distribuito.

`dist/model.js` contiene geometria, ambienti e aperture, separati dalla visualizzazione in `dist/app.js` per affinare le misure e aggiungere arredi in futuro.

## Revisione visiva del 15 settembre 2026

Quote e geometria architettonica in `dist/model.js` e `dist/wall-geometry.js` invariate. Il paesaggio è isolato in `dist/landscape.js`: alberi a chioma larga, slanciata e conifere, ciuffi di prato istanziati (ridotti su touch), montagne irregolari con neve nella stessa superficie e nuvole opache illuminate. Le finiture mantengono le altezze esistenti con un bias di profondità; il righello include il parquet. I livelli dell’interfaccia sono espliciti e le etichette vengono nascoste nelle viste quasi orizzontali.

Verifiche: `node tests/spatial.mjs`, `node tests/wall-joints.mjs`, `node tests/landscape.mjs`.

### Movimento

`dist/movement.js` gestisce accelerazione, direzioni normalizzate, collisioni a piccoli passi e salto con gravità. Il salto mantiene i vincoli orizzontali della visita e limita la quota sotto soffitti e architravi; non permette di scavalcare arredi o parapetti. Cambiare stanza o altezza occhi azzera il salto. Nessuna modifica alle misure architettoniche. La tonalità del gres zona giorno è fissa; il formato delle piastrelle resta selezionabile.

`node tests/movement.mjs` verifica equivalenza WASD/frecce, corsa, velocità diagonale, stabilità a diversi frame rate, arresto, scorrimento sulle pareti, ostacoli sottili, salto, atterraggio, altezza libera e reset.

### Prestazioni

Nelle impostazioni a destra, **Mostra FPS** attiva un piccolo overlay. A scena ferma appare **A riposo**: l’ultimo fotogramma resta visibile e viene ridisegnato solo quando necessario. Durante le interazioni sono mostrati gli FPS effettivamente renderizzati, le draw call, i triangoli e il tempo CPU di invio (non il tempo GPU). Materiali, luci, ombre e qualità visiva restano invariati. Ulteriori verifiche: `node tests/render-state.mjs`.

### Luce solare

Il sole mantiene una direzione fissa nel mondo: sinistra e parte alta della pianta. In Visita il soffitto proietta ombra e i vetri lasciano passare la luce diretta, mentre telai, muri e arredi la interrompono. In Pianta/Panoramica il soffitto e la sua ombra vengono rimossi. La mappa delle ombre si aggiorna solo quando cambia questa visibilità, non durante ogni movimento. Una luce diffusa più contenuta approssima i rimbalzi interni: non è una simulazione fisica completa né un calcolo basato su località, data e ora.

## Arredi, materiali e sole geografico — 16 settembre 2026

- Collisioni: tavoli, sedie e scrivanie separati, vasi/sgabelli circolari e sanitari a profilo ellittico. Distanza dal corpo del visitatore calcolata sui bordi e sugli angoli, con indice spaziale. Incluse caldaia e comodini. Gli arredi restano solidi durante il salto; la doccia e la vasca conservano ingombri cautelativi. Test di raggiungibilità di tutte le nove stanze con arredi presenti.
- Materiali: tre mappe procedurali condivise per trama del tessuto, venature del legno e satinatura dei metalli; vetri meno azzurri e meno opachi. Nessuna geometria o dimensione modificata.
- L’orientamento fornito prevale sui vecchi commenti cardinali del codice: **Nord = +X (destra), Est = +Z (basso), Sud = -X (sinistra), Ovest = -Z (alto)**.
- Il precedente sole fisso è sostituito da data e ora locale di Fiume Veneto, selezionabili da **Luce e orientamento**. Conversione `Europe/Rome` con ora legale/solare automatica. Calcolo offline con [SunCalc 1.9.0](https://github.com/mourner/suncalc/tree/v1.9.0), incluso con licenza BSD a due clausole; unica modifica al pacchetto: esportazione come modulo ES.
- Coordinate indicative del comune: 45,93333 N, 12,73333 E, da [OpenStreetMap](https://wiki.openstreetmap.org/wiki/Fiume_Veneto). La direzione solare è astronomica; luce diffusa, riflessioni, atmosfera e ostacoli esterni restano illustrativi. Nessun indirizzo o dato geografico viene inviato durante l’uso.
- Interruttore per accendere/spegnere il riempimento delle luci interne. Di notte il contributo diretto del sole è nullo. Le ombre vengono aggiornate solo cambiando sole o modalità, mantenendo il riposo a camera ferma.

Nuovi controlli automatici: `node tests/furniture-collisions.mjs` e `node tests/solar.mjs`.


### Cucina a doppio angolo — 20 settembre 2026

Sostituiti cucina, isola con sgabelli e tavolo con tovaglia. Nuove basi cottura e lavaggio profonde 60 cm, ritorno sotto finestra profondo 45 cm e alto 93,5 cm incluso top (davanzale a 100 cm). Nessun pensile sulla parete della finestra; frigorifero e colonna forno/microonde al suo fianco. Lavastoviglie integrata affiancata al lavello. Finiture opache grigio oliva, rovere e top antracite; tavolo tondo da 120 cm con quattro sedie imbottite. Ingombri condivisi tra modello e collisioni in `dist/kitchen-layout.js`; architettura invariata. Passaggio tra basi contrapposte circa 149 cm. Il modello rappresenta mobili chiusi: non simula l'ingombro di ante e cassetti aperti.


### Cucina con penisola — 23 settembre 2026

Layout aggiornato: eliminato il precedente tratto cottura in alto. Lavello e lavastoviglie conservano le posizioni; cottura con forno sottostante sul tratto basso, frigorifero sul muro pieno, basi da 60 cm sotto la finestra destra senza pensili o colonne. Ritorno a penisola largo 60 cm, con piano in rovere, spazio per le gambe e quattro sgabelli. Tavolo tondo spostato in alto a sinistra conservando i collegamenti tra ambienti. Profondità di tutti i moduli pari a 60 cm (lunghezza e larghezza delle ante possono differire). Frontali chiari opachi, rovere e pietra con texture condivise procedurali. Il piano cottura rappresenta un modello con aspirazione integrata; gli impianti non sono simulati.

### Cucina dal disegno del designer — 11 ottobre 2026

Il nuovo disegno sostituisce il layout precedente: piano continuo a U in ceramica chiara, alto 93,5 cm, con induzione a quattro zone sulla penisola sinistra. Sul lato destro si susseguono colonna forno, lavello singolo incassato e lavastoviglie integrata (a destra guardando il lavello, in basso nella pianta). Frigorifero rosa dalle forme arrotondate, ispirato allo stile rétro Smeg, a sinistra della penisola sul muro pieno. Rimossi tutti i pensili e gli sgabelli.

Il tavolo esistente mantiene il piano circolare e il basamento incrociato, passa al rovere naturale e si collega sotto l'estremità della ceramica: diametro **120 cm**, altezza 76 cm e tre sedie imbottite sui lati liberi. Il precedente tavolo separato viene rimosso; il tavolino del soggiorno rimane invariato. Basi e colonne conservano i frontali chiari. Le altre quote degli arredi sono indicative, adattate al disegno e alle pareti esistenti; finestre e architettura non cambiano.

`dist/kitchen-layout.js` condivide ingombri e posizioni con le collisioni; `dist/kitchen.js` costruisce arredi e piano con foro reale per il lavello. Verificati accessi a forno, lavello, lavastoviglie, induzione e frigorifero, sedie distinte e raggiungibilità delle nove stanze. Controlli aggiunti in `node tests/kitchen.mjs`; `node tests/furniture-collisions.mjs` verifica anche i passaggi della nuova disposizione. Con Node 20 usare `--experimental-default-type=module`; il workflow usa Node 22.

### Tondo da colazione, tavolo separato e pensili — 11 ottobre 2026

Chiarita la funzione del cerchio viola: è un disco in rovere da **80 cm**, spesso 4 cm e appoggiato sopra la ceramica all'estremità della penisola, per colazione e appoggio rapido. Non ha un basamento da tavolo. Ripristinato separatamente il tavolo del render precedente nella sua posizione originale: piano tondo in pietra scura da **120 cm**, basamento nero incrociato e quattro sedie imbottite. Il tavolino del soggiorno rimane invariato.

Aggiunti i pensili nelle due aree rosse della seconda immagine: un tratto a due fasce orizzontali sopra lavello e lavastoviglie, e una fascia singola sulla parete del frigorifero. Frontali chiari senza maniglie e struttura in rovere; nessun pensile attraversa la finestra. Quote indicative dei pensili: profondità 34 cm, altezza superiore 220 cm, altezza dei due tratti rispettivamente 70 e 38 cm. Le verifiche controllano la posizione del disco sopra la ceramica, la distanza dall'induzione, il tavolo separato, le finestre libere e la raggiungibilità degli elettrodomestici. I pensili partecipano al controllo dell'altezza libera durante il salto.

### Divano acquistato e raccordo della cucina — 11 ottobre 2026

Sostituito il divano precedente con quello della foto: tessuto avorio, sedute profonde a fasce imbottite, braccioli arrotondati, tre schienali trapuntati e due cuscini tortora. Larghezza **270 cm** e profondità della chaise longue **180 cm**, come confermato dall’utente; profondità del corpo principale **120 cm stimata dalla foto**. La chaise è a destra guardando il divano frontalmente. Sulle sedute si trovano due zucchette peluche, una bianca e una marrone chiaro. Il tavolino del soggiorno è avanzato di 32 cm verso la TV e di 10 cm verso l’alto della pianta per liberare la chaise più profonda.

Eliminato il piccolo blocco a cassetti nell’angolo a destra della lavastoviglie: il raccordo ora ha pannelli continui a tutta altezza e uno zoccolo unico. Il resto della cucina resta invariato.

`dist/sofa-layout.js` condivide quote e ingombri con le collisioni, mentre `dist/sofa.js` costruisce il divano con geometrie arrotondate e parti ripetute istanziate. `node tests/sofa.mjs` verifica le misure del modello, la posizione della chaise, il contatto dei peluche con le sedute, le distanze da muri e tavolino e il costo delle geometrie. Verificati anche il raccordo della cucina e i percorsi attraverso le nove stanze.

### Due cucine a confronto e divano specchiato — 12 ottobre 2026

Il selettore **La cucina → Configurazione** permette di passare tra **Tipo 1** e **Tipo 2** in Panoramica, Pianta e Visita, conservando l’inquadratura. La scelta viene ricordata nel browser; alla prima apertura si presenta il Tipo 1. Geometrie e finiture del Tipo 1 sono identiche alla cucina approvata l’11 ottobre, compresi frigo rosa, forno a colonna, pensili e disco in legno da 80 cm.

Il Tipo 2 segue la nuova piantina: colonna integrata con frigorifero, freezer e dispensa al posto del forno; lavello e lavastoviglie nelle posizioni precedenti; forno basso da 60 cm sotto la finestra; induzione a parete con piastrelle chiare da piano a 60 cm sopra la ceramica. La penisola occupa la zona del precedente frigo esterno, arretra di circa 60 cm e lascia un passaggio interno di 220 cm, rispetto ai 155,5 cm del Tipo 1. All’estremità c’è un appoggio in rovere quadrato da **90 × 90 cm**, spesso 4 cm e con angoli di raggio 10 cm, leggermente sporgente dalla base. Queste nuove quote sono stimate dalla piantina; architettura, tavolo separato e altri arredi restano invariati.

Il divano da 270 × 180 cm è specchiato, con la chaise sul lato vicino alla parete che separa il soggiorno dalla zona notte. Anche cuscini e zucchette seguono la specchiatura.

Le alternative sono definite in `dist/kitchen-variants.js` e mantengono gruppi di rendering separati. Il cambio aggiorna ombre, ingombri e altezza libera; se un mobile della nuova configurazione occupa il punto della visita, il visitatore torna in un punto libero della zona giorno. `node tests/kitchen-variants.mjs` controlla la conservazione esatta della geometria del Tipo 1, la disposizione del Tipo 2, gli angoli arrotondati e i passaggi dopo cambi ripetuti. Verificati nel browser selezione, ritorno al Tipo 1 e ripristino della scelta dopo il ricaricamento.

### LG C1 da 83 pollici e postazione PC — 12 ottobre 2026

La TV conserva il centro precedente, a quota 147 cm, e adotta le dimensioni senza piedistallo della **LG OLED83C14LA: 185,1 × 106,2 × 5,53 cm**, dalla [scheda ufficiale LG](https://www.lg.com/uk/tvs/oled-tv/oled83c14la/). Gli 83 pollici indicano la diagonale, non la larghezza. Il modello distingue il pannello OLED sottile dal corpo posteriore inferiore.

Sul mobile nero esistente sono appoggiati il PC della foto e due controller nello stile DualSense, uno bianco e uno grigio con simboli colorati. Il tower è ricostruito con telaio nero, vetro laterale rivolto al divano, scheda madre e video, ventole, raffreddamento a liquido e illuminazione blu. Ingombro illustrativo stimato: 44 cm lungo il mobile, 23 cm in profondità e 46 cm di altezza; controller di circa 16 × 11 cm. Il PC resta sotto il bordo dello schermo.

Una canaletta color parete da circa 4 cm sale dal mobile fino al centro della TV. Il cavo video collega il retro del PC alla TV attraverso la canaletta; i cavi di alimentazione passano dietro il mobile e quello della TV risale nella stessa canaletta. Le geometrie sono in `dist/media-station.js`, con misure e ingombri condivisi in `dist/media-layout.js`. `node tests/media-station.mjs` verifica le dimensioni LG, il centro invariato, l’appoggio e l’ingombro dei dispositivi, il percorso dei cavi e la distanza dalle pareti. La postazione è presente in entrambe le configurazioni della cucina.


### PS4 Pro verticale e Steam Deck con dock — 13 ottobre 2026

Aggiunta una PS4 Pro nera in verticale fra il PC e i due controller, su un supporto basso. Il telaio riprende i tre strati della console, con ingombro verticale di **5,5 × 29,5 × 32,7 cm** dalle [specifiche PlayStation](https://www.playstation.com/en-au/ps4/tech-specs/); il piedistallo è illustrativo. Sulla destra, Steam Deck inclinata nella dock, con schermo, due stick, trackpad e pulsanti. Scocca da **29,8 × 11,7 × 4,9 cm**, da [Valve](https://cdn.steamstatic.com/steamdeck/images/press/techspecs/steamdeck_techspecs.pdf), e dock da **11,7 × 2,9 × 5,05 cm**, dalle [specifiche ufficiali](https://www.steamdeck.com/en/tech/dock).

Il cavo USB-C della dock raggiunge la presa superiore della Steam Deck. PS4 e dock hanno ciascuna un collegamento HDMI che entra nella canalina centrale e risale dietro la TV; le alimentazioni si uniscono al fascio inferiore dietro il mobile. Mobile, TV, PC, controller e architettura conservano posizione e ingombri. Nessuna luce aggiuntiva; piccoli dettagli ripetuti istanziati e geometrie statiche. I controlli in `tests/media-station.mjs` coprono appoggi, ordine dei dispositivi, ingombri, schermo libero, continuità delle connessioni e contenimento dei nuovi cavi nella canalina.

Il mobile TV condivide ora lo stesso materiale in rovere dei pensili della cucina (colore, venature e finitura), su struttura, piano e frontali. Piedini neri e dimensioni originali conservati.


### Video sulla TV — 14 ottobre 2026

La TV del soggiorno riproduce in loop [LG OLED · The Black](https://www.youtube.com/watch?v=njX2bu-_Vw4), tramite il player ufficiale YouTube. Parte senza audio; nella sezione **La TV** si può spegnere il video, attivare l’audio o avviare manualmente la riproduzione se il browser blocca l’autoplay. In caso di errore compaiono Riprova e il collegamento a YouTube. Serve una connessione Internet e il consenso del browser alla riproduzione incorporata.

Il player viene proiettato sullo schermo con la stessa prospettiva della scena. Una maschera WebGL con controllo della profondità consente a pareti e arredi di coprirlo correttamente. Un fondo nero elimina i bordi chiari dovuti alle differenze di rasterizzazione tra iframe e canvas; l’antialiasing resta attivo. Dimensioni della TV e architettura invariate. La riproduzione prosegue anche in Pianta, fuori inquadratura e quando la scheda è nascosta: l’audio si interrompe solo spegnendo la TV o per eventuali restrizioni del browser. I fotogrammi del video non richiedono di ridisegnare continuamente tutta la scena 3D.

`node tests/television-video.mjs` verifica la proiezione prospettica e ortografica, il loop, l’avvio silenzioso, i comandi audio, continuità fuori inquadratura, gestione degli errori e rilascio delle risorse. Anche questi controlli vengono eseguiti prima della pubblicazione su GitHub Pages.


### Plafoniere e revisione della luce interna — 14 ottobre 2026

La planimetria architettonica SUB. 4, esecutivo aprile 2025, non identifica con certezza punti luce interni a soffitto né contiene una legenda elettrica. Le posizioni adottate sono quindi **indicative**, da confermare con il progetto dell’impianto: due plafoniere in zona giorno (salotto e cucina), due nel disimpegno e una per ciascuna camera, bagno e locale tecnico. La terrazza conserva l’assetto esistente.

Plafoniere quadrate sottili, con cornice opaca e diffusore rivolto verso il basso, poste sotto il soffitto originale di **2,60 m**. La sezione **Luci interne** offre un interruttore generale e le opzioni **Calda · 3000 K** e **Bianca · 4000 K** per le plafoniere. Lo spegnimento comprende anche le applique della camera e gli aloni dei due specchi; queste luci decorative conservano le tonalità originali. I colori delle temperature e le intensità sono approssimazioni per la visualizzazione, non una verifica illuminotecnica o delle prestazioni di prodotti reali.

Sostituite le luci omnidirezionali prive di ombre con dieci sorgenti a fascio ampio rivolte in basso, con ombre che rispettano pareti e arredi. Le due sorgenti delle applique sono dirette all’interno della camera, a breve raggio. Le plafoniere condividono due geometrie istanziate; le mappe delle ombre interne sono da 1024 × 1024 pixel e sfruttano il sistema esistente di aggiornamento su modifica, senza ricalcolo continuo a camera ferma.

Il soffitto usa una geometria chiusa con normale inferiore rivolta nella stanza; lo spessore tecnico di 8 cm, aggiunto sopra il piano originale, serve a rendere stabile l’occlusione delle ombre. La faccia interna resta a 2,60 m e non cambia la pianta, le pareti o lo spazio abitabile. Ridotto il bias delle ombre solari che contribuiva alle infiltrazioni luminose lungo il bordo superiore dei muri.

`node tests/interior-lighting.mjs` controlla collocazione nei locali, orientamento verso il basso, ombre, budget delle mappe, interruttore e temperatura, altezza interna e normale del soffitto. Verifica visiva nel browser di notte e di giorno, con luci accese/spente e nelle due tonalità.

#### Ottimizzazioni delle luci interne

Le ombre delle plafoniere vengono memorizzate separatamente da quelle solari: cambi di ora, vista, accensione o temperatura non ne richiedono la ricostruzione. Vengono aggiornate al cambio della cucina e al ripristino del contesto grafico. Il filtro delle ombre interne usa nove letture di profondità pesate invece delle sedici del filtro precedente; quello del sole resta invariato. I materiali evitano inoltre i calcoli delle sorgenti che non illuminano la superficie. La preparazione iniziale dei materiali usa la compilazione asincrona disponibile nel browser, senza ripeterla per la seconda camera.

Questi interventi conservano tutte le sorgenti, gli arredi e le dimensioni della casa. Il filtro più leggero può cambiare leggermente la morbidezza delle ombre interne. I test coprono la cache, il suo aggiornamento, l'espansione dei cicli degli shader e la conservazione del filtro solare. Verificati nel browser avvio senza errori grafici, Pianta e Visita, giorno/notte, le due temperature, spegnimento e cambio cucina. Durante una rotazione in Panoramica il pannello ha mostrato 75 FPS e 4,8 ms di invio CPU; a vista ferma non vengono ridisegnati fotogrammi. Rilevazione locale, non un benchmark comparativo o una garanzia su altri dispositivi.

#### Rifinitura delle ombre in Visita — 14 ottobre 2026

Il filtro a quattro campioni e le mappe da 512 pixel mostravano gradini evidenti sulle ombre di porte e mobili osservate da vicino. Le mappe interne sono ora da 1024 pixel per lato e il filtro usa una griglia 3 × 3 con pesi continui: bordi più regolari durante gli spostamenti, senza rumore casuale. Il costo del filtro sale da quattro a nove letture per ombra, restando sotto le sedici del filtro standard; la risoluzione maggiore aumenta la memoria e il lavoro alla ricostruzione delle mappe, che rimangono memorizzate durante la visita. Numero di luci, geometria, risoluzione della vista e filtro solare invariati.

Verificate in Visita le ombre della porta, della pianta e del tavolino, con entrambe le temperature; nessun errore grafico. Le brevi rotazioni automatizzate alternano movimento e riposo e non forniscono un confronto FPS affidabile: non viene dichiarata una percentuale di miglioramento o perdita.

### Cucina Tipo 3 e tavolo da sei posti — 15 ottobre 2026

Terza configurazione ricostruita dai due schizzi: colonna frigorifero integrata da 60 cm, lavabo e lavastoviglie nella posizione esistente, raccordo sotto la finestra profondo **40 cm** e penisola proposta da **180 × 120 cm**. Il passaggio tra la penisola e il fronte lavaggio è di **108,5 cm**. Induzione sulla penisola e forno incassato sul lato interno; sul lato verso il tavolo, piano breakfast in rovere da **150 × 50 cm**, con angoli arrotondati, sbalzo da 30 cm e due sgabelli imbottiti parzialmente inseriti sotto il piano. Le misure non indicate nello schizzo sono una proposta, non quote rilevate.

Solo il Tipo 3 sostituisce il tavolo nero da 120 cm con la versione tonda da **150 cm**, misura confermata dall’utente, con sei sedie dello stesso modello. Materiale del piano e basamento incrociato restano nello stile precedente. I Tipi 1 e 2 conservano il tavolo da 120 cm con quattro sedie. Tavolo e sedie vengono disegnati in sei gruppi istanziati, anche nella versione da sei posti; al cambio cucina vengono aggiornati visibilità, collisioni, passaggi, ombre e scelta memorizzata. Pareti, aperture, dimensioni della casa e altri arredi non sono modificati.

I test verificano l’integrità del Tipo 1, tutte e tre le configurazioni, la profondità del raccordo, il lavello aperto nel piano, la separazione fra breakfast e induzione, i sei posti, il budget di gruppi del tavolo e la raggiungibilità di stanze ed elettrodomestici dopo cambi ripetuti. La verifica visiva del Tipo 3 resta da completare nell’anteprima locale.
