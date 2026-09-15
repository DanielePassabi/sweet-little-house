# Piano di ottimizzazione del rendering

## Prima passata applicata in locale

- Richiesta del profilo GPU `high-performance` al browser.
- Limite del pixel ratio a 1,75 in Panoramica/Pianta e 1,35 in Visita.
- Shadow map direzionale statica: viene calcolata una volta anziché a ogni frame.
- Precompilazione degli shader per le due telecamere.
- Telemetria leggera disponibile in `window.houseModel.performance` e negli attributi `data-fps`, `data-draw-calls` e `data-triangles` del canvas.
- Alberi, montagne, neve e nuvole renderizzati come istanze: molti oggetti ripetuti vengono inviati alla GPU in pochi batch.
- Geometria cubica condivisa da muri di apertura e arredi, evitando una geometria duplicata per ogni parallelepipedo.
- Dettagli architettonici e arredi opachi raggruppati per materiale in draw call istanziate; i vetri restano separati per mantenere il corretto ordinamento della trasparenza.
- Diagnostica della telecamera campionata una volta al secondo anziché scritta nel DOM a ogni frame.

## Risultati della passata locale

Misure raccolte nella stessa anteprima Chromium dopo il caricamento completo:

| Vista | Draw call prima | Draw call dopo | Riduzione | Triangoli dopo |
| --- | ---: | ---: | ---: | ---: |
| Panoramica | ~200 | 53 | 73,5% | 42.425 |
| Pianta | — | 48 | — | 34.315 |
| Visita | — | 38 | — | 41.811 |

Il contatore FPS dell'ambiente di test non è limitato al refresh del monitor, quindi in questa fase le draw call sono il confronto più affidabile. La scena è stata verificata senza errori console nelle tre viste.

## Nuovi arredi ottimizzati

Piante, sanitari, vasca, doccia, letto e armadio sono stati aggiunti mantenendo le primitive ripetute in batch. Vasi, fusti, foglie, limoni, corpi ovali e rubinetteria condividono geometrie istanziate; gli elementi cubici confluiscono nel batching per materiale già esistente. I nuovi asset portano Panoramica da 53 a 70 draw call e Visita a circa 32 draw call nella camera matrimoniale, restando molto sotto il valore iniziale di circa 200.

## Cucina e postazioni Camera 3

Anche la cucina ad angolo, l'isola, le due scrivanie, i portatili e le sedie da gaming riutilizzano il batching delle primitive cubiche e le geometrie istanziate per i dettagli ripetuti. Sgabelli, tavolo, tovaglia e quattro sedie confluiscono nello stesso sistema. Dopo il perfezionamento della cucina, l'inquadratura di controllo in Visita registra 31 draw call e 44.800 triangoli, senza errori console.

## Protocollo per la prossima sessione

1. Registrare 60 secondi in Visita lungo lo stesso percorso: zona giorno, disimpegno, camera matrimoniale, ritorno e terrazza.
2. Annotare FPS medi, 1% low, draw call, triangoli, risoluzione e device pixel ratio.
3. Ripetere con ombre attive/disattive e pixel ratio 1,0 / 1,35 / 1,75.
4. Conservare screenshot e traccia Performance del browser per confrontare ogni intervento.

Obiettivo iniziale: almeno 55 FPS medi e 40 FPS all’1% low su desktop, senza scatti visibili durante rotazione e attraversamento delle porte.

## Interventi successivi, in ordine

1. Ridurre i piccoli oggetti che proiettano ombre e creare proxy semplificati per le ombre degli arredi.
2. Applicare un profilo adattivo che abbassi temporaneamente il pixel ratio quando gli FPS scendono sotto il target.
3. Sospendere rendering e aggiornamenti nelle viste statiche quando camera e interfaccia sono ferme.
4. Misurare separatamente CPU, GPU e garbage collection prima di ridurre ulteriormente texture o geometrie.
