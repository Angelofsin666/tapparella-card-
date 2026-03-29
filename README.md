# 🪟 Tapparella Card

Card personalizzata per Home Assistant che permette di controllare le tapparelle (cover) con un'interfaccia moderna e intuitiva.

## Funzionalità

- **Grafica SVG animata** — visualizza lo stato della tapparella (aperta, chiusa, parziale) con le stecche animate in base alla posizione
- **Percentuale grande** — posizione attuale ben visibile
- **Slider di posizione** — trascina per impostare la posizione desiderata
- **Pulsanti Apri / Stop / Chiudi** — con effetto hover colorato
- **Sensore energia** — opzionale, mostra il consumo in kWh
- **Colore tema personalizzabile** — il colore principale si propaga a tutta la card
- **Editor visivo** — nessun YAML, tutto configurabile dall'interfaccia di HA

## Installazione via HACS

1. Vai su **HACS → Frontend**
2. Clicca i tre puntini in alto a destra → **Custom repositories**
3. Aggiungi l'URL di questo repository e scegli categoria **Dashboard**
4. Cerca "Tapparella Card" e installa
5. Ricarica la pagina

## Configurazione manuale (senza HACS)

1. Copia `tapparella-card.js` nella cartella `www/` di Home Assistant
2. Vai su **Impostazioni → Dashboard → Risorse**
3. Aggiungi: `/local/tapparella-card.js` (tipo: JavaScript module)
4. Ricarica la pagina

## Utilizzo

Nella dashboard, clicca **Aggiungi card** e cerca **Tapparella Card**.

Poi compila i campi:

| Campo | Descrizione | Obbligatorio |
|---|---|---|
| Cover entity | Entità `cover.*` della tapparella | ✅ |
| Sensore energia | Entità `sensor.*` del consumo | ❌ |
| Nome stanza | Testo visualizzato nell'header | ❌ |
| Colore tema | Colore esadecimale (es. `#6366f1`) | ❌ |

## Configurazione YAML equivalente

```yaml
type: custom:tapparella-card
entity: cover.tapparella_soggiorno
energy_entity: sensor.tapparella_soggiorno_energy
name: Soggiorno
color: "#6366f1"
```

## Requisiti

- Home Assistant 2023.9+
- Nessuna dipendenza esterna (no Mushroom, no Button Card)

## Screenshot

La card mostra:
- Header con icona, nome stanza ed energia
- Pannello grafico con SVG della tapparella
- Numero grande con la percentuale di apertura
- Badge stato (Aperta / Parziale / Chiusa)
- Slider per impostare la posizione
- Tre pulsanti: Apri (verde), Stop (giallo), Chiudi (colore tema)
