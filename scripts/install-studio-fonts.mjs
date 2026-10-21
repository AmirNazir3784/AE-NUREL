// Download *exact* upstream SIL OFL binaries for self-hosted caption fonts.
// Run explicitly: node scripts/install-studio-fonts.mjs
// No runtime browser/CDN calls. Git blob checksums prevent silent substitutions.
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile, rename, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEST = join(ROOT, "public", "studio-fonts");
const FILES = [
  [
    "anton",
    "Anton-Regular.ttf",
    "4d65707db9d8663ccfa99cd28cd3a4e0025be178",
    "Anton-Regular.ttf"
  ],
  [
    "anton",
    "OFL.txt",
    "93feddee37145696e123ea65a6772cab09663f9e",
    "Anton-OFL.txt"
  ],
  [
    "bebasneue",
    "BebasNeue-Regular.ttf",
    "c328c6e08b20a20a1de47d823e007ee73812a438",
    "BebasNeue-Regular.ttf"
  ],
  [
    "bebasneue",
    "OFL.txt",
    "da9571488f44176ef90d7f10c0f402c8be74db67",
    "BebasNeue-OFL.txt"
  ],
  [
    "oswald",
    "Oswald[wght].ttf",
    "d1a3b9cb1325bf20b3a06ef9849d21c411212a3b",
    "Oswald-Variable.ttf"
  ],
  [
    "oswald",
    "OFL.txt",
    "4d4e319b6114be0174e6de5d8090408f78dc65b8",
    "Oswald-OFL.txt"
  ],
  [
    "playfairdisplay",
    "PlayfairDisplay[wght].ttf",
    "7a09eb71f10622fd083134ac9ed46f59b21bee18",
    "PlayfairDisplay-Variable.ttf"
  ],
  [
    "playfairdisplay",
    "PlayfairDisplay-Italic[wght].ttf",
    "94fae1f2853dd325b1a3602370780d154ffc8c89",
    "PlayfairDisplay-Italic-Variable.ttf"
  ],
  [
    "playfairdisplay",
    "OFL.txt",
    "13153890847ba9bde8a852596d1515261156e474",
    "PlayfairDisplay-OFL.txt"
  ],
  [
    "dmsans",
    "DMSans[opsz,wght].ttf",
    "c672f98060af9b2c85fca704ebd5ad9a8717c1df",
    "DMSans-Variable.ttf"
  ],
  [
    "dmsans",
    "DMSans-Italic[opsz,wght].ttf",
    "bf6819b0f811026ecf98d66183509b7302c0bf61",
    "DMSans-Italic-Variable.ttf"
  ],
  [
    "dmsans",
    "OFL.txt",
    "4430b85ac62998e2edb914360f9ebdfe43f4deaa",
    "DMSans-OFL.txt"
  ]
];
function gitBlobSha(buffer) { return createHash("sha1").update("blob " + buffer.length + "\0").update(buffer).digest("hex"); }
async function verifiedExisting(path, sha) {
  try { return gitBlobSha(await readFile(path)) === sha; } catch (error) { if (error.code === "ENOENT") return false; throw error; }
}
const isDry = process.argv.includes("--dry-run");
const isCheck = process.argv.includes("--check");
if (isDry) { console.log("DRY RUN: " + FILES.length + " pinned font/license files; no changes made."); process.exit(0); }
let pending = 0;
for (const [family, filename, sha, outputName] of FILES) {
  const output = join(DEST, outputName);
  if (await verifiedExisting(output, sha)) { console.log("Verified: " + outputName); continue; }
  pending++;
  if (isCheck) { console.error("Missing or incorrect: " + outputName); continue; }
  const url = "https://raw.githubusercontent.com/google/fonts/main/ofl/" + family + "/" + encodeURIComponent(filename);
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000), redirect: "follow" });
  if (!response.ok) throw new Error("Font download failed for " + outputName + ": HTTP " + response.status);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > 1_000_000 || gitBlobSha(buffer) !== sha) throw new Error("Font integrity check failed for " + outputName + ". No file was installed.");
  await mkdir(DEST, { recursive: true });
  const temp = output + ".pending";
  try { await writeFile(temp, buffer, { flag: "w" }); await rename(temp, output); }
  finally { await rm(temp, { force: true }).catch(() => {}); }
  console.log("Installed " + outputName);
}
if (isCheck && pending) process.exitCode = 1;
else console.log("Fonts ready. Include public/studio-fonts/* when committing your local project.");
