#!/usr/bin/env python3
import argparse
import os
import sys
import urllib.request
import json


def build_messages(user_input: str):
    messages = [
        {
            "role": "system",
            "content": (
                "You are a debugging assistant. Use only the provided input. "
                "Provide a short root cause, a clear explanation, and a minimal fix. "
                "Be concise."
            ),
        }
    ]
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

    messages = build_messages(user_input)

    try:
        result = request_chat(api_key, args.model, messages)
        print(result)
    except Exception as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
