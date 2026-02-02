# 📚 Wissensquelle & Transparenzdokumentation

> **Für den Everlast Contest:** Diese Dokumentation legt vollständig offen, woher die KI-gestützte Angebotserstellung ihr Fachwissen bezieht.

---

## 🎯 Zusammenfassung

Die MalerVoice AI App nutzt **keine trainierten Modelle mit eingebautem Handwerks-Wissen**. Stattdessen wird das gesamte Kalkulationswissen als **strukturierter System-Prompt** in die KI eingespeist. Dies gewährleistet:

- ✅ **Transparenz** — Jeder Preis ist nachvollziehbar
- ✅ **Anpassbarkeit** — Preise können jederzeit aktualisiert werden
- ✅ **Konsistenz** — Gleiche Kalkulationslogik online und offline

---

## 🔄 Architektur der Wissensquellen

### **1. Online-Modus (n8n + Google Gemini)**

**Speicherort:** `n8n-workflow/n8n-workflow.json`

**Wie es funktioniert:**
1. User sendet Anfrage an Webhook-Endpoint
2. n8n-Workflow leitet zu entsprechender Node weiter:
   - **💬 Text Kalkulation** (nur Textbeschreibung)
   - **🖼️ Bild Analyse** (mit Fotos)
3. Der **System-Prompt** wird an Google Gemini gesendet
4. Gemini antwortet mit strukturiertem JSON
5. JSON wird bereinigt und zurückgegeben

**Prompt-Umfang:** ~500 Zeilen mit:
- Vollständiger Preisliste 2025 (Deutschland)
- Schritt-für-Schritt Kalkulationsanleitung
- Zustandserkennung aus Bild UND Text
- Faustformeln für Flächenberechnungen
- Beispiel-Outputs

**Vorteil:**
- Bildanalyse möglich (Gemini kann Raumzustand visuell bewerten)
- Sehr detaillierte Prompts mit ausführlichen Anweisungen

---

### **2. Offline-Modus (Desktop-App + Ollama/OpenAI)**

**Speicherort:** `src/utils/enrich.ts` → Konstante `SYSTEM_PROMPT` (Zeilen 19-108)

**Wie es funktioniert:**
1. User erstellt Angebot in Desktop-App
2. `generateQuote()` wird aufgerufen
3. System-Prompt + User-Input werden kombiniert
4. Anfrage geht an:
   - **Primär:** Ollama (Mistral lokal auf Port 11434)
   - **Fallback:** OpenAI GPT-4o (wenn Ollama nicht verfügbar)
5. LLM antwortet mit strukturiertem JSON
6. JSON wird geparst und validiert

**Prompt-Umfang:** ~90 Zeilen mit:
- Komprimierte Preisliste 2025
- Berechnungsformeln
- Zustandserkennung per Keywords
- Kalkulationsreihenfolge
- Beispiel-Output

**Vorteil:**
- Funktioniert komplett offline (mit Ollama)
- Schneller (kürzerer Prompt = weniger Tokens)
- Privacy (Daten verlassen nie den Rechner)

---

## 📊 Die Wissensquelle im Detail

### **Preisliste Deutschland 2025**

Die Preise basieren auf **marktüblichen Handwerkerpreisen** und sind in 6 Kategorien strukturiert:

#### A) Vorarbeiten
| Leistung | Preis | Quelle |
|----------|-------|--------|
| Möbel abdecken | 8.50 €/m² | Branchendurchschnitt 2025 |
| Abkleben | 4.50 €/m² | Standardpreis Maler-Handwerk |
| Tapeten entfernen | 6.00 €/m² | Aufwandsbasiert |
| Risse ausbessern | 12.00 €/lfm | Kleinreparatur-Standard |

#### B) Untergrundvorbereitung
| Leistung | Preis | Quelle |
|----------|-------|--------|
| Grundierung Standard | 3.80 €/m² | Material + Arbeit |
| Spachteln Q2 (Standard) | 18.00 €/m² | VOB-konforme Kalkulation |
| Spachteln Q3 (Glatt) | 28.00 €/m² | Erhöhter Aufwand |
| Spachteln Q4 (Hochglatt) | 42.00 €/m² | Premium-Finish |

#### C) Anstricharbeiten
| Leistung | Preis | Quelle |
|----------|-------|--------|
| Wandanstrich weiß (2-fach) | 12.50 €/m² | Standardpreis 2-Schichten |
| Deckenanstrich weiß (2-fach) | 14.50 €/m² | Höherer Aufwand (über Kopf) |
| Wandanstrich farbig | 15.00 €/m² | Mehraufwand durch Farbmischung |

#### D) Spezialleistungen
| Leistung | Preis | Quelle |
|----------|-------|--------|
| Türen inkl. Zargen | 85.00 €/Stk | Beide Seiten, Detail-Arbeit |
| Heizkörper lackieren | 35.00 €/Stk | Demontage optional |

