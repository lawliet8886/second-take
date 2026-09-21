"""Offline Kokoro narration; requires the existing local model/voice cache."""
import argparse
import json
import os
import shutil
from pathlib import Path

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

import numpy as np
import soundfile as sf
from kokoro import KPipeline

parser = argparse.ArgumentParser()
parser.add_argument("--manifest", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
parser.add_argument("--reuse-work", type=Path, help="Reuse exact matching narration WAVs from a previous local render")
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
pipeline = None
reusable = {}
if args.reuse_work:
    prior = json.loads((args.reuse_work / "voice-timing.json").read_text(encoding="utf-8"))
    reusable = {row["text"]: args.reuse_work / f"voice-{row['index']:02}.wav" for row in prior}
rows = []
for index, row in enumerate(json.loads(args.manifest.read_text(encoding="utf-8"))["segments"]):
    destination = args.output / f"voice-{index:02}.wav"
    if row["text"] in reusable:
        existing = reusable[row["text"]]
        info = sf.info(existing)
        if info.samplerate != 24000 or info.channels != 1:
            raise ValueError("Reusable voice format does not match the offline pipeline")
        shutil.copyfile(existing, destination)
        seconds = info.frames / info.samplerate
    else:
        if pipeline is None:
            pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
        audio = np.concatenate([a for _, _, a in pipeline(row["text"], voice="af_heart", speed=1.03)])
        sf.write(destination, audio, 24000)
        seconds = len(audio) / 24000
    rows.append({"index": index, "seconds": seconds, "text": row["text"]})
    print(f"voice_segment={index + 1} seconds={rows[-1]['seconds']:.2f}", flush=True)
(args.output / "voice-timing.json").write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
