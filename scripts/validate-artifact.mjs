import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerPath = resolve(projectRoot, "dist/server/index.js");
const manifestPath = resolve(projectRoot, "dist/.openai/hosting.json");

const [source, manifest] = await Promise.all([
  readFile(workerPath, "utf8"),
  readFile(manifestPath, "utf8"),
]);
JSON.parse(manifest);

// A data URL forces ESM parsing even though the generated output has no package.json.
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const workerModule = await import(moduleUrl).catch(error=>{console.error(error.name+': '+error.message);process.exit(1);});
assert.equal(
  typeof workerModule.default?.fetch,
  "function",
  `${pathToFileURL(workerPath)} must export default.fetch`,
);

console.log("Artifact is valid ESM and exports default.fetch");
const invoke = path => workerModule.default.fetch(new Request(`https://artifact.test${path}`));
const tagsResponse = await invoke('/api/tags');
assert.equal(tagsResponse.status,200);
const tagsData = await tagsResponse.json();
assert.ok(tagsData.total >= 1000);
assert.equal(tagsData.groups.length,3);
const songsResponse = await invoke('/api/recommendations?year=2026&limit=20');
const songsData = await songsResponse.json();
assert.equal(songsData.songs.length,20);
assert.ok(songsData.songs.every(song=>song.date.startsWith('2026')));
const newsResponse = await invoke('/api/news?month=2026-10');
assert.ok((await newsResponse.json()).events.length >= 15);
assert.equal((await invoke('/')).status,200);
console.log('Bundled HTML, grouped tags, 1000+ songs, year filter, and news routes verified');
