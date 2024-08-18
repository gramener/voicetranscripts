export async function segment(headers, transcript, stream) {
  return await anthropic({
    headers,
    model: "claude-3-haiku-20240307",
    system: `Label this call transcript between an agent and caller based on context.`,
    human: transcript.map(({ id, text }) => `id: ${id}\n${text}\n`).join("\n"),
    stream,
    tool_choice: { type: "tool", name: "label" },
    tools: [
      {
        name: "label",
        description: "Label each line by speaker.",
        input_schema: {
          type: "object",
          properties: {
            transcript: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  speaker: { type: "string" },
                  id: { type: "number" },
                  text: { type: "string" },
                },
              },
            },
          },
        },
      },
    ],
  });
}

export async function actions(headers, segmented, stream) {
  return await anthropic({
    headers,
    model: "claude-3-haiku-20240307",
    system: `List issues from customer service call transcript`,
    human: segmented,
    stream,
    tool_choice: { type: "tool", name: "issues" },
    tools: [
      {
        name: "issues",
        description: "List each customer issue, whether it was resolved, your reasoning and next steps",
        input_schema: {
          type: "object",
          properties: {
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue_raised_by_customer: { type: "string" },
                  was_issue_fully_resolved: { type: "boolean" },
                  was_issue_fully_resolved_reason: { type: "string" },
                  next_steps: { type: "string", description: "Single-line summary" },
                },
                required: [
                  "issue_raised_by_customer",
                  "was_issue_fully_resolved",
                  "was_issue_fully_resolved_reason",
                  "next_steps",
                ],
              },
            },
          },
          required: ["issues"],
        },
      },
    ],
  });
}

export async function audit(headers, segmented, stream) {
  return await anthropic({
    headers,
    model: "claude-3-haiku-20240307",
    system: `As a supervisor, audit this customer service call transcript`,
    human: segmented,
    stream,
    tool_choice: { type: "tool", name: "audit" },
    tools: [
      {
        name: "audit",
        description:
          "Evaluate customer service agent on each parameter. null = N/A, true = Yes, false = No. Provide reason for each answer.",
        input_schema: {
          type: "object",
          properties: {
            was_agent_polite: { type: "boolean" },
            was_agent_polite_reason: { type: "string" },
            did_agent_build_rapport: { type: "boolean" },
            did_agent_build_rapport_reason: { type: "string" },
            was_apology_required: { type: "boolean" },
            did_agent_apologize: { type: "boolean" },
            did_agent_apologize_reason: { type: "string" },
            did_agent_explicitly_empathize: { type: "boolean" },
            did_agent_explicitly_empathize_reason: { type: "string" },
            was_language_fully_jargon_free: { type: "boolean" },
            was_language_fully_jargon_free_reason: { type: "string" },
          },
          required: [
            "was_agent_polite",
            "was_agent_polite_reason",
            "did_agent_build_rapport",
            "did_agent_build_rapport_reason",
            "was_apology_required",
            "did_agent_apologize",
            "did_agent_apologize_reason",
            "did_agent_explicitly_empathize",
            "did_agent_explicitly_empathize_reason",
            "was_language_fully_jargon_free",
            "was_language_fully_jargon_free_reason",
          ],
        },
      },
    ],
  });
}

export async function anthropic({
  headers,
  model,
  system,
  human,
  tools = null,
  tool_choice = null,
  temperature = 0,
  stream = true,
}) {
  return await fetch("https://llmfoundry.straive.com/anthropic/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: [{ type: "text", text: human }] }],
      stream,
      temperature,
      ...(tools ? { tools } : {}),
      ...(tool_choice ? { tool_choice } : {}),
    }),
  }).then((r) => r.json());
}
