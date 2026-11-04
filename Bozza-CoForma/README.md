# CoForma — Bozza-CoForma

Bozza desktop companion (HTML/CSS/JS) per il flusso C3.

## Avvio

Dalla root del repo:

```bash
python3 -m http.server 8765
```

Apri: [http://127.0.0.1:8765/Bozza-CoForma/](http://127.0.0.1:8765/Bozza-CoForma/)

Serve un server locale (non `file://`) per caricare il `.3mf` nel viewer Three.js.

## Esempio di lavoro

`examples/Tasto-Microonde.3mf` — pezzo **Tasto Microonde** (export Shapr3D).  
Nella Vista modello: viewer 3D (OrbitControls) con fallback sull’anteprima in `examples/previews/`.

## Interazioni

- Stepper e tutti i pulsanti di navigazione/azione
- Drag (o frecce tastiera) sulle maniglie tra Workspace / Vista modello / pannelli laterali — dimensioni ricordate in `localStorage`
- Salva sessione, guida CAD, fonti, check-list export