#### E) Zusatzkosten
| Leistung | Preis | Quelle |
|----------|-------|--------|
| Anfahrt (bis 30 km) | 59.00 € | Pauschale inkl. Zeitaufwand |
| Entsorgung Altmaterial | 45.00 € | Deponiekosten |

#### F) Schwierigkeitsfaktoren
| Faktor | Zuschlag | Begründung |
|--------|----------|------------|
| Altbau (vor 1970) | +10% | Unebene Wände, höherer Aufwand |
| Raumhöhe 3-4m | +15% | Gerüstbedarf |
| Möblierte Räume | +25% | Schutzaufwand, eingeschränkte Bewegung |

**📌 Datenquelle:**
Diese Preise wurden zusammengestellt aus:
- Handwerkskammer-Richtwerten
- Marktüblichen Stundensätzen (40-60 €/h)
- Materialkosten-Kalkulation
- Öffentlichen Angebotsvergleichen (Stand: 2025)

---

### **Berechnungslogik**

#### Flächenberechnung (Faustformeln)

```
Wandfläche (brutto) = (Länge + Breite) × 2 × Deckenhöhe

Bei unbekannten Maßen:
- 10 m² Boden → 42 m² Wand (bei 2.5m Höhe)
- 15 m² Boden → 52 m² Wand
- 20 m² Boden → 62 m² Wand
- 25 m² Boden → 72 m² Wand
- 30 m² Boden → 82 m² Wand

Abzüge:
- Pro Fenster: -2 m²
- Pro Tür: -2 m²
- Pro Balkontür: -4 m²
- Wenn unbekannt: -15% pauschal
```

#### Zustandserkennung (Keyword-Matching)

Die KI analysiert die Beschreibung auf Keywords:

| Zustand | Keywords | Aktion |
|---------|----------|--------|
| **Schlecht** | "Risse", "Löcher", "Feuchtigkeit", "Schimmel" | Spachteln Q2 + Grundierung Spezial |
| **Mittel** | "Macken", "Gebrauchsspuren", "Kleinere Risse" | Leichtes Spachteln + Grundierung |
| **Gut** | "Guter Zustand", "Neuwertig", "Auffrischung" | Nur Grundierung + Anstrich |
| **Tapete** | "Tapete", "Raufaser", "Vliestapete" | Tapeten entfernen + Entsorgung |

---

## 🔍 Beispiel-Ablauf (Schritt-für-Schritt)

### Input (User):
```
Kunde: Schmidt GmbH
Adresse: Musterstraße 12, Hamburg
Beschreibung: "Wohnzimmer 25 Quadratmeter, Wände und Decke streichen,
zwei Fenster, eine Tür, kleine Risse an der Südwand, Raufaser entfernen"
```

### Verarbeitung (KI):

**Schritt 1: Raumanalyse**
- Bodenfläche: 25 m² (direkt angegeben)
- Wandfläche (brutto): 72 m² (Faustformel)
- Abzüge: 2 Fenster (-4 m²) + 1 Tür (-2 m²) = -6 m²
- **Wandfläche netto: 66 m²**
- **Deckenfläche: 25 m²** (= Bodenfläche)

**Schritt 2: Zustandsanalyse**
- Keywords erkannt: "kleine Risse" → **Mittel**
- Keyword erkannt: "Raufaser" → **Tapete vorhanden**

**Schritt 3: Positionen erstellen**
1. Möbel abdecken: 25 m² × 8.50 € = 212.50 €
2. Abkleben: 66 m² × 4.50 € = 297.00 €
3. **Tapeten entfernen**: 66 m² × 6.00 € = 396.00 € (wegen Keyword)
4. **Risse ausbessern**: 5 lfm × 12.00 € = 60.00 € (geschätzt)
5. Spachteln Q2: 66 m² × 18.00 € = 1.188.00 € (wegen Zustand)
6. Grundierung: 66 m² × 3.80 € = 250.80 €
7. Wandanstrich weiß 2-fach: 66 m² × 12.50 € = 825.00 €
8. Deckenanstrich weiß 2-fach: 25 m² × 14.50 € = 362.50 €
9. **Anfahrt**: 1 × 59.00 € = 59.00 € (IMMER dabei)
10. **Entsorgung**: 1 × 45.00 € = 45.00 € (wegen Tapete)

**Gesamt netto: 3.695,80 €**

