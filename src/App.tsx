'use client';

import { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import { initTranscriber, transcribeAudio, transcribeOnline, isTranscriberReady } from "./utils/transcribe";
import { generateQuote } from "./utils/enrich";

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [angebot, setAngebot] = useState<any>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [address, setAddress] = useState("");
    const [notes, setNotes] = useState("");
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
    const [processingStep, setProcessingStep] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "error">("loading");
    const [isOnline, setIsOnline] = useState(true);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const isRecordingRef = useRef(false);
    const isOnlineRef = useRef(true);
    const modelStatusRef = useRef<"loading" | "ready" | "error">("loading");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processingSteps = [
        { icon: "🔍", title: "Analyse läuft", sub: "Projektdaten werden ausgewertet..." },
        { icon: "🤖", title: "KI verarbeitet", sub: isOnline ? "Cloud-Modell arbeitet..." : "Lokales Modell arbeitet..." },
        { icon: "📊", title: "Kalkulation", sub: "Preise werden berechnet..." },
        { icon: "✨", title: "Finalisierung", sub: "Angebot wird zusammengestellt..." }
    ];

    useEffect(() => { isOnlineRef.current = isOnline; }, [isOnline]);
    useEffect(() => { modelStatusRef.current = modelStatus; }, [modelStatus]);

    useEffect(() => {
        if (isOnline) return;
        initTranscriber()
            .then(() => setModelStatus(isTranscriberReady() ? "ready" : "error"))
            .catch(() => setModelStatus("error"));
    }, [isOnline]);

    useEffect(() => {
        let unlisten: (() => void) | undefined;
        (async () => {
            try {
                const { listen } = await import("@tauri-apps/api/event");
                unlisten = await listen("shortcut-pressed", () => {
                    if (isRecordingRef.current) stopRecording();
                    else startRecording();
                });
            } catch (e) { console.error("Hotkey error:", e); }
        })();
        return () => { unlisten?.(); };
    }, []);

    useEffect(() => {
        if (isProcessing) {
            const interval = setInterval(() => {
                setProcessingStep(prev => (prev + 1) % processingSteps.length);
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [isProcessing]);

    const handleMediaUpload = (files: FileList | null) => {
        if (!files) return;
        const newFiles = Array.from(files);
        setMediaFiles(prev => [...prev, ...newFiles]);
        newFiles.forEach(file => {
            setMediaPreviews(prev => [...prev, URL.createObjectURL(file)]);
        });
    };

    const removeMedia = (index: number) => {
        URL.revokeObjectURL(mediaPreviews[index]);
        setMediaFiles(prev => prev.filter((_, i) => i !== index));
        setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const startRecording = async () => {
        if (isProcessing) return;
        if (!isOnlineRef.current && modelStatusRef.current !== "ready") { setStatus("Modell wird noch geladen..."); return; }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100, channelCount: 1 }
            });

            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/mp4';

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

            mediaRecorder.onstop = async () => {
                setStatus("Transkribiere...");
                const audioBlob = new Blob(chunksRef.current, { type: mimeType });
                if (audioBlob.size < 10000) { setStatus("Aufnahme zu kurz"); return; }

                try {
                    const text = isOnlineRef.current
                        ? await transcribeOnline(audioBlob)
                        : await transcribeAudio(audioBlob);
                    if (!text || text.trim().length < 3) {
                        setStatus("Keine Sprache erkannt"); return;
                    }
                    setTranscript(text);
                    setNotes(prev => prev ? `${prev}\n\n${text}` : text);
                    setStatus("");
                } catch (e) { setStatus((e as Error).message || "Transkription fehlgeschlagen"); }
            };

            mediaRecorder.start(250);
            setIsRecording(true);
            isRecordingRef.current = true;
            setStatus("");
        } catch { setStatus("Mikrofon nicht verfügbar"); }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        isRecordingRef.current = false;
    };

    const submitAngebot = async () => {
        if (!customerName.trim()) { setStatus("Kundenname erforderlich"); return; }
        if (!notes.trim()) { setStatus("Beschreibung erforderlich"); return; }

        setIsProcessing(true);
        setProcessingStep(0);
        setStatus("");

        try {
            const result = await generateQuote(customerName, address, notes, mediaFiles, isOnline);
            setAngebot(result);
        } catch (e) { setStatus((e as Error).message); }
        setIsProcessing(false);
    };

    const resetForm = () => {
        mediaPreviews.forEach(url => URL.revokeObjectURL(url));
        setCustomerName(""); setAddress(""); setNotes(""); setTranscript("");
        setMediaFiles([]); setMediaPreviews([]); setAngebot(null); setStatus("");
    };

    const netto = angebot?.gesamt_netto || 0;
    const brutto = netto * 1.19;

    const exportPDF = () => {
        if (!angebot?.positionen) return;
        const doc = new jsPDF();
        const pw = doc.internal.pageSize.getWidth();
        let y = 25;

        doc.setFontSize(28);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 41, 59);
        doc.text("ANGEBOT", 20, y);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }), pw - 20, y, { align: "right" });

        y += 20;
        doc.setDrawColor(226, 232, 240);
        doc.line(20, y, pw - 20, y);

        y += 15;
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        doc.text("Kunde", 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(customerName, 60, y);

        if (address) {
            y += 8;
            doc.setFont("helvetica", "bold");
            doc.text("Adresse", 20, y);
            doc.setFont("helvetica", "normal");
            doc.text(address, 60, y);
        }

        y += 20;
        doc.setFillColor(248, 250, 252);
        doc.rect(20, y - 5, pw - 40, 12, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(71, 85, 105);
        doc.text("POSITION", 25, y + 3);
        doc.text("MENGE", 110, y + 3);
        doc.text("PREIS", 140, y + 3);
        doc.text("SUMME", pw - 25, y + 3, { align: "right" });

        y += 15;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59);

        angebot.positionen.forEach((pos: any) => {
            if (y > 260) { doc.addPage(); y = 25; }
            doc.setFontSize(10);
            doc.text((pos.titel || "–").substring(0, 40), 25, y);
            doc.setTextColor(100, 116, 139);
            doc.text(`${pos.menge} ${pos.einheit}`, 110, y);
            doc.text(`${pos.einzelpreis?.toFixed(2)} €`, 140, y);
            doc.setTextColor(30, 41, 59);
            doc.setFont("helvetica", "bold");
            doc.text(`${pos.summe?.toFixed(2)} €`, pw - 25, y, { align: "right" });
            doc.setFont("helvetica", "normal");
            y += 10;
        });

        y += 10;
        doc.setDrawColor(226, 232, 240);
        doc.line(100, y, pw - 20, y);

        y += 12;
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("Netto", 140, y);
        doc.setTextColor(30, 41, 59);
        doc.text(`${netto.toFixed(2)} €`, pw - 25, y, { align: "right" });

        y += 8;
        doc.setTextColor(100, 116, 139);
        doc.text("MwSt. 19%", 140, y);
        doc.setTextColor(30, 41, 59);
        doc.text(`${(netto * 0.19).toFixed(2)} €`, pw - 25, y, { align: "right" });

        y += 12;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Gesamt", 140, y);
        doc.setTextColor(37, 99, 235);
        doc.text(`${brutto.toFixed(2)} €`, pw - 25, y, { align: "right" });

        if (angebot.ki_analyse_notiz) {
            y += 25;
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(71, 85, 105);
            doc.text("KALKULATIONSHINWEISE", 20, y);
            y += 8;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 116, 139);
            const lines = doc.splitTextToSize(angebot.ki_analyse_notiz, pw - 45);
            doc.text(lines, 20, y);
        }

        const pages = doc.internal.pages.length - 1;
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(180);
            doc.text(`PaintVoice AI  •  Seite ${i} von ${pages}`, pw / 2, 287, { align: "center" });
        }

        doc.save(`Angebot_${customerName.replace(/\s+/g, "-")}_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                
                *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
                
                :root {
                    --bg-primary: #09090b;
                    --bg-secondary: #18181b;
                    --bg-tertiary: #27272a;
                    --border: #3f3f46;
                    --border-light: #52525b;
                    --text-primary: #fafafa;
                    --text-secondary: #a1a1aa;
                    --text-tertiary: #71717a;
                    --accent: #3b82f6;
                    --accent-hover: #2563eb;
                    --success: #22c55e;
                    --warning: #eab308;
                    --error: #ef4444;
                    --gradient-1: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                    --gradient-2: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
                    --shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
                    --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
                    --shadow-lg: 0 12px 40px rgba(0,0,0,0.5);
                    --radius-sm: 6px;
                    --radius-md: 10px;
                    --radius-lg: 16px;
                    --radius-xl: 24px;
                }

                body { 
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    line-height: 1.5;
                    -webkit-font-smoothing: antialiased;
                }

                .app {
                    min-height: 100vh;
                    background: var(--bg-primary);
                }

                .container {
                    max-width: 720px;
                    margin: 0 auto;
                    padding: 0 24px;
                }

                /* Header */
                .header {
                    padding: 20px 0;
                    border-bottom: 1px solid var(--border);
                    background: rgba(9, 9, 11, 0.8);
                    backdrop-filter: blur(12px);
                    position: sticky;
                    top: 0;
                    z-index: 50;
                }

                .header-content {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .logo {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }

                .logo-icon {
                    width: 44px;
                    height: 44px;
                    object-fit: contain;
                }

                .logo-text h1 {
                    font-size: 18px;
                    font-weight: 700;
                    letter-spacing: -0.02em;
                }

                .logo-text span {
                    color: var(--accent);
                }

                .logo-text p {
                    font-size: 12px;
                    color: var(--text-tertiary);
                    font-weight: 500;
                }

                .kbd {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 10px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-sm);
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    font-family: 'SF Mono', Monaco, monospace;
                }

                /* Mode Toggle */
                .mode-toggle {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    padding: 5px 10px;
                    border-radius: var(--radius-sm);
                    transition: background 0.2s;
                    user-select: none;
                }

                .mode-toggle:hover {
                    background: var(--bg-tertiary);
                }

                .mode-icon {
                    font-size: 14px;
                    opacity: 0.35;
                    transition: opacity 0.2s;
                }

                .mode-icon.active {
                    opacity: 1;
                }

                .toggle-track {
                    position: relative;
                    width: 44px;
                    height: 24px;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    transition: background 0.3s, border-color 0.3s;
                }

                .toggle-track.online {
                    background: var(--accent);
                    border-color: var(--accent);
                }

                .toggle-knob {
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 18px;
                    height: 18px;
                    background: white;
                    border-radius: 50%;
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                }

                .toggle-track.online .toggle-knob {
                    transform: translateX(20px);
                }

                /* Main Content */
                .main {
                    padding: 40px 0 80px;
                }

                /* Card */
                .card {
                    background: rgba(24, 24, 27, 0.72);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    border: 1px solid rgba(63, 63, 70, 0.5);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    margin-bottom: 24px;
                    transition: border-color 0.3s;
                }


                .card-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .card-header h2 {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .card-header-icon {
                    width: 32px;
                    height: 32px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-sm);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                }

                .card-body {
                    padding: 24px;
                }

                /* Form */
                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .form-group.full {
                    grid-column: 1 / -1;
                }

                .label {
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .label-badge {
                    font-size: 10px;
                    padding: 2px 6px;
                    background: rgba(59, 130, 246, 0.15);
                    color: var(--accent);
                    border-radius: 4px;
                    font-weight: 600;
                }

                .input {
                    padding: 12px 14px;
                    background: var(--bg-primary);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-md);
                    color: var(--text-primary);
                    font-size: 14px;
                    font-family: inherit;
                    transition: all 0.2s;
                    outline: none;
                }

                .input:hover {
                    border-color: var(--border-light);
                }

                .input:focus {
                    border-color: var(--accent);
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
                }

                .input::placeholder {
                    color: var(--text-tertiary);
                }

                textarea.input {
                    resize: vertical;
                    min-height: 120px;
                }

                /* Upload Zone */
                .upload-zone {
                    border: 2px dashed var(--border);
                    border-radius: var(--radius-md);
                    padding: 32px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: var(--bg-primary);
                }

                .upload-zone:hover, .upload-zone.drag-over {
                    border-color: var(--accent);
                    background: rgba(59, 130, 246, 0.05);
                }

                .upload-icon {
                    width: 48px;
                    height: 48px;
                    margin: 0 auto 16px;
                    background: var(--bg-tertiary);
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                }

                .upload-zone h3 {
                    font-size: 14px;
                    font-weight: 600;
                    margin-bottom: 4px;
                }

                .upload-zone p {
                    font-size: 12px;
                    color: var(--text-tertiary);
                }

                .offline-hint {
                    padding: 16px;
                    border: 1px dashed var(--border);
                    border-radius: var(--radius-md);
                    color: var(--text-tertiary);
                    font-size: 13px;
                    text-align: center;
                    background: var(--bg-primary);
                }

                /* Media Previews */
                .media-grid {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                    margin-top: 16px;
                }

                .media-item {
                    position: relative;
                    width: 72px;
                    height: 72px;
                    border-radius: var(--radius-sm);
                    overflow: hidden;
                    border: 1px solid var(--border);
                }

                .media-item img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .media-remove {
                    position: absolute;
                    top: -6px;
                    right: -6px;
                    width: 20px;
                    height: 20px;
                    background: var(--error);
                    border: 2px solid var(--bg-secondary);
                    border-radius: 50%;
                    color: white;
                    font-size: 10px;
                    font-weight: 700;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.15s;
                }

                .media-remove:hover {
                    transform: scale(1.1);
                }

                /* Record Button */
                .record-section {
                    margin-bottom: 24px;
                }

                .record-btn {
                    width: 100%;
                    padding: 16px;
                    background: var(--bg-tertiary);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-md);
                    color: var(--text-primary);
                    font-size: 14px;
                    font-weight: 600;
                    font-family: inherit;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.2s;
                }

                .record-btn:hover {
                    background: var(--border);
                }

                .record-btn.recording {
                    background: rgba(239, 68, 68, 0.15);
                    border-color: var(--error);
                    color: var(--error);
                }

                .record-dot {
                    width: 8px;
                    height: 8px;
                    background: var(--error);
                    border-radius: 50%;
                    animation: pulse 1.5s infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                }

                .transcript-box {
                    margin-top: 12px;
                    padding: 12px 14px;
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid rgba(34, 197, 94, 0.2);
                    border-radius: var(--radius-sm);
                    font-size: 13px;
                    color: var(--success);
                }

                /* Status */
                .status {
                    padding: 12px 14px;
                    border-radius: var(--radius-sm);
                    font-size: 13px;
                    font-weight: 500;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .status.error {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    color: var(--error);
                }

                .status.warning {
                    background: rgba(234, 179, 8, 0.1);
                    border: 1px solid rgba(234, 179, 8, 0.2);
                    color: var(--warning);
                }

                /* Submit Button */
                .submit-btn {
                    width: 100%;
                    padding: 16px 24px;
                    background: var(--gradient-1);
                    border: none;
                    border-radius: var(--radius-md);
                    color: white;
                    font-size: 15px;
                    font-weight: 600;
                    font-family: inherit;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.2s;
                }

                .submit-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                }

                .submit-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* Processing Overlay */
                .processing-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(9, 9, 11, 0.95);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                }

                .processing-content {
                    text-align: center;
                    animation: fadeInUp 0.4s ease;
                }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .processing-icon {
                    font-size: 56px;
                    margin-bottom: 24px;
                    animation: float 2s ease-in-out infinite;
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }

                .processing-content h3 {
                    font-size: 20px;
                    font-weight: 600;
                    margin-bottom: 6px;
                }

                .processing-content p {
                    font-size: 14px;
                    color: var(--text-tertiary);
                    margin-bottom: 32px;
                }

                .progress-track {
                    width: 200px;
                    height: 4px;
                    background: var(--bg-tertiary);
                    border-radius: 2px;
                    margin: 0 auto;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    width: 40%;
                    background: var(--gradient-1);
                    border-radius: 2px;
                    animation: progress 1.5s ease-in-out infinite;
                }

                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(350%); }
                }

                /* Result Card */
                .result-card {
                    animation: slideUp 0.5s ease;
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .result-header {
                    padding: 20px 24px;
                    background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%);
                    border-bottom: 1px solid rgba(34, 197, 94, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .result-header h2 {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--success);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .result-actions {
                    display: flex;
                    gap: 8px;
                }

                .btn-ghost {
                    padding: 8px 14px;
                    background: transparent;
                    border: 1px solid var(--border);
                    border-radius: var(--radius-sm);
                    color: var(--text-secondary);
                    font-size: 13px;
                    font-weight: 500;
                    font-family: inherit;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.15s;
                }

                .btn-ghost:hover {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                }

                /* Stats Grid */
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin-bottom: 24px;
                }

                .stat-card {
                    padding: 16px;
                    background: rgba(9, 9, 11, 0.6);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(63, 63, 70, 0.4);
                    border-radius: var(--radius-md);
                    text-align: center;
                }

                .stat-label {
                    font-size: 10px;
                    font-weight: 600;
                    color: var(--text-tertiary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 6px;
                }

                .stat-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .stat-value.accent { color: var(--accent); }
                .stat-value.success { color: var(--success); }
                .stat-value.warning { color: var(--warning); }

                /* Table */
                .table-wrapper {
                    overflow-x: auto;
                    margin-bottom: 24px;
                }

                .table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .table th {
                    padding: 12px 16px;
                    font-size: 10px;
                    font-weight: 600;
                    color: var(--text-tertiary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    text-align: left;
                    background: var(--bg-primary);
                    border-bottom: 1px solid var(--border);
                }

                .table th:last-child { text-align: right; }

                .table td {
                    padding: 14px 16px;
                    font-size: 13px;
                    border-bottom: 1px solid var(--border);
                }

                .table td:last-child {
                    text-align: right;
                    font-weight: 600;
                }

                .table tr:last-child td { border-bottom: none; }

                .table tr:hover td { background: rgba(255,255,255,0.02); }

                /* AI Note */
                .ai-note {
                    padding: 16px;
                    background: rgba(99, 102, 241, 0.1);
                    border: 1px solid rgba(99, 102, 241, 0.2);
                    border-radius: var(--radius-md);
                }

                .ai-note-header {
                    font-size: 10px;
                    font-weight: 600;
                    color: #818cf8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .ai-note p {
                    font-size: 13px;
                    color: var(--text-secondary);
                    line-height: 1.6;
                }

                @media (max-width: 640px) {
                    .form-grid { grid-template-columns: 1fr; }
                    .stats-grid { grid-template-columns: 1fr; }
                    .header-content { flex-direction: column; gap: 16px; }
                }
            `}</style>

            <div className="app">
                {isProcessing && (
                    <div className="processing-overlay">
                        <div className="processing-content">
                            <div className="processing-icon">{processingSteps[processingStep].icon}</div>
                            <h3>{processingSteps[processingStep].title}</h3>
                            <p>{processingSteps[processingStep].sub}</p>
                            <div className="progress-track">
                                <div className="progress-fill" />
                            </div>
                        </div>
                    </div>
                )}

                <header className="header">
                    <div className="container">
                        <div className="header-content">
                            <div className="logo">
                                <img src="/logo.svg" className="logo-icon" alt="" />
                                <div className="logo-text">
                                    <h1>PaintVoice <span>AI</span></h1>
                                    <p>Intelligente Angebotserstellung</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="mode-toggle" onClick={() => setIsOnline(!isOnline)}>
                                    <span className={`mode-icon ${!isOnline ? 'active' : ''}`}>🖥️</span>
                                    <div className={`toggle-track ${isOnline ? 'online' : ''}`}>
                                        <div className="toggle-knob" />
                                    </div>
                                    <span className={`mode-icon ${isOnline ? 'active' : ''}`}>☁️</span>
                                </div>
                                <div className="kbd">
                                    <span>⌘</span>
                                    <span>⇧</span>
                                    <span>R</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="main">
                    <div className="container">
                        {!angebot ? (
                            <div className="card">
                                <div className="card-header">
                                    <h2>
                                        <div className="card-header-icon">📋</div>
                                        Neues Angebot
                                    </h2>
                                </div>
                                <div className="card-body">
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="label">Kundenname</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={customerName}
                                                onChange={e => setCustomerName(e.target.value)}
                                                placeholder="Schmidt GmbH"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="label">Adresse</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={address}
                                                onChange={e => setAddress(e.target.value)}
                                                placeholder="Musterstraße 1, Hamburg"
                                            />
                                        </div>
                                        <div className="form-group full">
                                            <label className="label">
                                                Medien
                                                {isOnline && <span className="label-badge">KI-Analyse</span>}
                                            </label>
                                            {isOnline ? (
                                                <>
                                                    <div
                                                        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                                                        onClick={() => fileInputRef.current?.click()}
                                                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                                        onDragLeave={() => setDragOver(false)}
                                                        onDrop={e => { e.preventDefault(); setDragOver(false); handleMediaUpload(e.dataTransfer.files); }}
                                                    >
                                                        <div className="upload-icon">📁</div>
                                                        <h3>Dateien hochladen</h3>
                                                        <p>Fotos werden von KI analysiert für präzisere Kalkulation</p>
                                                    </div>
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        multiple
                                                        accept="image/*"
                                                        style={{ display: 'none' }}
                                                        onChange={e => handleMediaUpload(e.target.files)}
                                                    />
                                                    {mediaPreviews.length > 0 && (
                                                        <div className="media-grid">
                                                            {mediaPreviews.map((p, i) => (
                                                                <div key={i} className="media-item">
                                                                    <img src={p} alt="" />
                                                                    <button className="media-remove" onClick={() => removeMedia(i)}>×</button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="offline-hint">
                                                    📸 Bildanalyse verfügbar im Online-Modus
                                                </div>
                                            )}
                                        </div>
                                        <div className="form-group full record-section">
                                            <label className="label">
                                                Sprachaufnahme
                                                {isOnline && <span className="label-badge">☁️ Cloud</span>}
                                                {!isOnline && modelStatus === "loading" && <span className="label-badge" style={{ background: 'rgba(234, 179, 8, 0.15)', color: 'var(--warning)' }}>⏳ Lädt...</span>}
                                                {!isOnline && modelStatus === "error" && <span className="label-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)' }}>⚠️ Fehler</span>}
                                            </label>
                                            <button
                                                className={`record-btn ${isRecording ? 'recording' : ''}`}
                                                onClick={isRecording ? stopRecording : startRecording}
                                            >
                                                {isRecording ? (
                                                    <>
                                                        <span className="record-dot" />
                                                        Aufnahme stoppen
                                                    </>
                                                ) : (
                                                    <>🎙️ Aufnahme starten</>
                                                )}
                                            </button>
                                            {transcript && (
                                                <div className="transcript-box">
                                                    ✓ {transcript}
                                                </div>
                                            )}
                                        </div>
                                        <div className="form-group full">
                                            <label className="label">Projektbeschreibung</label>
                                            <textarea
                                                className="input"
                                                value={notes}
                                                onChange={e => setNotes(e.target.value)}
                                                placeholder="Wohnzimmer 25m², Wände und Decke streichen, Risse ausbessern..."
                                            />
                                        </div>
                                    </div>

                                    {status && (
                                        <div className={`status ${status.includes('fehl') || status.includes('nicht') ? 'error' : 'warning'}`}>
                                            ⚠️ {status}
                                        </div>
                                    )}

                                    <button
                                        className="submit-btn"
                                        onClick={submitAngebot}
                                        disabled={isProcessing || isRecording}
                                    >
                                        Angebot erstellen
                                        <span>→</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="card result-card">
                                <div className="result-header">
                                    <h2>✓ Angebot für {customerName}</h2>
                                    <div className="result-actions">
                                        <button className="btn-ghost" onClick={exportPDF}>
                                            📄 PDF
                                        </button>
                                        <button className="btn-ghost" onClick={resetForm}>
                                            ↺ Neu
                                        </button>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="stats-grid">
                                        <div className="stat-card">
                                            <div className="stat-label">Positionen</div>
                                            <div className="stat-value accent">{angebot.positionen?.length || 0}</div>
                                        </div>
                                        <div className="stat-card">
                                            <div className="stat-label">Netto</div>
                                            <div className="stat-value warning">{netto.toFixed(2)} €</div>
                                        </div>
                                        <div className="stat-card">
                                            <div className="stat-label">Brutto</div>
                                            <div className="stat-value success">{brutto.toFixed(2)} €</div>
                                        </div>
                                    </div>

                                    <div className="table-wrapper">
                                        <table className="table">
                                            <thead>
                                            <tr>
                                                <th>Position</th>
                                                <th>Menge</th>
                                                <th>Preis</th>
                                                <th>Summe</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {angebot.positionen?.map((pos: any, i: number) => (
                                                <tr key={i}>
                                                    <td>{pos.titel}</td>
                                                    <td style={{ color: 'var(--text-tertiary)' }}>{pos.menge} {pos.einheit}</td>
                                                    <td style={{ color: 'var(--text-tertiary)' }}>{pos.einzelpreis?.toFixed(2)} €</td>
                                                    <td>{pos.summe?.toFixed(2)} €</td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {angebot.ki_analyse_notiz && (
                                        <div className="ai-note">
                                            <div className="ai-note-header">
                                                🤖 KI-Analyse
                                            </div>
                                            <p>{angebot.ki_analyse_notiz}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}

export default App;