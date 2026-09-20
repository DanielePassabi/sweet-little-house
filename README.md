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
