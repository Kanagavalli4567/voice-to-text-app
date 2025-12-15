// src/services/deepgramService.js

/**
 * Create a Deepgram WebSocket with automatic reconnect and error handling.
 *
 * @param {Function} onTranscript - Called with each transcribed text chunk.
 * @param {Function} onError - Called on error messages.
 * @param {Object} options - Optional config: { reconnectAttempts, reconnectDelay }
 * @returns {WebSocket} - Active Deepgram WebSocket instance.
 */
export function createDeepgramSocket(onTranscript, onError, options = {}) {
  const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;

  if (!apiKey) {
    const error = "Deepgram API key missing. Add VITE_DEEPGRAM_API_KEY to .env";
    console.error(error);
    onError(error);
    return null;
  }

  const url = "wss://api.deepgram.com/v1/listen?model=general&punctuate=true";

  let socket = null;
  let reconnectAttempts = 0;
  const maxReconnect = options.reconnectAttempts || 5;
  const reconnectDelay = options.reconnectDelay || 3000;

  const connect = () => {
    socket = new WebSocket(url, ["token", apiKey]);
    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      console.log("✅ Deepgram WebSocket OPENED");
      reconnectAttempts = 0; // reset on successful connection
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "error") {
          onError(data.message);
          return;
        }
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        if (transcript) onTranscript(transcript);
      } catch (err) {
        console.error("Deepgram parse error:", err);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket ERROR:", err);
      onError("Deepgram connection failed. Check API key and network.");
    };

    socket.onclose = (event) => {
      console.warn(`WebSocket CLOSED: code=${event.code}, reason=${event.reason}`);
      if (reconnectAttempts < maxReconnect) {
        reconnectAttempts++;
        console.log(`Reconnecting in ${reconnectDelay / 1000}s... (${reconnectAttempts}/${maxReconnect})`);
        setTimeout(connect, reconnectDelay);
      } else {
        console.error("Max reconnect attempts reached. Could not reconnect to Deepgram.");
        onError("Deepgram connection closed permanently.");
      }
    };

    return socket;
  };

  return connect();
}
