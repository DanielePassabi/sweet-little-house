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
- Visita: clic su Entra nella casa, WASD/frecce per camminare, mouse per guardarsi intorno, Esc per liberare il puntatore. Su dispositivi touch, frecce a schermo e trascinamento.
- Righello: selezionare due punti del pavimento in panoramica o pianta.

## Riferimenti e approssimazioni

- Pianta `data/planimetria.pdf`, stato attuale confermato dall’utente.
- Altezza interna 2,60 m indicata dall’utente.
- Quote orizzontali ricostruite mediante tracciamento della pianta rasterizzata, calibrata a circa 86 unità grafiche per metro. La geometria segue le quote ma conserva piccoli errori di tracciamento: non è un rilievo esecutivo o una garanzia di precisione al centimetro.
- Spessori delle pareti semplificati. Altezze di porte e finestre, davanzali e larghezze non quotate stimate.
- Porte interne rappresentate come passaggi aperti con cornice; portoncino chiuso. Portafinestra sulla terrazza aperta per metà.
- Gres chiaro opaco nella zona giorno, tono approssimato dalla foto; formato iniziale **60 × 60 cm stimato**, selezionabile. Camere, disimpegno e bagni della zona notte hanno parquet in rovere naturale a doghe sfalsate. Le finiture sono texture procedurali in scala metrica, non singoli solidi.
- Prato esterno procedurale con variazioni di tono, microfilamenti e rilievo leggero, circondato da alberelli e visibile in panoramica, pianta e dalle aperture durante la visita. Cielo azzurro e nuvole volumetriche completano le viste esterne.
- Terrazza con parapetto e copertura semplificati. Luce illustrativa, non simulazione solare del sito.
- Dati originali e fotogrammi non fanno parte del sito distribuito.

`dist/model.js` contiene geometria, ambienti e aperture, separati dalla visualizzazione in `dist/app.js` per affinare le misure e aggiungere arredi in futuro.
