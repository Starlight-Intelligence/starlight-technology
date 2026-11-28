# Reproduce the review

Use Node 24 and the repository's pinned pnpm. The route stays out of discovery pending review.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm verify
node --test scripts/compute/compute.test.mjs
node scripts/compute/build.mjs --check
node scripts/compute/decision-import.mjs > /tmp/compute-seed.sql
corepack pnpm dev
```

Open `/compute`. The same library is available at
`/api/compute/compare?budgetEur=4500&workload=code-assist&monthlyGpuHours=40`.
On the archived source revision and 2026-11-21 as-of day the outcome is a cloud quote/pilot for the coding profile and a hold for private large-model inference. Relevant observations age out; use the exact Git revision and explicit as-of date in the unit-test fixture to replay the original answer.

## Workload portability

Use the checked-in [protocol](workload-protocol.json). Build the same pinned llama.cpp revision with CUDA, HIP/Vulkan, or Metal on the respective platform. Keep every benchmark arm's OS image, driver and compiler revision in its run metadata. Copy a read-only model file and compare SHA-256 to a separately reviewed expected digest. Keep test repositories local or use a permitted cloud workspace. Pin all inputs and record whether the model ran wholly on the accelerator.

Example after you have a reviewed binary and model. No model downloads or cloud calls are part of the repo verification.

```sh
LLAMA_SERVER=/absolute/path/to/pinned/llama-server
MODEL_GGUF=/absolute/path/to/verified/model.gguf
"$LLAMA_SERVER" --model "$MODEL_GGUF" --host 127.0.0.1 --port 8080 \
  --ctx-size 4096 --parallel 1 --n-gpu-layers 999
```

On Apple this is a native Metal process. For a cloud arm set the provider's runtime to the same CUDA build and expose the service only over a private authenticated tunnel. Run a no-secret task corpus through the same acceptance oracle; compare cost for the same accepted work rather than comparing nominal GPU hours.

## Database review

Apply the migration and generated import only to a disposable PostgreSQL staging instance with Supabase-like roles. Import twice and confirm observation counts remain stable. Check that anon, authenticated and service_role cannot read the schema. A service binding for explicitly reviewed dedicated roles is a separate runtime change.
