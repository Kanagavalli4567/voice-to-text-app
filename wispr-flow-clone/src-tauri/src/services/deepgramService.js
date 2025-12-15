export function createDeepgramSocket(onTranscript, onError) {
  const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;

  const socket = new WebSocket(
    "wss://api.deepgram.com/v1/listen?model=nova&interim_results=true",
    ["token", apiKey]
  );

  socket.onopen = () => {
    console.log("✅ Deepgram connected");
  };

  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    const transcript =
      data.channel?.alternatives[0]?.transcript;

    if (transcript) {
      onTranscript(transcript);
    }
  };

  socket.onerror = (err) => {
    console.error("❌ Deepgram error", err);
    onError("Deepgram connection failed");
  };

  return socket;
}
