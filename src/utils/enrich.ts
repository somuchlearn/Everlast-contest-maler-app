const OLLAMA_URL = "http://localhost:11434/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

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

const SYSTEM_PROMPT = `Du bist ein erfahrener Malermeister und Kalkulationsexperte.
Erstelle aus einer Projektbeschreibung einen strukturierten Angebot.

Antworte NUR mit einem gültigen JSON-Objekt in diesem Format:
{
  "positionen": [
    { "titel": "Beschreibung", "menge": 25, "einheit": "m²", "einzelpreis": 12.50, "summe": 312.50 }
  ],
  "gesamt_netto": 312.50,
  "ki_analyse_notiz": "Hinweise zur Kalkulation"
}

Richtwerte (€/m²):
- Wände 1 Anstriche: 8-12
- Wände 2 Anstriche: 12-18
- Decke streichen: 10-16
- Lackieren (Holz): 15-25
- Tapeten entfernen: 5-8
- Risse ausbessern: 20-40 €/Stk
- Grundierung: 6-10

Berechne Mengen aus den gegebenen Raummaßen. Antworte NUR mit dem JSON, keine weitere Erklärung.`;

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

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}

export async function generateQuote(
  customerName: string,
  address: string,
  notes: string,
  hasImages: boolean
): Promise<QuoteResult> {
  const messages: LLMMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Kunde: ${customerName}\nAdresse: ${address || "nicht angegeben"}\nProjekt: ${notes}${hasImages ? "\n(Der Kunde hat zusätzlich Fotos hochgeladen.)" : ""}`,
    },
  ];

  let response: string;
  try {
    response = await callOllama(messages);
  } catch {
    response = await callOpenAI(messages);
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
