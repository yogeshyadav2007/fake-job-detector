const worker = new Worker(chrome.runtime.getURL("tfWorker.js"));

worker.onmessage = function (event) {
  const prediction = event.data;
  alert(`Prediction: ${prediction > 0.5 ? "Fake" : "Legit"} job`);
};

const jobText = document.body.innerText.slice(0, 1000);
worker.postMessage(jobText);
