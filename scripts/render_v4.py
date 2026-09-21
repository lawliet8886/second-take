"""Render an editorial 16:9 review candidate from real, identified Android footage.

No UI is fabricated. Source clips may be shortened/held; disclosure stays visible.
Requires FFmpeg, Pillow and the WAV segments from synthesize_v4.py.
"""
import argparse
import hashlib
import json
import math
import subprocess
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
parser.add_argument("--work", type=Path, required=True)
parser.add_argument("--manifest", type=Path, default=Path("assets/video/v4-edit.json"))
parser.add_argument("--version", choices=["v4", "v5", "v6"], default="v4")
parser.add_argument("--font", type=Path, default=Path("C:/Windows/Fonts/arial.ttf"))
parser.add_argument("--bold-font", type=Path, default=Path("C:/Windows/Fonts/arialbd.ttf"))
args = parser.parse_args()
root, work = args.root.resolve(), args.work.resolve()
work.mkdir(parents=True, exist_ok=True)
manifest = json.loads((root / args.manifest).read_text(encoding="utf-8"))
timing = json.loads((work / "voice-timing.json").read_text(encoding="utf-8"))
if manifest["version"].split("-")[0].lower() != args.version:
    raise ValueError("Manifest version and output version must match")
if [row["text"] for row in manifest["segments"]] != [row["text"] for row in timing]:
    raise ValueError("Narration does not match the edit manifest; synthesize it again")
source = root / manifest["source"]
if args.version == "v6":
    probe = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate,avg_frame_rate", "-of", "json", str(source)], text=True))["streams"][0]
    if probe["r_frame_rate"] != "30/1" or probe["avg_frame_rate"] != "30/1":
        raise ValueError("V6 requires a 30 fps normalized source: normalize Android VFR capture with fps=30 before editing")
def font(size, bold=False):
    return ImageFont.truetype(str(args.bold_font if bold else args.font), size)
def run(command):
    subprocess.run(command, check=True)
def stamp(seconds):
    ms = round(seconds * 1000)
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"
cursor, captions, records = 0.0, [], []
reading_durations = [7, 6, 8, 8, 6, 6, 6, 7, 7, 12, 10, 9, 8]
for i, (row, voice) in enumerate(zip(manifest["segments"], timing, strict=True)):
    duration = max(row.get("minimumSeconds", reading_durations[i]), math.ceil((voice["seconds"] + .35) * 30) / 30)
    title_size = 70 if args.version == "v6" else 82
    body_size = 34 if args.version == "v6" else 36
    text_right = 1050 if args.version == "v6" else 1300
    bg = Image.new("RGB", (1920, 1080), "#080d18")
    d = ImageDraw.Draw(bg)
    for x in range(1920):
        d.line((x, 0, x, 945), fill=(8 + int(x / 220), 13 + int(x / 210), 24 + int(x / 65)))
    d.rounded_rectangle((78, 66, 94, 118), radius=8, fill="#79e1c1")
    d.text((116, 68), "SECOND TAKE", font=font(35, True), fill="#f2f5fa")
    d.text((88, 179), row["label"], font=font(27, True), fill="#b9a1ff")
    d.multiline_text((82, 248), row["title"], font=font(title_size, True), fill="#f4f6fc", spacing=12)
    d.multiline_text((88, 494), row["body"], font=font(body_size), fill="#c8d2e4", spacing=14)
    d.text((88, 836), "Edited Android capture • waits shortened / frames held", font=font(22), fill="#99a7bd")
    d.text((88, 871), "One preserved checkpoint. Only your choice changes.", font=font(25, True), fill="#79e1c1")
    for step in range(len(timing)):
        x = 88 + step * 83
        d.rounded_rectangle((x, 924, x + 67, 929), radius=2, fill="#aa8df6" if step <= i else "#27324a")
    d.rectangle((0, 951, 1920, 1080), fill="#050912")
    text = textwrap.fill(row["text"].replace("Revenue Cat", "RevenueCat"), width=94)
    for position, value, face, spacing, limit in [
        ((82, 248), row["title"], font(title_size, True), 12, (text_right, 480)),
        ((88, 494), row["body"], font(body_size), 14, (text_right, 825)),
    ]:
        bounds = d.multiline_textbbox(position, value, font=face, spacing=spacing)
        if bounds[2] > limit[0] or bounds[3] > limit[1]:
            raise ValueError(f"Segment {i + 1}: editorial text exceeds safe bounds")
    caption_bounds = d.multiline_textbbox((960, 980), text, font=font(32), anchor="ma", align="center", spacing=7)
    if caption_bounds[0] < 30 or caption_bounds[2] > 1890 or caption_bounds[3] > 1070:
        raise ValueError(f"Segment {i + 1}: captions exceed safe bounds")
    d.multiline_text((960, 980), text, font=font(32), fill="#f4f6fc", anchor="ma", align="center", spacing=7)
    panel = work / f"panel-{i:02}.png"
    bg.save(panel)
    clip = work / f"clip-{i:02}.mp4"
    src_duration = row["end"] - row["start"]
    # Speed up only when the captured span exceeds the narration; otherwise hold its last frame.
    speed = min(1.0, duration / src_duration)
    graph = f"[1:v]setpts=(PTS-STARTPTS)*{speed:.8f},scale=492:874:force_original_aspect_ratio=decrease,pad=492:874:(ow-iw)/2:(oh-ih)/2:color=0x080d18,tpad=stop_mode=clone:stop_duration={duration},fps=30[app];[0:v][app]overlay=1340:48:shortest=1[v]"
    if args.version == "v6":
        crop = row.get("crop", manifest.get("baseCrop"))
        crop_filter = f"crop={crop[2]}:{crop[3]}:{crop[0]}:{crop[1]}," if crop else ""
        graph = f"[1:v]setpts=(PTS-STARTPTS)*{speed:.8f},{crop_filter}scale=760:906:force_original_aspect_ratio=decrease,pad=760:906:(ow-iw)/2:(oh-ih)/2:color=0x080d18,tpad=stop_mode=clone:stop_duration={duration},fps=30[app];[0:v][app]overlay=1080:28:shortest=1[v]"
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-i", str(panel), "-ss", str(row["start"]), "-t", str(src_duration), "-i", str(source), "-i", str(work / f"voice-{i:02}.wav"), "-filter_complex", graph, "-map", "[v]", "-map", "2:a", "-af", "apad", "-t", str(duration), "-r", "30", "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-threads", "4", str(clip)])
    captions.append(f"{i+1}\n{stamp(cursor)} --> {stamp(cursor + voice['seconds'])}\n{text}")
    records.append({"segment": i + 1, "label": row["label"], "start": cursor, "end": cursor + duration, "sourceStart": row["start"], "sourceEnd": row["end"], "speedMultiplier": 1/speed, "crop": row.get("crop", manifest.get("baseCrop"))})
    cursor += duration
    print(f"rendered_segment={i+1} cumulative_seconds={cursor:.2f}", flush=True)
