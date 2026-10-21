"""Train a TF-IDF + logistic regression fake-job classifier and export it as JSON
so the browser extension can run it with no ML runtime.

Usage:  python training/train_model.py
Output: extension/model/model.json
"""
import json
import re
from pathlib import Path

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "training" / "data" / "fake_job_postings.csv"
OUT = ROOT / "extension" / "model" / "model.json"

TEXT_COLS = ["title", "company_profile", "description", "requirements", "benefits"]
MAX_FEATURES = 4000


def clean(text: str) -> str:
    # Must stay in sync with tokenize() in extension/src/classifier.js
    text = re.sub(r"https?://\S+|www\.\S+", " url ", text.lower())
    return re.sub(r"[^a-z0-9$@ ]+", " ", text)


def main() -> None:
    df = pd.read_csv(DATA)
    texts = df[TEXT_COLS].fillna("").agg(" ".join, axis=1).map(clean)
    y = df["fraudulent"].values

    x_tr, x_te, y_tr, y_te = train_test_split(
        texts, y, test_size=0.2, stratify=y, random_state=42
    )
    vec = TfidfVectorizer(
        max_features=MAX_FEATURES, stop_words="english", sublinear_tf=True,
        min_df=5, token_pattern=r"[a-z0-9$@]{2,}",
    )
    clf = LogisticRegression(C=4.0, class_weight="balanced", max_iter=1000)
    clf.fit(vec.fit_transform(x_tr), y_tr)
    print(classification_report(y_te, clf.predict(vec.transform(x_te)), digits=3))

    # Refit on everything for the shipped model.
    clf.fit(vec.fit_transform(texts), y)
    model = {
        "vocab": {t: int(i) for t, i in vec.vocabulary_.items()},
        "idf": [round(float(v), 4) for v in vec.idf_],
        "coef": [round(float(v), 4) for v in clf.coef_[0]],
        "intercept": round(float(clf.intercept_[0]), 4),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(model, separators=(",", ":")))
    print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
