import { WorkflowEntrypoint } from "cloudflare:workers";
import { loadLicensedFeed, normalizeOffers, readBoundedJson, sha256 } from "./adapters.mjs";

function source(env, id) {
  if (typeof id !== "string" || !/^[a-z0-9-]{1,80}$/.test(id)) throw new Error("Invalid source");
  const sources = JSON.parse(env.HARDWARE_SOURCES || "{}");
  const policy = Object.hasOwn(sources, id) && sources[id];
  if (!policy?.enabled || !policy.historyAllowed || !Array.isArray(policy.offerHosts) ||
    !["reviewed-manifest", "licensed-feed"].includes(policy.adapter)) throw new Error("Source is disabled");
  return policy;
}

async function rpc(env, name, payload) {
  const response = await fetch(new URL("/rest/v1/rpc/" + name, env.SUPABASE_URL), {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000),
    headers: {
      authorization: "Bearer " + env.HARDWARE_INGEST_JWT,
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Database RPC " + response.status);
  return name === "hardware_ingest_policy" ? response.json() : undefined;
}

export class HardwareRefresh extends WorkflowEntrypoint {
  async run(event, step) {
    const { sourceId } = event.payload;
    const policy = source(this.env, sourceId);
    if (policy.adapter !== "licensed-feed") throw new Error("Source is not a licensed feed");
    const offers = await step.do("read permitted partner feed", async () => {
      const dbPolicy = await rpc(this.env, "hardware_ingest_policy", { requested_source: sourceId });
      if (dbPolicy?.adapter !== policy.adapter) throw new Error("Source disabled in database");
      return loadLicensedFeed(policy);
    });
    await step.do("enqueue normalized rows", async () => {
      // Each message is bounded by the normalization contract. Avoid the queue group payload limit.
      for (let offset = 0; offset < offers.length; offset += 20) {
        await this.env.HARDWARE_QUEUE.sendBatch(offers.slice(offset, offset + 20).map((offer) => ({
          body: { sourceId, offer },
        })));
      }
    });
  }
}

const hardwareWorker = {
  async fetch(request, env) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/intake") {
      return new Response(null, { status: 404 });
    }
    if (!env.HARDWARE_OPERATOR_TOKEN) return new Response(null, { status: 503 });
    const authorization = request.headers.get("authorization") || "";
    const supplied = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(authorization));
    const expected = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("Bearer " + env.HARDWARE_OPERATOR_TOKEN));
    if (!crypto.subtle.timingSafeEqual(supplied, expected)) return new Response(null, { status: 401 });
    let sourceId;
    let policy;
    let offers;
    try {
      const input = await readBoundedJson(request);
      sourceId = input.sourceId;
      policy = source(env, sourceId);
      if (policy.adapter === "reviewed-manifest") offers = normalizeOffers(input.offers, policy.offerHosts);
    } catch {
      return new Response("Invalid intake or disabled source", { status: 400 });
    }
    if (!offers) {
      const run = await env.HARDWARE_REFRESH.create({ params: { sourceId } });
      return Response.json({ workflowId: run.id }, { status: 202 });
    }
    for (let offset = 0; offset < offers.length; offset += 20) {
      await env.HARDWARE_QUEUE.sendBatch(offers.slice(offset, offset + 20).map((offer) => ({
        body: { sourceId, offer },
      })));
    }
    return Response.json({ accepted: offers.length }, { status: 202 });
  },
  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        const { sourceId, offer } = message.body;
        const policy = source(env, sourceId);
        const [row] = normalizeOffers([offer], policy.offerHosts);
        const dbPolicy = await rpc(env, "hardware_ingest_policy", { requested_source: sourceId });
        if (!dbPolicy || dbPolicy.adapter !== policy.adapter) throw new Error("Source disabled in database");
        const ageSeconds = (Date.now() - Date.parse(row.observed_at)) / 1000;
        if (ageSeconds < -300 || ageSeconds > dbPolicy.maxAge) throw new Error("Observation outside freshness window");
        const snapshot = JSON.stringify({ source_id: sourceId, ...row });
        const digest = await sha256(snapshot);
        const objectKey = policy.archiveAllowed && dbPolicy.archiveAllowed ? "hardware/" + sourceId + "/" + digest + ".json" : null;
        if (objectKey) {
          await env.HARDWARE_EVIDENCE.put(objectKey, snapshot, { httpMetadata: { contentType: "application/json" } });
        }
        await rpc(env, "hardware_ingest_offer", { payload: { source_id: sourceId, ...row, sha256: digest, object_key: objectKey } });
        message.ack();
      } catch (error) {
        console.warn("Hardware observation queued for retry", message.id, error instanceof Error ? error.message : "unexpected failure");
        message.retry();
      }
    }
  },
};

export default hardwareWorker;
