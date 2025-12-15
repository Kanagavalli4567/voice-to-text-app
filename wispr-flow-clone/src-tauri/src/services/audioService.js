let mediaRecorder = null;

export async function getMicrophoneStream() {
  return await navigator.mediaDevices.getUserMedia({ audio: true });
}

export function startRecording(stream, onAudioChunk) {
  mediaRecorder = new MediaRecorder(stream, {
    mimeType: "audio/webm"
  });

  mediaRecorder.ondataavailable = async (event) => {
    if (event.data.size > 0) {
      const buffer = await event.data.arrayBuffer();
      onAudioChunk(buffer);
    }
  };

  mediaRecorder.start(250); // send audio every 250ms
}

export function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
}
