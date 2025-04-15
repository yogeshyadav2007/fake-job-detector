importScripts("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js");

let model;

async function loadModel() {
  if (!model) {
    model = await tf.loadLayersModel("model_js/model.json");
  }
}

self.onmessage = async (e) => {
  const jobText = e.data;
  await loadModel();

  const vector = textToVector(jobText);
  const prediction = model.predict(tf.tensor2d([vector]));
  const result = await prediction.data();

  self.postMessage(result[0]);
};

function textToVector(text) {
  return Array.from({ length: 10 }, (_, i) => (text.charCodeAt(i) || 0) / 255);
}