### Output (JSON):
```json
{
  "positionen": [
    { "titel": "Möbel abdecken/schützen", "menge": 25, "einheit": "m²", "einzelpreis": 8.50, "summe": 212.50 },
    { "titel": "Abkleben Fenster, Türen", "menge": 66, "einheit": "m²", "einzelpreis": 4.50, "summe": 297.00 },
    // ... (alle Positionen)
  ],
  "gesamt_netto": 3695.80,
  "ki_analyse_notiz": "Wohnzimmer 25m² Bodenfläche. Wandfläche: 72m² - 6m² (2 Fenster + 1 Tür) = 66m² netto. Deckenfläche: 25m². Zustand: Mittel (kleine Risse erkannt). Raufaser muss entfernt werden. Ablauf: 1) Möbel schützen, 2) Tapeten entfernen, 3) Risse ausbessern, 4) Spachteln Q2, 5) Grundierung, 6) 2-fach Anstrich Wände + Decke. Geschätzter Zeitaufwand: 3-4 Arbeitstage."
}
```

---

## ⚙️ Technische Umsetzung

### Offline-Modus (Code-Referenz)

**Datei:** `src/utils/enrich.ts`

```typescript
const SYSTEM_PROMPT = `Du bist ein erfahrener Malermeister...
PREISLISTE (Deutschland, 2025):
A) VORARBEITEN
• Möbel abdecken: 8.50€/m² Bodenfläche
• Abkleben: 4.50€/m² Wandfläche
...
`;

export async function generateQuote(
  customerName: string,
  address: string,
  notes: string,
  images: File[],
  online: boolean = false
): Promise<QuoteResult> {
  if (online) {
    // n8n-Webhook mit Gemini
    response = await callN8N(customerName, address, notes, images);
  } else {
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Projekt: ${notes}` }
    ];
    // Primär: Ollama (lokal), Fallback: OpenAI
    try {
      response = await callOllama(messages);
    } catch {
      response = await callOpenAI(messages);
    }
  }
  // JSON parsen und validieren
  return JSON.parse(extractJSON(response));
}
```

### Online-Modus (n8n-Workflow)

**Datei:** `n8n-workflow/n8n-workflow.json`

**Node: 💬 Text Kalkulation** (Zeilen 72-106)
```json
{
  "parameters": {
    "modelId": "models/gemini-3-pro-preview",
    "messages": {
      "values": [{
        "content": "Du bist ein erfahrener Malermeister mit 25+ Jahren...\nPREISLISTE (Deutschland, 2025):\n..."
      }]
    }
  }
}
```

**Node: 🖼️ Bild Analyse** (Zeilen 44-71)
- Gleiches Prompt-Schema
- Zusätzlich: Bild-Analyse-Anweisungen
- Model: `nano-banana-pro-preview` (multimodal)

---

## 📋 Wartung & Aktualisierung

### Wenn sich Preise ändern müssen:

**3 Stellen aktualisieren:**

1. **Offline-Prompt:** `src/utils/enrich.ts` (SYSTEM_PROMPT)
2. **Online-Prompt (Text):** `n8n-workflow/n8n-workflow.json` → Node "💬 Text Kalkulation"
3. **Online-Prompt (Bild):** `n8n-workflow/n8n-workflow.json` → Node "🖼️ Bild Analyse"
4. **Dokumentation:** `docs/WISSENSQUELLE.md` (diese Datei)
5. **Referenz:** `lokales_gedaechnis.md` (internes Wissensarchiv)

### Empfehlung für Zukunft:

```typescript
// ❌ Aktuell: Hart-codiert in Strings
const SYSTEM_PROMPT = `...Möbel abdecken: 8.50€/m²...`;

// ✅ Besser: Zentrale Preisliste
import { PREISLISTE, buildSystemPrompt } from './preisliste';
const SYSTEM_PROMPT = buildSystemPrompt(PREISLISTE);
```

**Vorteil:** Single Source of Truth, einfachere Wartung

---

## ✅ Transparenz-Checklist für Contest

- [x] **Vollständige Offenlegung der Preisquelle** (diese Datei)
- [x] **Code ist nachvollziehbar** (SYSTEM_PROMPT direkt lesbar in `enrich.ts`)
- [x] **Keine versteckten KI-Modell-Abhängigkeiten** (reine Prompt-Engineering)
- [x] **Workflow-Dokumentation** (n8n-JSON liegt im Repo)
- [x] **Beispiel-Kalkulationen** mit nachvollziehbarem Rechenweg
- [x] **Offline-Fähigkeit** bewiesen (Ollama läuft lokal)

---

## 📌 Fazit

Die MalerVoice AI App trennt **Wissen** (Prompts mit Preisliste) von **Intelligenz** (LLM).

**Das bedeutet:**
- ✅ Kein "Black-Box" Modell
- ✅ Jeder Preis ist transparent
- ✅ Anpassbar an andere Regionen/Länder
- ✅ Volle Kontrolle über Kalkulationslogik

Die KI ist nur das **Werkzeug** — das **Fachwissen** liegt in den strukturierten Prompts.
