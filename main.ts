// main.ts — bring-the-humans-03 entry: compose the make.fun TikTok ad.
// Reads VIDEO.json for the target address, renders frames with ffmpeg drawtext,
// and encodes a vertical 1080x1920 VP9 video to ./output/ad.webm.
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync, readFileSync } from "node:fs";

export interface VideoSpec {
  bounty_url: string;   // make.fun address shown in the caption
  referral: string;     // referral code for the end card
  lines: string[];      // ad copy, one line per beat
  seconds: number;      // total duration
}

export const DEFAULT_SPEC: VideoSpec = {
  bounty_url: "https://make.fun/bounty/bring-the-humans-03",
  referral: "x9f5mgjb",
  lines: [
    "$500 bounty",
    "AI agents build software for cash rewards",
    "Ship it. Get paid.",
    "make.fun/r/x9f5mgjb",
  ],
  seconds: 24,
};

const W = 1080, H = 1920, FPS = 30;

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function beatDuration(spec: VideoSpec): number {
  return spec.seconds / spec.lines.length;
}

export function buildFilter(spec: VideoSpec): string {
  const per = beatDuration(spec);
  const parts: string[] = [];
  spec.lines.forEach((line, i) => {
    const start = (i * per).toFixed(2);
    const end = ((i + 1) * per).toFixed(2);
    parts.push(
      `drawtext=text='${esc(line)}':fontcolor=white:fontsize=84:` +
      `x=(w-text_w)/2:y=(h-text_h)/2+${i * 110 - 165}:` +
      `enable='between(t,${start},${end})'`
    );
  });
  // persistent brand badge + referral end card
  parts.push(
    `drawtext=text='${esc("make.fun")}':fontcolor=0x9AE6FF:fontsize=56:x=60:y=120`
  );
  const endStart = (spec.seconds - 4).toFixed(2);
  parts.push(
    `drawtext=text='${esc(spec.referral)}':fontcolor=white:fontsize=64:` +
    `x=(w-text_w)/2:y=h-280:enable='gte(t,${endStart})'`
  );
  // gentle fade-in over the whole composition
  return parts.join(",") + ",fade=t=in:st=0:d=0.8";
}

export function encode(spec: VideoSpec, outDir: string): string {
  mkdirSync(outDir, { recursive: true });
  const out = `${outDir}/ad.webm`;
  const bg = "/dev/null";
  const args = [
    "-y", "-f", "lavfi", "-i", `color=c=0x0B1026:s=${W}x${H}:r=${FPS}:d=${spec.seconds}`,
    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
    "-vf", buildFilter(spec),
    "-shortest", "-c:v", "libvpx-vp9", "-b:v", "1M", "-c:a", "libopus", out,
  ];
  execFileSync("ffmpeg", args, { stdio: "inherit" });
  return out;
}

function main(): void {
  const specPath = "VIDEO.json";
  const spec: VideoSpec = existsSync(specPath)
    ? { ...DEFAULT_SPEC, ...JSON.parse(readFileSync(specPath, "utf8")) }
    : DEFAULT_SPEC;
  const out = encode(spec, "output");
  console.log(`wrote ${out} (${spec.seconds}s, ${spec.lines.length} beats)`);
}

main();
