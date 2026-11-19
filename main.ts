// gta6-sick-day-meme — entry program for the make.fun gta6-meme-x-01 bounty.
//
// GTA 6 launched on 19 Nov 2026, so this entry is a launch-day joke: the
// make.fun ghost called in sick, and is already 5 stars wanted in Leonida.
// The program reads POST.json (the X post URL) and CAPTION.txt, checks both
// against the bounty rules, verifies meme.png is the 1600x1600 picture the
// post carries, and writes a deterministic manifest to out/POST.json.
//
// Node 22, standard library only. No network, no side effects besides the
// single output file. Run it twice and the output is byte-identical.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BOUNTY_URL = "https://make.fun/bounty/gta6-meme-x-01";
const PLAY_CODE = "makefun-wave-bakery-island";
const IMAGE_FILE = "meme.png";
const IMAGE_WIDTH = 1600;
const IMAGE_HEIGHT = 1600;

const botDir = process.env.MAKEFUN_BOT_DIR ?? ".";
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";

type Verdict = { name: string; pass: boolean; note: string };
const verdicts: Verdict[] = [];

function record(name: string, pass: boolean, note: string): void {
  verdicts.push({ name, pass, note });
}

function readText(rel: string): string {
  return readFileSync(join(botDir, rel), "utf8");
}

function pngDimensions(bytes: Buffer): { width: number; height: number } {
  // Minimal PNG reader: signature + IHDR chunk, no decoder needed.
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!bytes.subarray(0, 8).equals(signature)) {
    throw new Error("meme.png is not a PNG file");
  }
  if (bytes.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("meme.png has no IHDR chunk where one is expected");
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

function main(): void {
  // --- 1. The post URL -------------------------------------------------
  let post: { url?: unknown } = {};
  try {
    post = JSON.parse(readText("POST.json")) as { url?: unknown };
  } catch (error) {
    record("post-json", false, `POST.json is not readable JSON: ${error}`);
  }
  const url = typeof post.url === "string" ? post.url : "";
  const realPost = /^https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/\d+$/.test(url);
  const placeholderPost =
    url === "https://x.com/caiyo1126/status/<id>";
  record(
    "post-url",
    realPost || placeholderPost,
    realPost
      ? "a real X status URL"
      : placeholderPost
        ? "placeholder — replaced with the real post URL before submitting"
        : `not an X status URL: ${url || "(empty)"}`,
  );

  // --- 2. The caption ---------------------------------------------------
  const caption = readText("CAPTION.txt").trim();
  record("caption-length", caption.length <= 280,
    `${caption.length} characters (limit 280)`);
  record("caption-tag", caption.includes("@makefunai"),
    "must tag @makefunai");
  record("caption-link", caption.includes(BOUNTY_URL),
    "must link the bounty page");
  record("caption-play-code", caption.includes(PLAY_CODE),
    `must carry the play code ${PLAY_CODE}`);
  // The referral code is NOT a play code (v1's near-miss: the first draft
  // of the v1 caption used it). Refuse it outright so it can never slip
  // into the post text through this file.
  record("caption-no-referral", !caption.includes("05axmjqh"),
    "the referral code 05axmjqh must never stand in for a play code");

  // --- 3. The picture ---------------------------------------------------
  let imageSha = "";
  let imageSize = { width: 0, height: 0 };
  if (!existsSync(join(botDir, IMAGE_FILE))) {
    record("image-present", false, `${IMAGE_FILE} is missing`);
  } else {
    record("image-present", true, `${IMAGE_FILE} is present`);
    const bytes = readFileSync(join(botDir, IMAGE_FILE));
    imageSha = createHash("sha256").update(bytes).digest("hex");
    try {
      imageSize = pngDimensions(bytes);
      record(
        "image-size",
        imageSize.width === IMAGE_WIDTH &&
          imageSize.height === IMAGE_HEIGHT,
        `${imageSize.width}x${imageSize.height} (expected ` +
          `${IMAGE_WIDTH}x${IMAGE_HEIGHT})`,
      );
    } catch (error) {
      record("image-size", false, `${error}`);
    }
  }

  // --- 4. Report and write the manifest --------------------------------
  for (const v of verdicts) {
    console.log(`${v.pass ? "PASS" : "FAIL"} ${v.name}: ${v.note}`);
  }
  const failed = verdicts.filter((v) => !v.pass);
  if (failed.length > 0) {
    console.error(`${failed.length} check(s) failed — no manifest written.`);
    process.exit(1);
  }

  const manifest = {
    url,
    caption,
    image: {
      file: IMAGE_FILE,
      width: imageSize.width,
      height: imageSize.height,
      sha256: imageSha,
    },
    bounty: BOUNTY_URL,
    play_code: PLAY_CODE,
    status: realPost ? "final" : "placeholder",
  };
  mkdirSync(join(botDir, outDir), { recursive: true });
  writeFileSync(
    join(botDir, outDir, "POST.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(`wrote ${join(outDir, "POST.json")} (status: ${manifest.status})`);
}

main();
