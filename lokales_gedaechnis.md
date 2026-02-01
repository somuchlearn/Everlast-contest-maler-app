# Lokales Gedächtnis — Malermeister Kalkulationswissen

Extrahiertes Domainwissen aus dem n8n-Workflow (Gemini 2.5 Pro System-Prompt).
Wird vom lokalen Offline-Modell (Ollama/Mistral) zur Angebot-Erstellung verwendet.

---

## 1. Vollständige Preisliste (Deutschland, 2025)

### A) Vorarbeiten
| Leistung | Einheit | Preis |
|----------|---------|-------|
| Möbel abdecken/ausräumen | m² Bodenfläche | 8.50 € |
| Abkleben (Fenster, Türen, Steckdosen) | m² Wandfläche | 4.50 € |
| Tapeten entfernen | m² | 6.00 € |
| Alte Farbe abschleifen | m² | 8.00 € |
| Risse ausbessern (klein, <5mm) | lfm | 12.00 € |
| Löcher verspachteln (groß, >5cm) | Stück | 25.00 € |

### B) Untergrundvorbereitung
| Leistung | Einheit | Preis |
|----------|---------|-------|
| Grundierung Standard | m² | 3.80 € |
| Grundierung Spezial (Nikotin/Feuchtigkeit) | m² | 6.50 € |
| Spachteln Q2 (Standard-Glätte) | m² | 18.00 € |
| Spachteln Q3 (Glatt für Feinputz) | m² | 28.00 € |
| Spachteln Q4 (Hochglatt für Glanzlack) | m² | 42.00 € |

### C) Anstricharbeiten
| Leistung | Einheit | Preis |
|----------|---------|-------|
| Deckenanstrich weiß (2-fach) | m² | 14.50 € |
| Wandanstrich weiß (2-fach) | m² | 12.50 € |
| Wandanstrich farbig (2-fach) | m² | 15.00 € |
| Wandanstrich Sonderfarbe/Effekt | m² | 18.00 € |
| Auffrischung (nur 1-fach) | — | -40 % vom Normalpreis |
| Intensivdeckung (3-fach, Altbau dunkel) | — | +30 % auf Anstrich |

### D) Spezialleistungen
| Leistung | Einheit | Preis |
|----------|---------|-------|
| Stuck/Zierleisten streichen | lfm | 8.50 € |
| Heizkörper lackieren | Stück | 35.00 € |
| Türen inkl. Zargen (beide Seiten) | Stück | 85.00 € |
| Fensterrahmen innen | Stück | 45.00 € |
| Fußleisten streichen | lfm | 3.50 € |

### E) Zusatzkosten
| Leistung | Einheit | Preis |
|----------|---------|-------|
| Anfahrt Standardzone (bis 30 km) | pauschal | 59.00 € |
| Anfahrt Fernzone (über 30 km) | km | 1.20 € |
| Gerüst/Arbeitsbühne | Tag | 120.00 € |
| Entsorgung Altmaterial | pauschal | 45.00 € |
| Express-Zuschlag (<7 Tage) | — | +25 % auf Gesamt |

### F) Schwierigkeitsfaktoren
| Faktor | Zuschlag |
|--------|----------|
| Raumhöhe 3.0–4.0 m | +15 % Arbeitslohn |
| Raumhöhe über 4.0 m | +30 % Arbeitslohn |
| Treppenhaus | +20 % Arbeitslohn |
| Möblierte Räume (nicht ausgeräumt) | +25 % |
| Altbau (Baujahr vor 1970) | +10 % |
| Denkmalschutz | +40 % |

---

## 2. Berechnungslogik

### Wandfläche aus Bodenfläche (Faustformeln bei 2.5 m Deckenhöhe)

| Bodenfläche | Wandfläche (brutto) |
|-------------|---------------------|
| 10 m² | 42 m² |
| 15 m² | 52 m² |
| 20 m² | 62 m² |
| 25 m² | 72 m² |
| 30 m² | 82 m² |

Formel: `Wandfläche = (Länge + Breite) × 2 × Deckenhöhe`

### Abzüge von der Wandfläche
- Pro Fenster: −2 m²
- Pro Tür: −2 m²
- Pro Balkontür: −4 m²
- Wenn Fenster/Türen unbekannt: −15 % der Wandfläche als Pauschalabzug

