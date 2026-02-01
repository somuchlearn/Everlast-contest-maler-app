let transcriber: any = null;
let loading = false;

export function isTranscriberReady(): boolean {
  return transcriber !== null;
}

export async function initTranscriber(): Promise<void> {
  if (transcriber || loading) return;
  loading = true;
  try {
    const { pipeline } = await import("@huggingface/transformers");
    transcriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-small");
  } catch (e) {
    console.error("Whisper init failed:", e);
    throw e;
  } finally {
    loading = false;
  }
}

async function resampleTo16kHz(audioBuffer: AudioBuffer): Promise<Float32Array> {
  if (audioBuffer.sampleRate === 16000 && audioBuffer.numberOfChannels === 1) {
    return audioBuffer.getChannelData(0);
  }
  const offlineContext = new OfflineAudioContext(
    1,
    Math.ceil((audioBuffer.length * 16000) / audioBuffer.sampleRate),
    16000
  );
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();
  const resampled = await offlineContext.startRendering();
  return resampled.getChannelData(0);
}

export async function transcribeOnline(audioBlob: Blob): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API-Key nicht konfiguriert");

  let ext = "mp4";
  if (audioBlob.type.includes("webm")) ext = "webm";
  else if (audioBlob.type.includes("mp4")) ext = "m4a";

  const formData = new FormData();
  formData.append("file", audioBlob, `audio.${ext}`);
  formData.append("model", "whisper-1");
  formData.append("language", "de");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Whisper API: ${res.status} ${detail}`);
  }
  const data = await res.json();
  return data.text;
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  if (!transcriber) await initTranscriber();
  if (!transcriber) throw new Error("Whisper nicht verfügbar");

  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = new AudioContext();
  const audioData = await audioContext.decodeAudioData(arrayBuffer);
  audioContext.close();

  const samples = await resampleTo16kHz(audioData);

  const result = await transcriber(samples, {
    language: "german",
    task: "transcribe",
  });

  return typeof result === "string" ? result : (result as any).text || "";
}
