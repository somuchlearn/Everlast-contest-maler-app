# 🎨 PaintVoice AI

**Intelligente Angebotserstellung für Maler – per Sprache und Text**

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
🎤 Sprache  +  📸 Fotos  +  📝 Text  →  🤖 Lokale KI  →  📄 Fertiges Angebot
```

### So funktioniert's:

1. **Hotkey drücken** (`⌘⇧R`) – App ist sofort bereit
2. **Sprechen**: *"Wohnzimmer 25 Quadratmeter, Wände und Decke streichen, drei Fenster, Risse in der Südwand"*
3. **Optional**: Fotos vom Raum hinzufügen
4. **Ein Klick** → Vollständiges Angebot mit:
    - Detaillierten Positionen
    - Korrekten Preisen (nach Handwerksstandard)
    - Professioneller KI-Analyse
    - PDF-Export

**Zeitersparnis: 45-60 Minuten pro Angebot.**

---

## ✨ Features

| Feature | Beschreibung |
|---------|-------------|
| 🎤 **Voice-to-Text** | Lokale Whisper-Transkription im Browser – keine Cloud nötig |
| 📸 **Foto-Upload** | Fotos werden zum Angebot zugeordnet |
| ⌨️ **Global Hotkey** | `⌘⇧R` / `Ctrl+Shift+R` – funktioniert aus jeder Anwendung |
| 🤖 **Lokale KI** | Ollama mit Mistral – Angebot wird lokal berechnet |
| ☁️ **Cloud-Fallback** | Falls Ollama nicht verfügbar → automatischer Fallback auf OpenAI GPT-4o |
| 📄 **PDF-Export** | Professionelle Angebote, sofort versandfertig |
| 🌙 **Dark Mode UI** | Modernes, augenschonendes Design |
| 🔒 **Offline-tüchtig** | Transkription läuft komplett lokal, Enrichment per Ollama ohne Internet |

---

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                      PaintVoice AI                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Tauri     │    │  Next.js    │    │  TypeScript │     │
│  │   (Rust)    │◄──►│   Frontend  │◄──►│   Logic     │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                   │            │
│         ▼                  ▼                   ▼            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Global    │    │   Whisper   │    │   Ollama    │     │
│  │   Hotkey    │    │   (lokal)   │    │   (lokal)   │     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │
│                                               │             │
│                                    ┌──────────┴──────┐      │
│                                    │  Fallback wenn  │      │
│                                    │  Ollama offline │      │
│                                    └────────┬────────┘      │
│                                             ▼               │
│                                    ┌─────────────┐          │
│                                    │  OpenAI     │          │
│                                    │  GPT-4o     │          │
│                                    └─────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technologie-Stack

| Komponente | Technologie | Warum? |
|------------|-------------|--------|
| **Desktop Runtime** | Tauri 2.0 + Rust | Schnell, sicher, klein (~10MB vs ~150MB Electron) |
| **Framework** | Next.js 15 + React 19 | Statischer Export für Tauri, moderna Komponentenstruktur |
| **Voice-to-Text** | Whisper via @huggingface/transformers | Läuft lokal im Browser (WASM/WebGPU), keine API nötig |
| **LLM Enrichment** | Ollama (Mistral) | Lokales Modell, OpenAI-kompatibler API, keine Cloud |
| **Cloud-Fallback** | OpenAI GPT-4o | Backup wenn Ollama nicht verfügbar |
| **PDF-Generation** | jsPDF | Client-seitig, keine Server-Abhängigkeit |

---

## 🔄 Datenfluss

```
User Input                    Processing                     Output
─────────────────────────────────────────────────────────────────────

┌──────────┐    ┌─────────────────────┐
│  Sprache │──► │  Whisper (lokal)    │──► Transkript ──┐
└──────────┘    │  @huggingface/      │                 │
                │  transformers       │                 │
                └─────────────────────┘                 │
                                                        ▼
┌──────────┐                                    ┌──────────┐
│  Fotos   │───────────────────────────────►    │  Ollama  │
└──────────┘                                    │ (lokal)  │
                                                │  oder    │
┌──────────┐                                    │ OpenAI   │
│   Text   │───────────────────────────────►    │ (Backup) │
└──────────┘                                    └────┬─────┘
                                                     │
                                                     ▼
