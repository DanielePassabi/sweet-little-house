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

## Revisione paesaggio del 15 settembre 2026

Nella stessa anteprima desktop a 1280 × 720, panoramica iniziale: **82 → 76 draw call**. La nuova panoramica usa circa **113.365 triangoli**: i ciuffi aumentano il lavoro geometrico, quindi la riduzione di draw call non implica automaticamente un aumento degli FPS. La pianta nasconde ciuffi, nuvole e montagne (73 draw call osservate). Nessun benchmark FPS su hardware dell’utente è stato eseguito.

Tre batch per gli alberi, uno per il prato, uno per montagne e neve, uno per le nuvole. Nessuna ombra proiettata dai ciuffi o dalle nuvole; profilo touch con metà dei candidati per il prato. Nessuna texture o libreria esterna aggiunta. Verifica visiva locale di panoramica, pianta, interno e orizzonte; console senza errori o avvisi durante i controlli.

## Ottimizzazione senza riduzione visiva — 16 settembre 2026

- Pulsante **Mostra FPS** nelle impostazioni: overlay disattivabile con fotogrammi effettivamente disegnati al secondo, draw call, triangoli e tempo CPU medio di aggiornamento etichette/invio del frame. Non è una misura del tempo GPU. Campionamento ogni secondo; a scena ferma compare **A riposo**. Interazioni isolate possono produrre pochi FPS perché il rendering è su richiesta.
- Rendering saltato quando camera, proiezione e contenuto sono invariati; ripresa automatica con movimento, zoom, cambio vista, righello, materiali, etichette e ridimensionamento. Scheda nascosta: nessun rendering.
- Trasformazioni statiche precalcolate; il righello resta dinamico. Etichette e minimappa si aggiornano solo al ridisegno; dimensioni del viewport e riferimenti DOM sono memorizzati.
- Pareti indicizzate unendo solo vertici con posizione e normale esattamente uguali: **80.520 → 18.732 vertici (-76,7%)**. Stessi triangoli, superfici, spigoli e illuminazione. Il test verifica che gli indici ricostruiscano gli stessi dati.
- Movimento fermo: nessuna scansione delle collisioni. Architravi filtrati una volta; meno allocazioni durante i passi fisici. Test di movimento invariati e superati.
- Nessuna riduzione di pixel ratio, texture, ombre, luci, vegetazione o geometria visibile. Panoramica: **76 draw call e 113.365 triangoli** invariati. In anteprima il contatore dei render è rimasto a 3 durante due letture separate da oltre 10 secondi, prima di riprendere alle interazioni. Verificati overlay, panoramica, pianta, interno e modifica delle piastrelle; nessun errore console.

Il risparmio principale si verifica a scena ferma. Nessuna percentuale di aumento FPS durante il movimento è dichiarata senza un benchmark comparabile sull’hardware di destinazione.

## Illuminazione solare — 16 settembre 2026

Direzione fissa (-24, 19, -14) rispetto al centro casa: provenienza alto-sinistra in pianta, elevazione circa 34°. Riutilizzati il singolo sole con ombre 2048 × 2048 e i punti luce esistenti, riducendo il riempimento interno. Il soffitto ora proietta ombra in Visita; i materiali trasparenti non proiettano ombre opache. La shadow map resta statica durante il movimento e viene invalidata una volta entrando/uscendo dalla Visita. Nessun ricalcolo continuo o effetto volumetrico aggiunto. Verificati luce della finestra sul pavimento di Camera 3 e ritorno alla Pianta con ombre verso il basso a destra, senza errori console.

## Materiali e collisioni dettagliate

Tre texture procedurali condivise (due 256 × 256, una 512 × 512), senza mesh aggiuntive. Bump/roughness aggiungono campionamenti agli shader dei materiali interessati: il costo non è nullo, ma resta contenuto e non richiede texture esterne né riflessioni renderizzate a ogni frame. Collisioni suddivise per oggetto e filtrate con celle metriche; test del filtro rispetto a scansione completa e raggiungibilità delle stanze. Il sole viene calcolato localmente soltanto al cambio di data/ora; input ravvicinati vengono accorpati nel frame successivo. Nessuna animazione solare continua.
