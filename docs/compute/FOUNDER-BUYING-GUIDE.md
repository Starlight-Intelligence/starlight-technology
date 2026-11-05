# Founder guide: choosing always-on AI compute

Status: research only, 2026-10-05. No machine was tested hands-on. The buyer is assumed to be in the Netherlands or the EU, which is still open. Every figure comes from `data/compute/` and its source is recorded there. The record is validated before it builds: a price needs a date, its own opened source and a matching memory size. Details are in `ENGINEERING-INDEX.md`, `COMPANY-FUNDAMENTALS.md`, `REVIEWS.md`, `VERIFICATION-LOG.md` and `EXPANSION-PATHS.md`.

## Start with the workload

Memory capacity decides what loads. Memory bandwidth decides how fast it runs. Price both against the workload you can name.

| Workload | Memory it needs | What decides speed | What the data shows |
|---|---|---|---|
| Agent sessions with a headless browser | about 1.0-1.5 GB each (an estimate from one laptop profile) | RAM and cores | 32 GB for 10 sessions, 64 GB for 20, before builds |
| 30-35B mixture-of-experts model at Q4 | about 25 GB with context | bandwidth | 43-86 tokens/s measured on Strix Halo |
| 70B dense model at Q4 | about 46 GB with context | bandwidth | 3.7-5.3 tokens/s measured; one secondary report says 8-12 |
| 120B-class mixture-of-experts | about 87 GB with context | bandwidth | 19.2 tokens/s on an MS-S1 MAX, about 60 on a DGX Spark |
| RAG over 1M text chunks | about 4-6 GB of vectors | RAM | fits beside agents on 64 GB or 128 GB (vendor formulas, not a co-run) |
| Image and video generation | GPU VRAM | the GPU | rent first; no measured numbers over OCuLink |

Strix Halo machines have 256 GB/s of memory bandwidth in theory. NVIDIA's DGX Spark has 273 GB/s and Apple's M5 Max 614 GB/s. Apple's M5 Ultra has 1.2 TB/s. Bandwidth explains why a 70B dense model stays at 4-5 tokens/s on Strix Halo however much memory it has.

## Pick the memory class

| Class | Fits | Notes from the evidence |
|---|---|---|
| 32 GB | up to 10 agent sessions | no local model beside them |
| 64 GB | 20 sessions, or a 30B model beside about 10 sessions | on the EVO-X2 the iGPU can take up to 48 GB and leave 16 GB for the system (Notebookcheck) |
| 96 GB | a 70B model beside agents | Mac Studio M5 Ultra base, EUR 6,649 reported |
| 128 GB | 70B and a 120B-class model | EUR 3,499.99 (GMKtec EU store) to 4,450.20 (a retailer, VAT included) for Strix Halo in the page-read data |
| 192 GB | larger models and many sessions | EUR 7,799 for the Minisforum MS-S1 MAX-P495 (sale), no independent review found |

Windows and Linux differ on GPU memory. AMD states up to 96 GB on a 128 GB machine under Windows (Variable Graphics Memory, Adrenalin 25.8.1 and later), but open LM Studio and llama.cpp issues report Vulkan loads failing or stalling near 64 GB with 96 GB set. On Linux about 124 GB is a community kernel setting, and AMD documents a default of about half of RAM. A large model on a Windows machine is unproven until you load it.

## Check who you are buying from

Terms you cannot enforce change what a machine really costs. These are the documented facts for five makers. Framework is the only one whose EU entity and VAT number the research documented; for the others, "no VAT ID found" means the research did not find one, not that none exists.

