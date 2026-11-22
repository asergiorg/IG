let recorder,
  stream,
  chunks = [];
let recording = false;

// Iniciar la grabación
export function startRecording() {
  if (!recording) {
    // Crear el stream desde el canvas
    stream = renderer.domElement.captureStream(30);
    recorder = new MediaRecorder(stream);

    recorder.ondataavailable = function (e) {
      chunks.push(e.data);
    };

    recorder.onstop = function () {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "threejs_video.webm";
      link.click();
    };

    recorder.start();
    recording = true;
    console.log("Grabación iniciada...");
  }
}

// Detener la grabación
export function stopRecording() {
  if (recording) {
    recorder.stop();
    recording = false;
    console.log("Grabación detenida...");
  }
}