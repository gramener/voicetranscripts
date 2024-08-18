/* globals bootstrap */
import { render, html } from "https://cdn.jsdelivr.net/npm/lit-html@3/+esm";

const $results = document.querySelector("#results");
const $infoModal = document.querySelector("#info-modal");
const $infoModalDialog = $infoModal.querySelector(".modal-dialog");
const $infoModalTitle = $infoModal.querySelector("#info-modal-title");
const $infoModalBody = $infoModal.querySelector("#info-modal-body");
const infoModal = new bootstrap.Modal("#info-modal");

const loading = html`<div class="spinner-border" role="status">
  <span class="visually-hidden">Loading...</span>
</div> `;
// Format as MM:SS
const formatTime = (seconds) => new Date(seconds * 1000).toISOString().slice(14, 19);

// Show a spinner in results
render(loading, $results);
const results = await fetch("results.json").then((r) => r.json());
const checks = [
  { key: "was_agent_polite", label: "Polite?", question: "Was the agent polite?" },
  { key: "did_agent_build_rapport", label: "Rapport?", question: "Did the agent build rapport?" },
  { key: "did_agent_apologize", label: "Apology?", question: "Did the agent apologize?" },
  { key: "did_agent_explicitly_empathize", label: "Empathy?", question: "Did the agent empathize with the customer?" },
  { key: "was_language_fully_jargon_free", label: "Jargon-free?", question: "What the language fully jargon-free?" },
];
for (const analysis of Object.values(results)) {
  const issues = analysis.actions.content[0].input.issues;
  analysis.issues = { issues };
  analysis.issues.total = issues.length;
  analysis.issues.resolved = issues.filter((issue) => issue.was_issue_fully_resolved).length;
  analysis.issues.pending = analysis.issues.total - analysis.issues.resolved;
  const quality = (analysis.quality = analysis.audit.content[0].input);
  if (!quality.was_apology_required) quality.did_agent_apologize = null;
  quality.did_agent_apologize_reason =
    (quality.was_apology_required_reason ?? "") + "\n" + quality.did_agent_apologize_reason;
}

render(
  html`
    <table class="table table-bordered table-striped w-auto mx-auto">
      <thead>
        <tr>
          <th class="text-end">#</th>
          <th>Call</th>
          <th>Issues resolved?</th>
          ${checks.map(({ label }) => html`<th scope="col" class="text-center">${label}</th>`)}
        </tr>
      </thead>
      <tbody>
        ${Object.entries(results).map(
          ([filename, { issues, quality, transcript }], index) => html`
            <tr>
              <td class="text-end">${index + 1}</td>
              <th scope="row" data-filename="${filename}" data-modal="transcript" data-key="transcript">
                ${filename.replace(".json", "")}
                <span class="fw-normal small text-muted">${formatTime(transcript.segments.at(-1).end)}</span>
              </th>
              <td data-filename="${filename}" data-modal="issues" data-key="issues">
                <div class="progress-stacked mt-1">
                  <div
                    class="progress"
                    role="progressbar"
                    aria-label="Resolved"
                    aria-valuenow="${issues.resolved}"
                    aria-valuemin="0"
                    aria-valuemax="${issues.total}"
                    style="width: ${(issues.resolved / issues.total) * 100}%"
                  >
                    <div class="progress-bar bg-success"></div>
                  </div>
                  <div
                    class="progress"
                    role="progressbar"
                    aria-label="Pending"
                    aria-valuenow="${issues.pending}"
                    aria-valuemin="0"
                    aria-valuemax="${issues.total}"
                    style="width: ${(issues.pending / issues.total) * 100}%"
                  >
                    <div class="progress-bar bg-danger"></div>
                  </div>
                </div>
              </td>
              ${checks.map(
                ({ key }) =>
                  html`<td class="text-center" data-filename="${filename}" data-modal="quality" data-key="${key}">
                    ${quality[key] === null ? "⚪" : quality[key] ? "✅" : "❌"}
                  </td>`,
              )}
            </tr>
          `,
        )}
      </tbody>
    </table>
  `,
  $results,
);

let $selectedCell;

$results.addEventListener("click", (event) => {
  const $modalTrigger = event.target.closest("[data-modal]");
  if ($modalTrigger) showModal($modalTrigger);
});

// Track <audio> elements that already have event listeners
const audioElements = new WeakSet();

