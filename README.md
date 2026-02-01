# 🎨 PaintVoice AI

**Intelligente Angebotserstellung für Maler – per Sprache, Bild und Text**

> 🏆 Eingereicht für den Developer Contest: Voice-to-Text Desktop App

---

## 🎯 Das Problem

**Maler und Handwerker verlieren täglich 1-2 Stunden mit Angebotserstellung.**

Der typische Ablauf heute:
1. Kunde anrufen / Vor-Ort-Termin
2. Notizen auf Papier oder Handy
3. Zurück ins Büro
4. Fotos durchschauen
5. Flächen berechnen
6. Preise nachschlagen
7. Angebot in Word/Excel tippen
8. PDF erstellen und versenden

**Das Ergebnis:** Fehleranfällig, zeitaufwändig, frustrierend.

---

## 💡 Die Lösung

**PaintVoice AI** transformiert den gesamten Prozess in einen einzigen, nahtlosen Workflow:

```
🎤 Sprache  +  📸 Fotos  +  📝 Text  →  🤖 KI  →  📄 Fertiges Angebot
```

### So funktioniert's:

1. **Hotkey drücken** (`⌘⇧R`) – App ist sofort bereit
2. **Sprechen**: *"Wohnzimmer 25 Quadratmeter, Wände und Decke streichen, drei Fenster, Risse in der Südwand"*
3. **Optional**: Fotos/Videos vom Raum hinzufügen
4. **Ein Klick** → Vollständiges Angebot mit:
    - Detaillierten Positionen
    - Korrekten Preisen (nach Handwerksstandard 2025)
    - Professioneller KI-Analyse
    - PDF-Export

**Zeitersparnis: 45-60 Minuten pro Angebot.**

---

## ✨ Features

| Feature | Beschreibung |
|---------|-------------|
| 🎤 **Voice-to-Text** | Whisper AI Transkription mit Maler-spezifischem Kontext |
| 📸 **Multi-Modal Input** | Fotos & Videos werden per KI analysiert (Raumgröße, Zustand, Schäden) |
| ⌨️ **Global Hotkey** | `⌘⇧R` / `Ctrl+Shift+R` – funktioniert aus jeder Anwendung |
| 🧠 **Intelligente Kalkulation** | Gemini AI mit vollständiger Preisliste 2025 |
| 📄 **PDF-Export** | Professionelle Angebote, sofort versandfertig |
| 🌙 **Dark Mode UI** | Modernes, augenschonendes Design |
| 🔒 **Lokal & Sicher** | Desktop-App, keine Cloud-Abhängigkeit für Kerndaten |

---

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                      PaintVoice AI                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Tauri     │    │   React     │    │  TypeScript │     │
│  │   (Rust)    │◄──►│   Frontend  │◄──►│   Logic     │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                   │            │
│         ▼                  ▼                   ▼            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Global    │    │   Whisper   │    │    n8n      │     │
│  │   Hotkey    │    │   API       │    │   Backend   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                              │              │
│                                              ▼              │
│                                       ┌─────────────┐      │
│                                       │  Gemini AI  │      │
│                                       │  (Multi-    │      │
│                                       │   Modal)    │      │
│                                       └─────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technologie-Stack

| Komponente | Technologie | Warum? |
|------------|-------------|--------|
| **Desktop Runtime** | Tauri 2.0 + Rust | Schnell, sicher, klein (~10MB vs ~150MB Electron) |
| **Frontend** | React 18 + TypeScript | Type-Safety, Component-basiert |
| **Voice-to-Text** | OpenAI Whisper API | Beste Deutsch-Erkennung, Maler-Kontext via Prompt |
| **Backend/Orchestration** | n8n (self-hosted) | Visueller Workflow, Multi-Modal Routing |
| **KI-Kalkulation** | Google Gemini 2.5 Pro | Bild/Video-Analyse + Text-Verarbeitung |
| **PDF-Generation** | jsPDF | Client-seitig, keine Server-Abhängigkeit |

---

## 🔄 Datenfluss

```
User Input                    Processing                     Output
─────────────────────────────────────────────────────────────────────

┌──────────┐
│  Sprache │──► Whisper API ──► Transkript ──┐
└──────────┘                                  │
                                              │
┌──────────┐                                  ▼
│  Fotos/  │──► Base64 Encode ──────────► ┌──────────┐
│  Videos  │                               │   n8n    │
└──────────┘                               │ Workflow │
                                           │          │
┌──────────┐                               │  Route:  │
│   Text   │───────────────────────────►  │ • Text   │
└──────────┘                               │ • Bild   │──► Gemini AI
                                           │ • Video  │        │
                                           │ • Mixed  │        │
                                           └──────────┘        │
                                                               ▼
                                                        ┌──────────┐
┌──────────┐      ┌──────────┐      ┌──────────┐      │  JSON    │
│   PDF    │ ◄─── │  UI      │ ◄─── │  Parse   │ ◄─── │ Response │
│  Export  │      │  Render  │      │  Clean   │      └──────────┘
└──────────┘      └──────────┘      └──────────┘
```

---

## 📦 Installation & Setup

### Voraussetzungen

- Node.js 18+
- Rust (via rustup)
- macOS / Windows / Linux

### 1. Repository klonen

