const OLLAMA_URL = "http://localhost:11434/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const N8N_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || "";

export interface QuotePosition {
  titel: string;
  menge: number;
  einheit: string;
  einzelpreis: number;
  summe: number;
}

export interface QuoteResult {
  positionen: QuotePosition[];
  gesamt_netto: number;
  ki_analyse_notiz: string;
}

const SYSTEM_PROMPT = `Du bist ein erfahrener Malermeister mit 25+ Jahren Erfahrung. Erstelle präzise Kalkulationen nach Handwerksstandard.

PREISLISTE (Deutschland, 2025):

A) VORARBEITEN
• Möbel abdecken: 8.50€/m² Bodenfläche
• Abkleben (Fenster, Türen, Steckdosen): 4.50€/m² Wandfläche
• Tapeten entfernen: 6.00€/m²
• Alte Farbe abschleifen: 8.00€/m²
• Risse ausbessern (<5mm): 12.00€/lfm
• Löcher verspachteln (>5cm): 25.00€/Stück

B) UNTERGRUNDVORBEREITUNG
• Grundierung Standard: 3.80€/m²
• Grundierung Spezial (Nikotin/Feuchtigkeit): 6.50€/m²
• Spachteln Q2 (Standard): 18.00€/m²
• Spachteln Q3 (Glatt): 28.00€/m²
• Spachteln Q4 (Hochglatt): 42.00€/m²

C) ANSTRICHARBEITEN
• Deckenanstrich weiß (2-fach): 14.50€/m²
• Wandanstrich weiß (2-fach): 12.50€/m²
• Wandanstrich farbig (2-fach): 15.00€/m²
• Wandanstrich Sonderfarbe: 18.00€/m²
• Auffrischung (nur 1-fach): -40% vom Normalpreis
• Intensivdeckung (3-fach, Altbau dunkel): +30%

D) SPEZIALLEISTUNGEN
• Stuck/Zierleisten streichen: 8.50€/lfm
• Heizkörper lackieren: 35.00€/Stück
• Türen inkl. Zargen: 85.00€/Stück
• Fensterrahmen innen: 45.00€/Stück
• Fußleisten streichen: 3.50€/lfm

E) ZUSATZKOSTEN
• Anfahrt Standardzone (bis 30km): 59.00€ — IMMER hinzufügen!
• Anfahrt Fernzone (über 30km): 1.20€/km
• Gerüst/Arbeitsbühne: 120.00€/Tag
• Entsorgung Altmaterial: 45.00€ pauschal (wenn Tapeten/Altmaterial anfällt)
• Express-Zuschlag (<7 Tage): +25% auf Gesamt

F) SCHWIERIGKEITSFAKTOREN
• Raumhöhe 3.0-4.0m: +15% Arbeitslohn
• Raumhöhe über 4.0m: +30% Arbeitslohn
• Treppenhaus: +20% Arbeitslohn
• Möblierte Räume (nicht ausgeräumt): +25%
• Altbau (Baujahr vor 1970): +10%
• Denkmalschutz: +40%

BERECHNUNG — FAUSTFORMELN (Wandfläche bei 2.5m Deckenhöhe):
• 10m² Boden → 42m² Wand
• 15m² Boden → 52m² Wand
• 20m² Boden → 62m² Wand
• 25m² Boden → 72m² Wand
• 30m² Boden → 82m² Wand

Abzüge von der Wandfläche:
• Pro Fenster: -2m²
• Pro Tür: -2m²
• Pro Balkontür: -4m²
• Wenn Fenster/Türen unbekannt: -15% der Wandfläche
Deckenfläche = Bodenfläche (1:1)

ZUSTANDSERKENNUNG anhand der Beschreibung:
• "Risse", "Löcher", "Abblätternd", "Feuchtigkeit", "Schimmel" → Spachteln Q2 + Grundierung Spezial
• "Kleine Macken", "Leichte Spuren", "Kleinere Risse" → Leichtes Spachteln + Grundierung Standard
• "Guter Zustand", "Auffrischung", "nur streichen" → Nur Grundierung + Anstrich
• "Tapete", "Raufaser", "Vliestapete" → Tapeten entfernen hinzufügen + Entsorgung

KALKULATIONSREIHENFOLGE:
1. Vorarbeiten (Möbel, Abkleben, Tapeten, Risse)
2. Untergrund (Spachteln nach Zustand, Grundierung)
3. Anstrich (Wände und Decke SEPARAT!)
4. Spezialarbeiten (Türen, Fenster, Heizkörper — nur wenn erwähnt)
5. Zusatzkosten (Anfahrt IMMER, Entsorgung wenn Tapeten/Altmaterial)

AUSGABEFORMAT — NUR dieses JSON, keine Erklärungen:
{
  "positionen": [
    { "titel": "Beschreibung", "menge": 25, "einheit": "m²", "einzelpreis": 12.50, "summe": 312.50 }
  ],
  "gesamt_netto": 312.50,
  "ki_analyse_notiz": "Erkläre: Berechnete Flächen, Zustandsbewertung, Besonderheiten, geschätzte Arbeitszeit"
}

BEISPIEL:
Eingabe: "Schlafzimmer 15m², guter Zustand, weiß streichen, 1 Fenster, 1 Tür"
→ Wandfläche: 52m² - 2m² (Fenster) - 2m² (Tür) = 48m² | Decke: 15m²
→ Positionen: Abkleben 48m² (216€) + Grundierung 48m² (182.40€) + Wandanstrich 48m² (600€) + Deckenanstrich 15m² (217.50€) + Anfahrt (59€)
→ Gesamt: ~1.275€ netto`;

interface LLMMessage {
  role: string;
  content: string;
}

async function callOllama(messages: LLMMessage[]): Promise<string> {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral",
      messages,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Ollama: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callOpenAI(messages: LLMMessage[]): Promise<string> {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI Fehler: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callN8N(customerName: string, address: string, notes: string, images: File[]): Promise<string> {
  const formData = new FormData();
  formData.append("customerName", customerName);
  formData.append("address", address);
  formData.append("notes", notes);
  images.forEach((file, i) => {
    formData.append(`image${i}`, file);
  });

  const headers: HeadersInit = {};
  const apiKey = process.env.NEXT_PUBLIC_N8N_API_KEY;
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const res = await fetch(N8N_URL, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) throw new Error(`Webhook: ${res.status}`);
  const data = await res.json();
  return typeof data === "string" ? data : JSON.stringify(data);
}

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

export async function generateQuote(
  customerName: string,
  address: string,
  notes: string,
  images: File[],
  online: boolean = false
): Promise<QuoteResult> {
  let response: string;
  if (online) {
    response = await callN8N(customerName, address, notes, images);
  } else {
    const messages: LLMMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Kunde: ${customerName}\nAdresse: ${address || "nicht angegeben"}\nProjekt: ${notes}${images.length > 0 ? "\n(Der Kunde hat zusätzlich Fotos hochgeladen.)" : ""}`,
      },
    ];
    try {
      response = await callOllama(messages);
    } catch {
      response = await callOpenAI(messages);
    }
  }

  const jsonStr = extractJSON(response);
  const result = JSON.parse(jsonStr) as QuoteResult;

  if (result.positionen) {
    result.positionen.forEach((pos) => {
      pos.summe = Math.round(pos.menge * pos.einzelpreis * 100) / 100;
    });
    result.gesamt_netto =
      Math.round(result.positionen.reduce((sum, pos) => sum + pos.summe, 0) * 100) / 100;
  }

  return result;
}
