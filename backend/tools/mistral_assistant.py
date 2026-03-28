#!/usr/bin/env python3
import argparse
import json
import os
import sys
import urllib.request


def load_examples(path: str):
    if not path:
        return []
    if not os.path.exists(path):
        raise FileNotFoundError(f"Examples file not found: {path}")
    examples = []
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            if "user" in obj and "assistant" in obj:
                examples.append(obj)
    return examples


def build_messages(user_input: str, examples):
    messages = [
        {
            "role": "system",
            "content": (
                "You are a debugging assistant. Provide a short root cause, "
                "a clear explanation, and a minimal fix. Be concise."
            ),
        }
    ]

    for ex in examples:
        messages.append({"role": "user", "content": ex["user"]})
        messages.append({"role": "assistant", "content": ex["assistant"]})

    messages.append({"role": "user", "content": user_input})
    return messages


def request_chat(api_key: str, model: str, messages, temperature: float = 0.2):
    payload = {
        "model": model,
        "temperature": temperature,
        "messages": messages,
        "max_tokens": 800,
    }

    req = urllib.request.Request(
        "https://api.mistral.ai/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(req) as response:
        raw = response.read().decode("utf-8")
        data = json.loads(raw)
        return (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )


def main():
    parser = argparse.ArgumentParser(
        description="Local Mistral assistant for debugging errors."
    )
    parser.add_argument(
        "--input",
        help="Path to a file containing the error/trace (or omit to read stdin).",
    )
    parser.add_argument(
        "--examples",
        help="Optional JSONL file with {user, assistant} pairs for few-shot.",
    )
    parser.add_argument(
        "--model",
        default=os.getenv("MISTRAL_MODEL", "mistral-large-latest"),
        help="Mistral model name (default: mistral-large-latest).",
    )
    args = parser.parse_args()

    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        print("MISTRAL_API_KEY is not set.", file=sys.stderr)
        sys.exit(1)

    if args.input:
        with open(args.input, "r", encoding="utf-8") as handle:
            user_input = handle.read().strip()
    else:
        user_input = sys.stdin.read().strip()

    if not user_input:
        print("No input provided.", file=sys.stderr)
        sys.exit(1)

    examples = load_examples(args.examples) if args.examples else []
    messages = build_messages(user_input, examples)

    try:
        result = request_chat(api_key, args.model, messages)
        print(result)
    except Exception as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