```bash
git clone https://github.com/[username]/paintvoice-ai.git
cd paintvoice-ai
```

### 2. Dependencies installieren

```bash
npm install
```

### 3. Environment konfigurieren

Erstelle `.env` im Root-Verzeichnis:

```env
VITE_OPENAI_API_KEY=sk-your-openai-api-key
```

### 4. Development starten

```bash
npm run tauri dev
```

### 5. Production Build

```bash
npm run tauri build
```

Das Build-Artefakt liegt in `src-tauri/target/release/bundle/`.

---

## ⌨️ Bedienung

| Aktion | Shortcut / UI |
|--------|---------------|
| App aktivieren | `⌘⇧R` (Mac) / `Ctrl+Shift+R` (Win/Linux) |
| Aufnahme starten | Button "🎙️ Aufnahme starten" oder Hotkey |
| Aufnahme stoppen | Button "Aufnahme stoppen" oder Hotkey erneut |
| Fotos hinzufügen | Drag & Drop oder Klick auf Upload-Zone |
| Angebot erstellen | Button "Angebot erstellen →" |
| PDF exportieren | Button "📄 PDF" im Ergebnis |
| Neues Angebot | Button "↺ Neu" |

---

## 🎨 Design-Entscheidungen

### 1. Warum Tauri statt Electron?

| Kriterium | Tauri | Electron |
|-----------|-------|----------|
| Bundle-Größe | ~10 MB | ~150 MB |
| RAM-Verbrauch | ~50 MB | ~300 MB |
| Startup-Zeit | <1s | 2-3s |
| Sicherheit | Rust-basiert | Chromium-basiert |

**Fazit:** Für eine App die "nahtlos im Workflow" sein soll, ist Performance entscheidend.

### 2. Warum n8n als Backend?

- **Visueller Workflow:** Einfach zu debuggen und erweitern
- **Multi-Modal Routing:** Intelligente Unterscheidung Text/Bild/Video/Mixed
- **Self-hosted:** Volle Kontrolle, keine Vendor-Lock-in
- **Webhook-basiert:** Einfache Integration mit dem Frontend

### 3. Warum Whisper + Gemini Kombination?

- **Whisper:** Beste Transkription für Deutsch, unterstützt Fachbegriffe via Prompt
- **Gemini:** Kann Bilder UND Videos analysieren (GPT-4V nur Bilder)
- **Prompt-Engineering:** Detaillierte Preisliste 2025 im System-Prompt für konsistente Kalkulationen

### 4. UI/UX Entscheidungen

- **Dark Mode:** Reduziert Augenbelastung bei längerer Nutzung
- **Minimalistisches Design:** Fokus auf Funktion, keine Ablenkung
- **Inline-Feedback:** Status, Transkript, Fehler direkt sichtbar
- **Ein-Klick-Workflow:** Von Eingabe zu PDF in <30 Sekunden

---

## 📊 Beispiel-Output

**Eingabe (Sprache):**
> "Schlafzimmer 18 Quadratmeter, Wände streichen weiß, Decke auch, ein Fenster, Tür, kleiner Riss an der Nordwand"

**Ausgabe:**

| Position | Menge | Einheit | Preis | Summe |
|----------|-------|---------|-------|-------|
| Abkleben Fenster, Tür | 48 | m² | 4,50 € | 216,00 € |
| Risse ausbessern | 2 | lfm | 12,00 € | 24,00 € |
| Grundierung Wände | 48 | m² | 3,80 € | 182,40 € |
| Wandanstrich weiß 2-fach | 48 | m² | 12,50 € | 600,00 € |
| Deckenanstrich weiß 2-fach | 18 | m² | 14,50 € | 261,00 € |
| Anfahrt | 1 | pauschal | 59,00 € | 59,00 € |
| **Netto** | | | | **1.342,40 €** |
| **MwSt. 19%** | | | | **255,06 €** |
| **Brutto** | | | | **1.597,46 €** |

---

## 🔮 Roadmap / Nächste Schritte

- [ ] **Offline-Modus:** Lokale Whisper-Alternative (whisper.cpp)
- [ ] **Template-System:** Wiederkehrende Kunden/Projekte speichern
- [ ] **CRM-Integration:** Export zu Lexoffice, SevDesk, etc.
- [ ] **Mobile Companion:** iOS/Android App für Vor-Ort-Aufnahmen
- [ ] **Multi-Language:** Englisch, Türkisch, Polnisch (Baubranche)

---

## 📄 Lizenz

MIT License – siehe [LICENSE](LICENSE)

---

## 👤 Autor

Entwickelt für den **Voice-to-Text Desktop App Contest**

---

## 🙏 Danksagungen

- [Tauri](https://tauri.app/) – Für das beste Desktop-Framework
- [OpenAI Whisper](https://openai.com/research/whisper) – Für exzellente Spracherkennung
- [Google Gemini](https://deepmind.google/technologies/gemini/) – Für Multi-Modal AI
- [n8n](https://n8n.io/) – Für flexible Workflow-Automation
- [jsPDF](https://github.com/parallax/jsPDF) – Für Client-seitige PDF-Generierung

---

<div align="center">

**🎨 PaintVoice AI** – *Sprich dein Angebot.*

</div>