function showModal($modalTrigger) {
  $selectedCell = $modalTrigger;
  $results.querySelector(".selected-cell")?.classList?.remove?.("selected-cell");
  $selectedCell.classList.add("selected-cell");
  const { modal, filename, key } = $selectedCell.dataset;

  $infoModalDialog.classList.toggle("modal-lg", modal == "issues");
  $infoModalDialog.classList.toggle("modal-xl", modal == "transcript");

  render(
    html`<i class="bi bi-soundwave"></i> <span class="text-uppercase">${filename.replace(".json", "")}</span>`,
    $infoModalTitle,
  );
  render(content[modal]({ filename, key }), $infoModalBody);
  infoModal.show();

  // Add an event listener for audio elements
  const $audio = $infoModalBody.querySelector("audio");
  if ($audio && !audioElements.has($audio)) {
    $audio.addEventListener("timeupdate", audioUpdate);
    audioElements.add($audio);
  }
}

const content = {
  transcript: ({ filename }) => {
    let lastSpeaker = "";
    const content = [
      html`<div class="my-3">
        <audio controls src="audio/${filename.replace(".json", ".ogg")}" class="w-100"></audio>
      </div>`,
    ];
    for (const { speaker, id, text } of results[filename].segmented.content[0].input.transcript) {
      if (lastSpeaker != speaker) {
        if (lastSpeaker) content.push(html`<div class="my-3"></div>`);
        content.push(html`<strong>${speaker}</strong>: <span data-seg-id="${id}">${text} </span>`);
        lastSpeaker = speaker;
      } else content.push(html`<span data-seg-id="${id}">${text} </span>`);
    }
    return content;
  },
  issues: ({ filename }) => html`
    <table class="table table-bordered table-striped table-sm">
      <thead>
        <tr>
          <th>Issue</th>
          <th>Resolved</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody>
        ${results[filename].issues.issues.map(
          (issue) => html`
            <tr>
              <td>${issue.issue_raised_by_customer}</td>
              <td>${issue.was_issue_fully_resolved ? "✅" : "❌"}</td>
              <td>${issue.was_issue_fully_resolved_reason}</td>
            </tr>
          `,
        )}
      </tbody>
    </table>
  `,
  quality: ({ filename, key }) => {
    const quality = results[filename].quality;
    const check = checks.find(({ key: k }) => k == key);
    return html`
      <p>
        <strong>${check.question}</strong>:
        ${quality[key] === null ? "⚪ Not required" : quality[key] ? "✅ Pass" : "❌ Fail"}
      </p>
      <p><strong>Reason</strong>: ${results[filename].quality[`${key}_reason`]}</p>
    `;
  },
};

document.addEventListener("keydown", (event) => {
  if (!infoModal._isShown) return;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    if (event.key === "ArrowLeft")
      $selectedCell = $selectedCell.previousElementSibling ?? $selectedCell.parentElement.lastElementChild;
    if (event.key === "ArrowRight")
      $selectedCell = $selectedCell.nextElementSibling ?? $selectedCell.parentElement.firstElementChild;
    if (event.key === "ArrowUp")
      $selectedCell =
        $selectedCell.parentElement.previousElementSibling?.querySelector(
          `[data-key="${$selectedCell.dataset.key}"]`,
        ) ?? $selectedCell;
    if (event.key === "ArrowDown")
      $selectedCell =
        $selectedCell.parentElement.nextElementSibling?.querySelector(`[data-key="${$selectedCell.dataset.key}"]`) ??
        $selectedCell;
    showModal($selectedCell);
  }
});

$infoModal.addEventListener("hidden.bs.modal", () => {
  // When the modal is closed, clear the selected cell
  $results.querySelector(".selected-cell")?.classList?.remove?.("selected-cell");
  $selectedCell = null;
  // Pause audio
  $infoModalBody.querySelector("audio").pause();
});

// Add an event listener for when the audio progresses
function audioUpdate(event) {
  const currentTime = event.target.currentTime;
  const { id } =
    results[$selectedCell.dataset.filename].transcript.segments.find(
      ({ start, end }) => start <= currentTime && currentTime <= end,
    ) ?? {};
  $infoModalBody.querySelector(".highlight")?.classList.remove("highlight");
  $infoModalBody.querySelector(`[data-seg-id="${id}"]`)?.classList.add("highlight");
}

$infoModalBody.addEventListener("click", (event) => {
  const $seg = event.target.closest("[data-seg-id]");
  if ($seg) {
    const $audio = $infoModalBody.querySelector("audio");
    $audio.currentTime = results[$selectedCell.dataset.filename].transcript.segments.find(
      ({ id }) => id == $seg.dataset.segId,
    ).start;
    $audio.play();
  }
});