### Deckenfläche
- Deckenfläche = Bodenfläche (immer 1:1)

---

## 3. Zustandserkennung (Keyword-basiert)

### Schlecht → Spachteln Q2 + Grundierung Spezial
Schlüsselbegriffe: `Risse`, `Löcher`, `Abblätternd`, `Feuchtigkeit`, `Schimmel`, `Alt`, `Stark beschädigt`

### Mittel → Leichtes Spachteln + Grundierung Standard
Schlüsselbegriffe: `Kleine Macken`, `Leichte Gebrauchsspuren`, `Normale Abnutzung`, `Kleinere Risse`

### Gut → Nur Grundierung + Anstrich
Schlüsselbegriffe: `Guter Zustand`, `Neuwertig`, `Nur Auffrischung`, `Erst X Jahre alt`

### Tapete erkannt → Tapeten entfernen + Entsorgung
Schlüsselbegriffe: `Tapete`, `Raufaser`, `Vliestapete`

---

## 4. Kalkulationsreihenfolge

1. **Vorarbeiten** — Möbel abdecken (wenn möbliert), Abkleben (immer), Tapeten entfernen (wenn erwähnt), Risse ausbessern (wenn Schäden erwähnt)
2. **Untergrund** — Spachteln (Q2/Q3/Q4 nach Zustand), Grundierung (Standard oder Spezial)
3. **Anstrich** — Wandanstrich und Deckenanstrich **immer separat** kalkulieren
4. **Spezialarbeiten** — Türen, Fenster, Heizkörper, Stuck (nur wenn explizit erwähnt)
5. **Zusatzkosten** — Anfahrt **immer** (59 €), Entsorgung wenn Tapeten/Altmaterial anfällt, Zuschläge prüfen

---

## 5. Plausibilitätsprüfung

| Fehler | Richtig |
|--------|---------|
| Wandfläche > 200 m² für einen 25 m² Raum | ~72 m² Wandfläche für 25 m² Raum |
| Nur Anstrich ohne Abkleben/Grundierung | Vollständiger Workflow |
| Decke vergessen | Decke immer separat kalkuliert |
| Keine Anfahrt | Anfahrt immer dabei (59 €) |

---

## 6. Referenzbeispiele

### Einfacher Auftrag
**Eingabe:** Schlafzimmer 15 m², guter Zustand, nur weiß streichen
- Wandfläche: 52 m² − 15 % = 44 m²
- Positionen: Abkleben + Grundierung + Wandanstrich + Deckenanstrich + Anfahrt
- **Gesamt: ~1.200 € netto**

### Mittlerer Auftrag
**Eingabe:** Wohnzimmer 25 m², Risse in Wänden, Raufaser entfernen
- Wandfläche: 72 m² − 15 % = 61 m²
- Positionen: Möbel + Abkleben + Tapete entfernen + Risse + Spachteln Q2 + Grundierung + Wandanstrich + Deckenanstrich + Anfahrt + Entsorgung
- **Gesamt: ~3.500 € netto**

### Komplexer Auftrag
**Eingabe:** 3-Zimmer-Wohnung 75 m², Altbau, überall streichen
- Wohnzimmer 25 m² → 61 m² Wand + 25 m² Decke
- Schlafzimmer 20 m² → 53 m² Wand + 20 m² Decke
- Arbeitszimmer 15 m² → 40 m² Wand + 15 m² Decke
- Flur 15 m² → 45 m² Wand + 15 m² Decke
- Gesamt: 199 m² Wand + 75 m² Decke + Altbau-Zuschlag 10 %
- **Gesamt: ~9.800 € netto**

---

## 7. Herkunft dieses Dokuments

Wissen extrahiert aus dem n8n-Workflow (`n8n.artofzionai.de`), Knoten:
- **💬 Text Kalkulation** — Gemini 2.5 Pro System-Prompt (vollständige Preisliste, Berechnungslogik, Beispiele)
- **🖼️ Bild Analyse** — Gemini nano-banana-pro-preview (Bildbasierte Kalkulation)
- **🎬 Mixed Media Prep** — Kombinierte Analyse-Strategie für Bilder + Videos

Das extrahierte Wissen wird im lokalen Offline-Modus als `SYSTEM_PROMPT` in `src/utils/enrich.ts` verwendet, damit Ollama/Mistral ohne Internet gleichwertige Angebote erstellen kann.
