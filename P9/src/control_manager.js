import { startRecording, stopRecording } from "./record_manager"

export function initControls() {
  // Manejo de eventos para iniciar/detener la grabación
  document.addEventListener("keydown", (event) => {
    if (event.key === "r") {
      if (recording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  });
}