# Fake Job Detector

A Chrome extension (Manifest V3) that analyzes the job posting on the current page and tells you how likely it is to be a scam. Everything runs **on-device** — no page text is ever sent anywhere.

## How it works

1. You click the extension icon on a job posting (select the description first for best accuracy; otherwise the page's main content is used).
2. The text is scored two ways:
   - **ML model** – TF-IDF + logistic regression trained on the [EMSCAD fake job postings dataset](https://www.kaggle.com/datasets/shivamb/real-or-fake-fake-jobposting-prediction) (~18k postings). Held-out results: 98% accuracy, fraud-class precision 0.77 / recall 0.90.
   - **Red-flag rules** – fees/deposits, gift-card or crypto payments, WhatsApp/Telegram contact, free-mail addresses, requests for SSN/bank details, guaranteed earnings, etc.
3. You get a verdict (legitimate / suspicious / likely fake), a risk score, and the list of triggered red flags.

This is a helper, not a guarantee — always verify the employer yourself.

## Install

1. Clone or download this repo.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the `extension/` folder.
4. Open a job posting, click the extension icon, then **Analyze this page**.

Works in Chrome, Edge, Brave and other Chromium browsers. It only reads the active tab when you click (`activeTab` + `scripting` permissions).

## Project structure

```
extension/            # Load this folder in Chrome
  manifest.json
  popup.html
  icons/
  model/model.json    # Exported model (vocab, idf, coefficients)
  src/
    classifier.js     # Tokenizer, model inference, red-flag rules
    popup.js          # Page text extraction + UI
    popup.css
training/
  train_model.py      # Trains the model and writes extension/model/model.json
  requirements.txt
  data/fake_job_postings.csv
```

## Retraining the model

```bash
pip install -r training/requirements.txt
python training/train_model.py
```

This prints a classification report and regenerates `extension/model/model.json`. The text cleaning in `train_model.py` and `tokenize()` in `classifier.js` must stay in sync.

## Limitations

- English postings only; trained on a dataset with ~5% fraudulent examples.
- Short or non-job text can give unreliable scores.
- Chrome blocks extensions on `chrome://` pages and the Chrome Web Store.
