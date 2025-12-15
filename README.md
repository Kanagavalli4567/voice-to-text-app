# voice-to-text-app
Project Overview
This project is a cross-platform desktop voice-to-text application inspired by Wispr Flow.It allows users to record their voice and get real-time transcription using the Deepgram AI speech-to-text API.The focus of this project is on functionality, fast transcription, and a clean architecture rather than pixel-perfect UI.
Tech Stack
**Frontend:** React + JSX
**Desktop Framework:** Tauri (Windows, macOS, Linux)
**Audio & Microphone Handling**: MediaRecorder API
**Speech Recognition / AI:** Deepgram Real-Time API
**State Management:** React useState (simple local state)
Features
- **Push-to-Talk Voice Input**: Press and hold to record, release to stop. Provides an intuitive way to capture voice input.
- **Microphone Access & Audio Capture**: Requests system permissions and captures high-quality audio safely.
- **Real-Time Transcription**: Streams audio to Deepgram and displays the transcription instantly with minimal latency.
- **Waveform Visualization**: Dynamic waveform that shows audio intensity and reflects paused/resumed state.
- **Recording Controls**: Start/Stop, Pause/Resume recording with clear visual feedback.
- **Timer**: Displays recording duration in minutes and seconds, automatically pauses/resumes with recording state.
- **Transcript Display**: Live transcript display with automatic scrolling as new text is received.
- **Word Count**: Tracks and displays the number of words in the transcript dynamically.
- **Transcript Actions**: Copy to clipboard, download as `.txt`, and clear transcript functionality.
- **Error Handling & Status Messages**: Graceful handling of microphone permission errors, network issues, and Deepgram API errors. Status messages provide feedback instead of intrusive alerts.
- **Robust Deepgram Integration**: Automatic reconnection on WebSocket failure, centralized error handling, and logging for reliability.
- **Cross-Platform Desktop Support**: Built with Tauri to run on Windows, macOS, and Linux with lightweight performance.
Setup Instructions
1. Clone the repo: `git clone https://github.com/username/voice-to-text-app.git`
2. Navigate to the folder: `cd voice-to-text-app`
3. Install dependencies: `npm install`
4. Start the app: `npm run dev`
