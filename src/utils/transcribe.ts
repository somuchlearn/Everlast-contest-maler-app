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
    transcriber = await pipeline("automatic-speech-recognition", "openai/whisper-small", {
      device: "webgpu",
    });
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