┌──────────┐      ┌──────────┐      ┌──────────┐  ┌──────────┐
│   PDF    │ ◄─── │  UI      │ ◄─── │  Parse   │◄─│  JSON    │
│  Export  │      │  Render  │      │  + Calc  │  │ Response │
└──────────┘      └──────────┘      └──────────┘  └──────────┘
```

---

## 📦 Installation & Setup

### Voraussetzungen

- Node.js 18+
- Rust (via rustup)
- [Ollama](https://ollama.ai) installiert
- macOS / Windows / Linux

### 1. Repository klonen

```bash
git clone https://github.com/somuchlearn/Everlast-contest-maler-app.git
cd Everlast-contest-maler-app
```

### 2. Ollama-Modell pullen

```bash
ollama pull mistral
```

> Das Modell (~4GB) wird einmal heruntergeladen und lokal gespeichert. Ollama muss beim Betrieb im Hintergrund laufen.

### 3. Dependencies installieren

```bash
npm install
```

### 4. Environment konfigurieren (optional)

Erstelle `.env` im Root-Verzeichnis für den Cloud-Fallback:

```env
NEXT_PUBLIC_OPENAI_API_KEY=sk-your-openai-api-key
```

> Ohne diesen Key läuft die App trotzdem – solange Ollama lokal läuft, wird OpenAI nicht benötigt.

### 5. Development starten

```bash
npm run tauri dev
```

### 6. Production Build

```bash
npm run tauri build
```

Das Build-Artefakt liegt in `src-tauri/target/release/bundle/`.

> **Beim ersten Start** wird das Whisper-Modell (~244MB) automatisch heruntergeladen und gecacht. Danach läuft die Transkription komplett offline.

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

### 2. Warum lokale KI statt Cloud-Only?

Das Briefing fordert eine **"eigenständige Desktop-Applikation"**. Das bedeutet minimale Abhängigkeiten von externen Diensten:

- **Transkription lokal:** Whisper läuft über `@huggingface/transformers` direkt im Browser via WASM/WebGPU. Das Modell wird beim ersten Start gecacht – danach kein Internet mehr nötig.
- **Enrichment lokal:** Ollama führt ein lokales Mistral-Modell aus. Die gesamte Angebot-Kalkulation passiert auf dem Rechner des Nutzers.
- **Fallback-Architektur:** Falls Ollama nicht verfügbar ist, wird automatisch auf OpenAI GPT-4o zurückgefallen. Die App funktioniert niemals nicht.

### 3. Warum Ollama + Mistral?

- **OpenAI-kompatibler API:** Der gleiche Code arbeitet mit Ollama lokal und OpenAI als Fallback – minimale Duplikation.
- **Mistral:** Starkes Modell für Deutsch, verlässlich bei strukturierter JSON-Ausgabe.
- **Einfaches Setup:** Ein Befehl (`ollama pull mistral`), dann läuft es.

### 4. UI/UX Entscheidungen

- **Dark Mode:** Reduziert Augenbelastung bei längerer Nutzung
- **Minimalistisches Design:** Fokus auf Funktion, keine Ablenkung
- **Inline-Feedback:** Status, Transkript, Fehler direkt sichtbar
- **Model-Status-Indikator:** Zeigt ob das Whisper-Modell geladen ist

---

## 📊 Beispiel-Output

**Eingabe (Sprache):**
> "Schlafzimmer 18 Quadratmeter, Wände streichen weiß, Decke auch, ein Fenster, Tür, kleiner Riss an der Nordwand"

**Ausgabe:**

| Position | Menge | Einheit | Preis | Summe |
|----------|-------|---------|-------|-------|
| Abkleben Fenster, Tür | 2 | Stk | 4,50 € | 9,00 € |
| Risse ausbessern | 1 | Stk | 30,00 € | 30,00 € |
| Grundierung Wände | 48 | m² | 8,00 € | 384,00 € |
| Wandanstrich weiß 2-fach | 48 | m² | 14,00 € | 672,00 € |
| Deckenanstrich weiß | 18 | m² | 13,00 € | 234,00 € |
| **Netto** | | | | **1.329,00 €** |
| **MwSt. 19%** | | | | **252,51 €** |
| **Brutto** | | | | **1.581,51 €** |

---

## 🙏 Danksagungen

- [Tauri](https://tauri.app/) – Desktop-Framework
- [Next.js](https://nextjs.org/) – Web-Framework
- [@huggingface/transformers](https://github.com/huggingface/transformers.js) – Lokale Whisper-Inferenz im Browser
- [Ollama](https://ollama.ai/) – Lokale LLM-Ausführung
- [jsPDF](https://github.com/parallax/jsPDF) – Client-seitige PDF-Generierung

---

<div align="center">

**🎨 PaintVoice AI** – *Sprich dein Angebot.*

</div>
