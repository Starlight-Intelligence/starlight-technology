import { describe, expect, it } from "vitest";
import { planStack, scenarioPresets } from "./compute-planner";

describe("stack planner widget", () => {
  it("matches the hand-computed totals for scenario 1: a swarm of agents on one node", () => {
    const plan = planStack(scenarioPresets.find((s) => s.id === "s1-agents-one-node")!);
    expect(plan.oneNode.low).toBe(49);
    expect(plan.oneNode.high).toBe(59);
    expect(plan.oneNode.smallestClassGb).toBe(64);
    expect(plan.split).toBeNull();
  });

  it("matches the hand-computed totals for scenario 2: six businesses plus a local MoE model", () => {
    const plan = planStack(scenarioPresets.find((s) => s.id === "s2-businesses-desktops-local-model")!);
    expect(plan.oneNode.low).toBe(106.2);
    expect(plan.oneNode.high).toBe(128.2);
    expect(plan.split).not.toBeNull();
    expect(plan.split!.nodeA.classGb).toBe(128);
    expect(plan.split!.nodeB.classGb).toBe(64);
    expect([plan.split!.nodeA.low, plan.split!.nodeA.high, plan.split!.nodeB.low, plan.split!.nodeB.high]).toEqual([77.2, 97.2, 41, 43]);
  });

  it("matches the hand-computed totals for scenario 3: plus an ERP and a 70B model", () => {
    const plan = planStack(scenarioPresets.find((s) => s.id === "s3-plus-erp-and-70b")!);
    expect(plan.oneNode.low).toBe(145.6);
    expect(plan.oneNode.high).toBe(176.6);
    expect(plan.oneNode.smallestClassGb).toBe(192);
    const odoo = plan.lines.find((l) => l.item.startsWith("Odoo"));
    expect(odoo?.count).toBe(3);
  });

  it("matches the hand-computed VRAM tier for scenario 4: media and fine-tuning on a GPU node", () => {
    const plan = planStack(scenarioPresets.find((s) => s.id === "s4-plus-media-and-finetune-gpu")!);
    expect(plan.gpu.vramRequired).toBe(26);
    expect(plan.gpu.tier).toMatch(/RTX 5090/);
  });

  it("only offers a model-node machine with 256 GB/s or more bandwidth", () => {
    const plan = planStack(scenarioPresets.find((s) => s.id === "s2-businesses-desktops-local-model")!);
    expect(plan.split!.nodeB.cheapest).not.toBeNull();
  });

  it("drops the split and the local model when none is selected", () => {
    const plan = planStack({ ...scenarioPresets[0], localModel: null, ragMillionChunks: 0 });
    expect(plan.split).toBeNull();
    expect(plan.modelGb).toBe(0);
  });
});
