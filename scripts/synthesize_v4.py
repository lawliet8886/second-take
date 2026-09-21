"""Offline Kokoro narration; requires the existing local model/voice cache."""
import argparse
import json
import os
from pathlib import Path

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

import numpy as np
import soundfile as sf
from kokoro import KPipeline

parser = argparse.ArgumentParser()
parser.add_argument("--manifest", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
rows = []
for index, row in enumerate(json.loads(args.manifest.read_text(encoding="utf-8"))["segments"]):
    audio = np.concatenate([a for _, _, a in pipeline(row["text"], voice="af_heart", speed=1.03)])
    sf.write(args.output / f"voice-{index:02}.wav", audio, 24000)
    rows.append({"index": index, "seconds": len(audio) / 24000, "text": row["text"]})
    print(f"voice_segment={index + 1} seconds={rows[-1]['seconds']:.2f}", flush=True)
(args.output / "voice-timing.json").write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
