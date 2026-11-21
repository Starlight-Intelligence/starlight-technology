export interface CollectionSource {
  id: string;
  feedUrl: string;
  approved: boolean;
  maxCallsPerDay: number;
  maxCostMicrosPerDay: number;
  reservedCostMicros: number;
}

type Reservation = {
  settle(result: { status: "collected" | "retry" | "rejected"; chargedAtMostMicros: number }): Promise<void>;
};

interface CollectionDependencies {
  // The existing envelope/ledger must enforce these caps atomically across
  // callers and deduplicate active attempt IDs before a provider call.
  reserve(input: { sourceId: string; attemptId: string; callCap: number; costCap: number; cost: number }): Promise<Reservation | null>;
  fetch: typeof fetch;
  accept(sourceId: string, body: Uint8Array): Promise<void>;
}

const maxFeedBytes = 256 * 1024;

async function readBounded(response: Response) {
  if (!response.body || Number(response.headers.get("content-length")) > maxFeedBytes) return null;
  let size = 0;
  const chunks: Uint8Array[] = [];
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxFeedBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export async function collectApprovedFeed(source: CollectionSource, attemptId: string, deps: CollectionDependencies) {
  if (!source.approved || !attemptId || !Number.isSafeInteger(source.maxCallsPerDay) || source.maxCallsPerDay < 1 ||
      !Number.isSafeInteger(source.reservedCostMicros) || source.reservedCostMicros < 0 ||
      !Number.isSafeInteger(source.maxCostMicrosPerDay) || source.maxCostMicrosPerDay < source.reservedCostMicros) return "disabled";
  let url: URL;
  try {
    url = new URL(source.feedUrl);
  } catch {
    return "disabled";
  }
  if (url.protocol !== "https:" || url.username || url.password) return "disabled";

  const reservation = await deps.reserve({
    sourceId: source.id, attemptId, callCap: source.maxCallsPerDay,
    costCap: source.maxCostMicrosPerDay, cost: source.reservedCostMicros
  });
  if (!reservation) return "budget-exhausted";

  let status: "collected" | "retry" | "rejected" = "rejected";
  let retryAfterSeconds: number | undefined;
  try {
    const result = await deps.fetch(url, { redirect: "error", signal: AbortSignal.timeout(10_000) });
    if (result.status === 429 || result.status >= 500) {
      status = "retry";
      const header = result.headers.get("retry-after");
      const seconds = header && /^\d+$/.test(header) ? Number(header) : header ? Math.ceil((Date.parse(header) - Date.now()) / 1000) : NaN;
      retryAfterSeconds = Number.isFinite(seconds) ? Math.min(3600, Math.max(60, seconds)) : 60;
    } else if (result.ok && result.headers.get("content-type")?.split(";")[0].trim() === "application/json") {
      const body = await readBounded(result);
      if (body) {
        await deps.accept(source.id, body);
        status = "collected";
      }
    }
  } catch {
    status = "retry";
  } finally {
    await reservation.settle({ status, chargedAtMostMicros: source.reservedCostMicros });
  }
  return { status, retryAfterSeconds };
}