| Maker | Entity behind the EU store | Return and warranty as written | Flags |
|---|---|---|---|
| Framework | Framework Computer B.V., Eindhoven, VAT NL864030204B01 (documented on Framework's own pages), ships from the Netherlands | 30 days, 2-year guarantee, prices include taxes | venture-funded; Trustpilot 2.5 from 53; a customer-data breach in August 2026 (search snippets) |
| Minisforum | Micro Computer (HK) Tech Limited, Hong Kong; German repair centre | 30 days from delivery for unopened items, customer pays return shipping unless defective; 24 months, 36 for EU orders from 2026-03-09 | no EU VAT ID found; Trustpilot has only 6 reviews |
| GMKtec | Shenzhen GMK Technology, under Hong Kong law; Bremen warehouse | its own pages disagree: 60 days in the FAQ, 7 days elsewhere, 15% restocking fee; German page states a two-year warranty | declares a lower goods value on China shipments; Trustpilot score withheld, fake reviews removed |
| Beelink | 'Beelink, Inc.' in the EU store footer; no EU entity found | 3-year warranty, 30-day return, VAT included | support by email and a China-hours phone line; Trustpilot 3.2 from 43 |
| Bosgame | not established | not recorded (the site blocked the fetch) | Notebookcheck says it is not EU-based and warranty rights would be hard to enforce |

Questions to put in writing before paying:

1. Which legal entity sells to me, and what is its VAT number?
2. Will the invoice show VAT, so a registered business can reclaim it?
3. Who is the importer of record, and what customs value is declared? A seller that says it generally declares a lower value to cut duty leaves the buyer exposed to recovery of duty and VAT.
4. Are returns and warranty stated as one set of numbers, and do they match the law for my buyer type?
5. Where does the unit ship from? Stock in a German warehouse avoids the import step; stock shipped from China adds it.

The law differs for consumers and businesses. For a qualifying consumer sale, Directive 2011/83 gives 14 days to withdraw from a distance purchase and Directive 2019/771 gives a 2-year legal guarantee, and a store policy cannot waive either for the consumer. A consumer is someone acting outside their trade or business, and Your Europe says the withdrawal rules do not apply when selling to other businesses. How far a business seller may shorten the guarantee for a business buyer depends on Dutch civil law, which the research did not read (the guarantee item is only partially verified). This is research, not legal advice.

EU import facts, from primary texts: the 2026 tariff schedule shows duty-free for computers under 8471 30, 41, 49 and 50 (live TARIC measures for Chinese origin were not retrievable). Import VAT is usually 21%, and the article 23 permit lets an entrepreneur defer it to the next VAT return. The EUR 3 low-value duty (1 July 2026 to 1 July 2028) covers consignments up to EUR 150 and does not touch a multi-thousand-euro machine.

## Weigh the evidence

| Level | Meaning |
|---|---|
| Page-read price | read on a merchant, manufacturer or price-comparison page whose host matches the merchant, with its date |
| Independent review | an outlet that bought the unit or says the maker did not influence it; a maker-supplied unit is labelled |
| Sponsored | the maker paid or discounted; treated as marketing |
| Owner report | a forum, issue or review post; useful for defects, not for rates |
| Snippet | search-result text only; carries no numbers in this record |

For the EVO-X2 there are five reviews, but only ServeTheHome gives speed and noise numbers and it tested 128 GB. No independent speed test of the 64 GB unit exists in the record. For the EVO-X3 there is one independent hands-on review and one sponsored post. The MS-S1 MAX has four reviews, all of the 128 GB model. Noise figures conflict (EVO-X2 41-43 dBA to about 50; MS-S1 MAX 43 to 53), and the record shows them side by side.

## Growing past one box

- More agents mean more independent nodes. Agents do not need a cluster.
- A bigger local model points to more memory in one machine. In the reported runs, two-node llama.cpp over direct USB4 on Linux gave 15.35 tokens/s on a 139B model and 12.6 on a 397B model, against 42.7 and 86.1 tokens/s for single-node runs of smaller models, and a four-node Framework test over 5GbE matched one node at about 8.25 tokens/s with an author who recommends scaling vertically. Those runs differ in model, quantisation and setup and the method is described as experimental, so they show clustering fitting larger models in those cases, not a general rule. No Windows cluster path is documented for Strix Halo.
- OCuLink is PCIe 4.0 x4: about 8 GB/s in theory and about 6.7 GB/s in a gaming-test comparison (not AI inference). One blog (secondary, no model names or conditions) reports an RTX 5080 16GB over OCuLink on a Strix Halo mini PC running about 3 times the iGPU when the model fit in VRAM and 1.6 tokens/s when it did not. The same blog reports an RTX Pro 6000 at 69 tokens/s on a 32B model and 121 on a 122B mixture-of-experts model, and 37-38 when that model was split with the iGPU. Level1Techs forum threads report instability and 35-40% slowdowns with iGPU plus dGPU on Windows 11. These are single reports. Measure on your own model before buying, or rent. Docks seen: Minisforum DEG1 at EUR 109.
- Racks: Minisforum markets 2U mounting for the MS-S1 MAX; the page does not say what network produced its two-node and four-node figures.

## Windows, Linux and virtual machines

- Windows 11 Home has no Hyper-V and cannot host incoming Remote Desktop. Pro does (EUR 259 on Microsoft Store NL, Home EUR 145; VAT not stated on the page).
- AMD documents WSL2 ROCm support for Strix and Strix Halo (Adrenalin 26.2.2 or later, Ubuntu). Microsoft's Hyper-V GPU partitioning document is Windows Server only and does not list Strix Halo, so keep the local model on the host and have virtual machines call it over its OpenAI-compatible API.
- WSL2 defaults to 50% of host RAM, NAT networking and a 60-second idle shutdown; set `.wslconfig` explicitly. Docker Desktop is free for companies under 250 employees and under USD 10M revenue.
- Windows restarts after updates outside active hours (default 8-17), so an always-on agent session needs a supervisor that survives reboots.

## Red flags

- A seller that states it declares a lower customs value.
- Return and warranty terms that contradict each other across its own pages.
- An operator under foreign law with no EU entity or VAT number.
- A review corpus with a withheld score or removed fake reviews, and reviews of maker-supplied or sponsored units presented as independent.
- A price with no tax status, or a sale price with no end date.
- Memory prices still moving: a 128 GB DDR5 kit went from USD 329 to USD 3,399 by 18 August 2026, and TrendForce expects DRAM up 10-15% in Q4 2026.

## Before you pay

1. Write down the workload and the memory it needs (table above).
2. Check the price on two pages and note the tax status and the date.
3. Read at least two independent reviews of the exact memory variant, and any owner reports.
4. Get the legal entity, VAT number, return terms, warranty terms and shipping origin in writing.
5. Decide the buyer type (consumer or business), because it changes your rights.
6. Plan the failure case: a spare node, a backup of the model weights, and a return window long enough to load your largest model.
7. Re-verify the price on the day you order; this record treats anything older than 30 days as stale.

## Keeping this current

Rebuild after any change with `node scripts/compute/build.mjs`; CI fails if a generated file drifts. The validator refuses undated prices, Amazon prices, prices without a source on the merchant's own host, and measurement claims that rest only on snippets. Add a review, a company fact or a verification item as a record in `data/compute/`, with its source, and rerun.
