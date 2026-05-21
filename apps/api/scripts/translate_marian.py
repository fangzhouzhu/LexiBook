import json
import os
import sys

from transformers import MarianMTModel, MarianTokenizer


def load_inputs():
    if len(sys.argv) < 2:
        return []
    try:
        payload = json.loads(sys.argv[1])
    except json.JSONDecodeError:
        return []
    if not isinstance(payload, list):
        return []
    return [str(item).strip() for item in payload]


def main():
    model_name = os.getenv("MARIAN_MODEL_NAME", "Helsinki-NLP/opus-mt-en-zh")
    tokenizer = MarianTokenizer.from_pretrained(model_name)
    model = MarianMTModel.from_pretrained(model_name)

    def translate_batch(texts):
        if not texts:
            return []
        batch = tokenizer(texts, return_tensors="pt", padding=True, truncation=True)
        generated = model.generate(**batch, max_new_tokens=256)
        return tokenizer.batch_decode(generated, skip_special_tokens=True)

    if len(sys.argv) > 1 and sys.argv[1] == "--worker":
        for raw_line in sys.stdin:
          line = raw_line.strip()
          if not line:
              continue
          try:
              payload = json.loads(line)
              request_id = str(payload.get("id", ""))
              texts = [str(item).strip() for item in payload.get("texts", [])]
              translations = translate_batch(texts)
              sys.stdout.write(json.dumps({"id": request_id, "translations": translations}, ensure_ascii=False) + "\n")
              sys.stdout.flush()
          except Exception as exc:
              sys.stdout.write(json.dumps({"id": payload.get("id", ""), "translations": [], "error": str(exc)}, ensure_ascii=False) + "\n")
              sys.stdout.flush()
        return

    texts = load_inputs()
    print(json.dumps(translate_batch(texts), ensure_ascii=False))


if __name__ == "__main__":
    main()
