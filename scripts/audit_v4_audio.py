"""Local ASR spot-check of the rendered narration, not a human listening verdict."""
import argparse
import difflib
import json
import os
import re
from pathlib import Path

os.environ["HF_HUB_OFFLINE"] = "1"
from faster_whisper import WhisperModel

parser = argparse.ArgumentParser()
parser.add_argument("--model", type=Path, required=True)
parser.add_argument("--video", type=Path, required=True)
parser.add_argument("--manifest", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
model = WhisperModel(str(args.model), device="cpu", compute_type="int8", cpu_threads=4, local_files_only=True)
segments, info = model.transcribe(str(args.video), language="en", beam_size=5, vad_filter=True)
rows = [{"start": s.start, "end": s.end, "text": s.text.strip()} for s in segments]
observed = " ".join(s["text"] for s in rows)
expected = " ".join(s["text"] for s in json.loads(args.manifest.read_text(encoding="utf-8"))["segments"])
normalize = lambda text: re.findall(r"[a-z0-9]+", text.lower().replace("revenuecat", "revenue cat"))
a, b = normalize(expected), normalize(observed)
matcher = difflib.SequenceMatcher(None, a, b, autojunk=False)
differences = [{"kind": op, "expected": " ".join(a[i:j]), "observed": " ".join(b[k:l])} for op, i, j, k, l in matcher.get_opcodes() if op != "equal"]
result = {"method": "offline faster-whisper small int8, English, beam=5", "humanListening": False, "expectedWords": len(a), "observedWords": len(b), "sequenceMatchRatio": matcher.ratio(), "differences": differences, "transcript": rows}
args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps({key: value for key, value in result.items() if key != "transcript"}, indent=2), flush=True)
