import { recommendBuild, type FinderInput } from "./decision-model";
import type { WebTool } from "./webmcp.mjs";

function validate(input: unknown): FinderInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Expected an object.");
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== 3 || typeof value.workload !== "string" ||
      typeof value.budget !== "string" || typeof value.priority !== "string" ||
      !["local-ai", "travel", "studio"].includes(String(value.workload)) ||
      !["1500", "3000", "7000"].includes(String(value.budget)) ||
      !["performance", "mobility", "balance"].includes(String(value.priority))) {
    throw new Error("Choose a supported workload, planning budget and priority.");
  }
  return { workload: value.workload, budget: value.budget, priority: value.priority } as FinderInput;
}

export function createFinderTools(getInput: () => FinderInput, setInput: (input: FinderInput) => void): WebTool[] {
  const snapshot = () => ({
    input: { ...getInput() },
    direction: recommendBuild(getInput()),
    status: "planning_direction",
    caveat: "Rules-based starting direction. Not a quote, validated configuration or purchase recommendation.",
  });
  return [
    {
      name: "starlight_read_system_direction",
      title: "Read the current system direction",
      description: "Read the visible system finder's workload, planning budget, priority and rules-based result.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length) {
          throw new Error("This action accepts an empty object.");
        }
        return snapshot();
      },
    },
    {
      name: "starlight_configure_system_direction",
      title: "Configure the system direction",
      description: "Update the visible system finder and return its new planning direction. Does not save, order equipment or verify merchant offers.",
      inputSchema: {
        type: "object",
        properties: {
          workload: { type: "string", enum: ["local-ai", "travel", "studio"] },
          budget: { type: "string", enum: ["1500", "3000", "7000"] },
          priority: { type: "string", enum: ["performance", "mobility", "balance"] },
        },
        required: ["workload", "budget", "priority"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        setInput(validate(input));
        return snapshot();
      },
    },
  ];
}