if cursor >= 120:
    raise ValueError("Review video must remain under two minutes")
concat = work / "concat.txt"
concat.write_text("".join(f"file '{(work / f'clip-{i:02}.mp4').as_posix()}'\n" for i in range(len(timing))), encoding="utf-8")
output = root / f"assets/video/second-take-{args.version}-review.mp4"
run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(concat), "-c:v", "copy", "-af", "loudnorm=I=-16:TP=-1.5:LRA=7", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(output)])
(root / f"assets/video/second-take-{args.version}-review.srt").write_text("\n\n".join(captions) + "\n", encoding="utf-8")
manifest_out = {"version": manifest["version"], "publication": "NOT_PUBLISHED", "source": manifest["source"], "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "videoSha256": hashlib.sha256(output.read_bytes()).hexdigest(), "durationSeconds": cursor, "disclosure": manifest["disclosure"], "timeline": records}
(root / f"assets/video/{args.version}-render-manifest.json").write_text(json.dumps(manifest_out, indent=2) + "\n", encoding="utf-8")
(root / f"assets/video/{args.version}-voice-timing.json").write_text(json.dumps(timing, indent=2) + "\n", encoding="utf-8")
still = work / "comparison-still.png"
run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(manifest.get("thumbnailTime", 77)), "-i", str(source), "-frames:v", "1", str(still)])
thumbnail = Image.new("RGB", (1280, 720), "#0b1220")
td = ImageDraw.Draw(thumbnail)
td.text((54, 48), "SECOND TAKE", font=font(27, True), fill="#b9a1ff")
td.multiline_text((50, 119), "ONE MOMENT.\nTWO CHOICES.", font=font(65, True), spacing=9, fill="#f4f6fc")
td.text((54, 312), "Rehearse. Rewind. Compare.", font=font(29), fill="#c8d2e4")
td.rounded_rectangle((54, 391, 787, 481), radius=18, fill="#2b202a", outline="#fa9b91", width=2)
td.text((79, 415), "A   Clarification is still needed." if args.version == "v6" else 'A   "What do you mean exactly?"', font=font(29), fill="#f4f6fc")
td.rounded_rectangle((54, 504, 787, 609), radius=18, fill="#132a29", outline="#79e1c1", width=2)
td.multiline_text((79, 523), "B   Sources by nine tonight.\n      Not the whole project." if args.version == "v6" else 'B   "I can finish the sources\n      by nine tonight."', font=font(27), spacing=5, fill="#f4f6fc")
td.text((54, 650), "Android prototype • RevenueCat Shipaton Next Gen", font=font(21), fill="#99a7bd")
app = Image.open(still).convert("RGB")
app.thumbnail((356, 638), Image.Resampling.LANCZOS)
thumbnail.paste(app, (867, 40))
thumbnail.save(root / f"assets/thumbnail-{args.version}-review.png")
print(json.dumps({"durationSeconds": cursor, "output": output.name}))
