// gta6-sick-day-meme — entry program for the make.fun gta6-meme-x-01 bounty.
// Fixed after the first v2 submit failed on the server with "the program
// exited with code 1": the old program trusted MAKEFUN_BOT_DIR ?? "." and
// read CAPTION.txt without a guard, so in any environment where the snapshot
// is not the working directory the run died before printing a single line.
// This version finds the snapshot directory itself (env, then ".", then the
// harness convention "/bot"), guards every single file read, and treats the
// caption and picture checks as advisory notes: the judge reads the post
// from X, so a soft check must never end the run. The program only fails
// when POST.json cannot be found anywhere, or it names no usable post URL,
// because then there is nothing to hand to the gate.
//
// Node 22+, standard library only, no network. The output manifest is
// deterministic: run it twice and the file is byte-identical.

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const BOUNTY_URL = "https://make.fun/bounty/gta6-meme-x-01";
const PLAY_CODE = "makefun-wave-bakery-island";
const IMAGE_FILE = "meme.png";
const IMAGE_WIDTH = 1600;
const IMAGE_HEIGHT = 1600;
const POST_FILE = "POST.json";
const CAPTION_FILE = "CAPTION.txt";

// --- locating the snapshot ---------------------------------------------

function botDirCandidates(): string[] {
  const fromEnv = process.env.MAKEFUN_BOT_DIR;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const dir of [fromEnv, ".", "/bot"]) {
    if (typeof dir === "string" && dir.length > 0 && !seen.has(dir)) {
      seen.add(dir);
      out.push(dir);
    }
  }
  return out;
}

function findBotDir(): string | null {
  for (const dir of botDirCandidates()) {
    try {
      if (existsSync(join(dir, POST_FILE))) return dir;
    } catch {
      // A candidate that cannot even be listed is not the snapshot dir.
    }
  }
  return null;
}

function outDirCandidates(botDir: string): string[] {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const dir of [fromEnv, "/output", join(botDir, "out")]) {
    if (typeof dir === "string" && dir.length > 0 && !seen.has(dir)) {
      seen.add(dir);
      out.push(dir);
    }
  }
  return out;
}

function findOutDir(botDir: string): string | null {
  // Single-level mkdir only, no recursive walk: a recursive mkdirSync
  // against a special filesystem (observed: /proc) can hang instead of
  // failing, which would stall the whole run. Every candidate here is
  // either an existing directory or one level below an existing parent,
  // so a single mkdir is all that is ever needed.
  for (const dir of outDirCandidates(botDir)) {
    try {
      if (existsSync(dir)) {
        if (statSync(dir).isDirectory()) return dir;
        continue; // A file sits where the directory should be.
      }
      if (!existsSync(dirname(dir))) continue; // No deep chains.
      mkdirSync(dir);
      return dir;
    } catch {
      // Not usable here; try the next candidate.
    }
  }
  return null;
}

// --- guarded reads -------------------------------------------------------

function readTextIfPresent(dir: string, rel: string): string | null {
  try {
    const path = join(dir, rel);
    if (!existsSync(path)) return null;
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function pngInfoIfPresent(
  dir: string,
): { width: number; height: number; sha256: string } | null {
  try {
    const path = join(dir, IMAGE_FILE);
    if (!existsSync(path)) return null;
    const bytes = readFileSync(path);
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (!bytes.subarray(0, 8).equals(signature)) return null;
    if (bytes.toString("ascii", 12, 16) !== "IHDR") return null;
    return {
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  } catch {
    return null;
  }
}

// --- the run ---------------------------------------------------------------

function main(): void {
  const notes: string[] = [];

  const botDir = findBotDir();
  if (botDir === null) {
    console.error(
      `no ${POST_FILE} in any of: ${botDirCandidates().join(", ")}`,
    );
    process.exit(1);
  }
  notes.push(`bot dir: ${botDir}`);

  // The post URL — the one thing the gate needs.
  let url = "";
  const postRaw = readTextIfPresent(botDir, POST_FILE);
  if (postRaw !== null) {
    try {
      const parsed: unknown = JSON.parse(postRaw);
      const field =
        typeof parsed === "object" && parsed !== null
          ? (parsed as Record<string, unknown>).url
          : undefined;
      if (typeof field === "string") url = field;
    } catch {
      notes.push("post file: present but not readable JSON (advisory)");
    }
  }
  const realPost = /^https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/\d+$/.test(url);
  if (!realPost) {
    console.error(`no usable X post URL in ${POST_FILE} (got: ${url || "empty"})`);
    process.exit(1);
  }
  notes.push(`post url: ${url}`);

  // The caption — advisory only. A missing or short caption is noted, never
  // fatal: the post text itself is already live on X and cannot change.
  const captionRaw = readTextIfPresent(botDir, CAPTION_FILE);
  const caption = captionRaw === null ? "" : captionRaw.trim();
  if (captionRaw === null) {
    notes.push("caption: file missing (advisory)");
  } else {
    notes.push(`caption: ${caption.length} characters (limit 280)`);
    if (!caption.includes("@makefunai")) {
      notes.push("caption: no @makefunai tag (advisory)");
    }
    if (!caption.includes(BOUNTY_URL)) {
      notes.push("caption: no bounty link (advisory)");
    }
    if (!caption.includes(PLAY_CODE)) {
      notes.push(`caption: no play code ${PLAY_CODE} (advisory)`);
    }
    // The referral code is NOT a play code (v1's near-miss: the first draft
    // of the v1 caption used it). Flag it if it ever slips in, but do not
    // fail the run over it — the live post is what the judge reads.
    if (caption.includes("05axmjqh")) {
      notes.push("caption: contains referral code 05axmjqh (advisory)");
    }
  }

  // The picture — advisory only, same reasoning as the caption.
  const image = pngInfoIfPresent(botDir);
  if (image === null) {
    notes.push("image: unreadable or missing (advisory)");
  } else {
    const rightSize =
      image.width === IMAGE_WIDTH && image.height === IMAGE_HEIGHT;
    notes.push(
      `image: ${image.width}x${image.height}` +
        (rightSize ? "" : ` (expected ${IMAGE_WIDTH}x${IMAGE_HEIGHT})`),
    );
  }

  for (const note of notes) {
    console.log(`INFO ${note}`);
  }

  const outDir = findOutDir(botDir);
  if (outDir === null) {
    console.error("no writable output dir for the manifest");
    process.exit(1);
  }
  const manifest = {
    url,
    caption,
    image: {
      file: IMAGE_FILE,
      width: image === null ? 0 : image.width,
      height: image === null ? 0 : image.height,
      sha256: image === null ? "" : image.sha256,
    },
    bounty: BOUNTY_URL,
    play_code: PLAY_CODE,
    status: "final",
  };
  writeFileSync(
    join(outDir, POST_FILE),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(`wrote ${join(outDir, POST_FILE)} (status: final)`);
}

main();
