// src/components/Recorder.jsx
import { useState, useRef, useEffect } from "react";
import { createDeepgramSocket } from "../services/deepgramService";

function Recorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [timer, setTimer] = useState(0);

  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const animationRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // --- Transcript & Word Count ---
  useEffect(() => {
    setWordCount(transcript.trim().split(/\s+/).filter(Boolean).length);
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // --- Timer ---
  const startTimer = () => {
    timerIntervalRef.current = setInterval(() => setTimer((prev) => prev + 1), 1000);
  };
  const stopTimer = () => {
    clearInterval(timerIntervalRef.current);
    setTimer(0);
  };
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // --- Waveform Drawing ---
  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const bufferLength = analyserRef.current.fftSize;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "#f0f4f8";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const maxAmplitude = Math.max(...dataArray.map((v) => Math.abs(v - 128)));
      const intensity = Math.min(1, maxAmplitude / 128);

      ctx.strokeStyle = isPaused
        ? "rgba(128,128,128,0.6)"
        : `rgba(76, 175, 80, ${0.3 + intensity * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    draw();
  };

  // --- Start Recording ---
  const startRecording = async () => {
    if (isRecording || isStarting) return;
    setIsStarting(true);
    setStatusMessage("🎧 Connecting...");

    try {
      setTranscript("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatusMessage("⚠️ Microphone not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio context for waveform
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      drawWaveform();

      // Connect Deepgram
      socketRef.current = createDeepgramSocket(
        (text) => setTranscript((prev) => prev + " " + text),
        (error) => {
          console.error(error);
          setStatusMessage("⚠️ Deepgram error: " + error);
          stopRecording();
        }
      );

      // Wait for WebSocket open
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject("WebSocket timeout"), 5000);
        socketRef.current.addEventListener("open", () => {
          clearTimeout(timeout);
          resolve();
        });
        socketRef.current.addEventListener("error", () => reject("WebSocket error"));
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current.ondataavailable = async (event) => {
        if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(await event.data.arrayBuffer());
        }
      };

      mediaRecorderRef.current.start(250);
      setIsRecording(true);
      setIsPaused(false);
      setStatusMessage("✅ Recording started!");
      startTimer();
    } catch (err) {
      console.error(err);
      setStatusMessage("⚠️ Could not start recording.");
    } finally {
      setIsStarting(false);
    }
  };

  // --- Pause / Resume ---
  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      setStatusMessage("⏸️ Recording paused");
      stopTimer();
    }
  };
  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      setStatusMessage("▶️ Recording resumed");
      startTimer();
    }
  };

  // --- Stop Recording ---
  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current.stop();

      if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.close();
      socketRef.current = null;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();

      setIsRecording(false);
      setIsPaused(false);
      setStatusMessage("✅ Recording stopped!");
      stopTimer();
    } catch (err) {
      console.error(err);
      setStatusMessage("⚠️ Error stopping recording.");
    }
  };

  // --- Transcript Actions ---
  const downloadTranscript = () => {
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcript.txt";
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage("💾 Transcript downloaded!");
  };
  const copyTranscript = () => {
    navigator.clipboard.writeText(transcript);
    setStatusMessage("📋 Transcript copied!");
  };
  const clearTranscript = () => {
    setTranscript("");
    setStatusMessage("🗑️ Transcript cleared!");
  };

  // --- Render ---
  return (
    <div style={styles.container}>
      <div style={styles.header}>🎙️ AI Voice to Text Recorder</div>

      <canvas
        ref={canvasRef}
        width="800"
        height="100"
        style={{
          borderRadius: 12,
          marginBottom: 20,
          background: "#fff",
          boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
        }}
      />

      <div style={styles.controls}>
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          disabled={isStarting}
          style={{
            ...styles.mainButton,
            background: isRecording ? "#e53935" : "linear-gradient(90deg,#4CAF50,#2E7D32)",
          }}
        >
          {isRecording ? "⏹️ Stop" : "🎤 Hold to Record"}
        </button>

        {isRecording && !isPaused && (
          <button onClick={pauseRecording} style={styles.secondaryButton}>
            ⏸️ Pause
          </button>
        )}
        {isPaused && (
          <button onClick={resumeRecording} style={styles.secondaryButton}>
            ▶️ Resume
          </button>
        )}

        <button onClick={downloadTranscript} style={styles.secondaryButton}>
          💾 Download
        </button>
        <button onClick={copyTranscript} style={styles.secondaryButton}>
          📋 Copy
        </button>
        <button onClick={clearTranscript} style={styles.secondaryButton}>
          🗑️ Clear
        </button>
      </div>

      <div style={styles.status}>
        {statusMessage} {isRecording && <>⏱️ {formatTime(timer)}</>}
      </div>

      <div style={styles.transcriptBox}>
        <h3 style={styles.transcriptHeader}>
          Transcript <span style={styles.wordCount}>Words: {wordCount}</span>
        </h3>
        <div style={styles.transcriptText}>
          {transcript || "Start speaking..."}
          <div ref={transcriptEndRef}></div>
        </div>
      </div>
    </div>
  );
}

// --- Styles ---
const styles = {
  container: {
    fontFamily: "Arial, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px",
    background: "#f0f4f8",
    minHeight: "100vh",
  },
  header: {
    background: "linear-gradient(90deg,#4CAF50,#2E7D32)",
    padding: "20px 40px",
    borderRadius: "15px",
    boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
    color: "white",
    fontSize: "28px",
    fontWeight: "bold",
    marginBottom: "30px",
  },
  controls: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "20px",
  },
  mainButton: {
    padding: "18px 40px",
    fontSize: "18px",
    borderRadius: "50px",
    border: "none",
    cursor: "pointer",
    color: "white",
    boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
    transition: "all 0.3s ease",
    flex: "1 1 200px",
  },
  secondaryButton: {
    padding: "12px 20px",
    borderRadius: "12px",
    border: "none",
    background: "#616161",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 3px 10px rgba(0,0,0,0.2)",
    transition: "all 0.2s ease",
  },
  status: { marginTop: 10, fontWeight: "bold", color: "#555" },
  transcriptBox: {
    marginTop: 30,
    width: "100%",
    maxWidth: "800px",
    padding: "20px",
    background: "#fff",
    borderRadius: "15px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
    minHeight: "200px",
    overflowY: "auto",
  },
  transcriptHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  wordCount: { background: "#4CAF50", color: "#fff", borderRadius: "12px", padding: "4px 12px", fontSize: "14px" },
  transcriptText: { whiteSpace: "pre-wrap", lineHeight: "1.6", fontSize: "16px", color: "#333" },
};

export default Recorder;
