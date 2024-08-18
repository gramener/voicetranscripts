/* globals process */

import { dirname } from "path";
import { fileURLToPath } from "url";
import { readdir, readFile, writeFile } from "fs/promises";
import { segment, audit, actions } from "./transcripts.js"; // Assume these functions are defined in analysisUtils.js

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const folder = __dirname;
const transcripts = `${folder}/transcripts`;
const analyses = `${folder}/analysis`;
const resultsFile = `${folder}/results.json`;
const results = {};
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.LLMFOUNDRY_TOKEN}:voicetranscripts`,
};

const files = await readdir(transcripts);
for (const filename of files) {
  if (!filename.endsWith(".json")) continue;

  const analysisFile = `${analyses}/${filename}`;
  let analysis = {};

  try {
    const analysisData = await readFile(analysisFile, "utf8");
    analysis = JSON.parse(analysisData);
  } catch {
    // If the analysis file doesn't exist, start with an empty object
  }

  console.log(`Analyzing ${filename}`);
  if (!analysis.transcript) analysis.transcript = JSON.parse(await readFile(`${transcripts}/${filename}`, "utf8"));

  if (!analysis.segmented) analysis.segmented = await segment(headers, analysis.transcript.segments, false);
  const segmented = analysis.segmented.content[0].input.transcript
    .map(({ speaker, text }) => `${speaker}: ${text}`)
    .join("\n");

  if (!analysis.actions) analysis.actions = await actions(headers, segmented, false);
  if (!Array.isArray(analysis.actions.content[0].input.issues))
    throw new Error("Wrong actions schema: " + JSON.stringify(analysis.actions.content[0].input.issues));

  if (!analysis.audit) analysis.audit = await audit(headers, segmented, false);
  if (typeof analysis.audit.content[0].input != "object")
    throw new Error("Wrong audit schema: " + JSON.stringify(analysis.audit.content[0].input));

  // Results are cached in the analysis/ folder. Delete the analysis file to re-run the analysis.
  await writeFile(analysisFile, JSON.stringify(analysis, null, 2));

  results[filename] = analysis;
  await writeFile(resultsFile, JSON.stringify(results));
}
