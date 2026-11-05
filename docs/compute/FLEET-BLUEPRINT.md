# AI agent fleet blueprint: mini PCs, Windows first

Status: research only, 2026-10-05. No machine here was tested hands-on. Buyer region is assumed to be the Netherlands/EU, which is still open. Every number below comes from `data/compute/` and carries its source there. Generated companions: `ENGINEERING-INDEX.md`, `COMPANY-FUNDAMENTALS.md`, `REVIEWS.md`, `VERIFICATION-LOG.md` and `EXPANSION-PATHS.md`. The reusable decision guide for other founders is `FOUNDER-BUYING-GUIDE.md`.

## What the research found

1. In the page-read data a 128 GB Strix Halo machine costs EUR 3,499.99 (GMKtec EVO-X3, EU store, tax not stated) to EUR 4,450.20 incl. VAT (GMKtec EVO-X2, Estonian shop). The lowest VAT-inclusive Dutch listing is the HP Z2 Mini G1a at EUR 3,890.15 (EUR 3,215 ex VAT) from a business reseller that ships when available. A 128 GB DDR5 kit went from USD 329 to USD 3,399 by 18 August 2026, and TrendForce expects DRAM up another 10-15% in Q4 2026. Framework's 128 GB mainboard alone is EUR 3,539 incl. VAT, while a complete Bosgame M5 128 GB/2 TB was EUR 2,439.95 on 24 June.
2. Token speed follows memory bandwidth. Strix Halo has 256 GB/s theoretical. On it, independent tests show 30-35B mixture-of-experts models at 43-86 tokens/s and 70B dense models at 3.7-5.3 (Q4_K_M and Q6_K runs on different machines); one secondary source reports 8-12 at Q4. Apple's M5 Max reaches 614 GB/s and the M5 Ultra 1.2 TB/s. A Mac Studio M5 Max with 64 GB is reported at EUR 3,689 (EveryMac; Apple's NL pages show no prices). No independent Apple tokens/s figure was verified.
3. Most Chinese Strix Halo machines share one board. A community wiki (no counting method stated) estimates the Sixunited platform at about 90% of them, including GMKtec, Bosgame, Corsair, FEVM and NIMO; its hardware page lists the EVO-X2 with the Sixunited board. Minisforum designs its own board. Framework names its partners: FSP for power, Cooler Master and Noctua for cooling.
4. Windows runs this hardware. Lemonade supports Windows 11 with Vulkan, ROCm and NPU backends and an OpenAI-compatible API. On Windows, AMD states up to 96 GB of GPU memory on a 128 GB machine through Variable Graphics Memory (Adrenalin 25.8.1 and later), but open LM Studio and llama.cpp issues report Vulkan loads failing or stalling near 64 GB with 96 GB set, and the AMD pages themselves would not load for the verification pass. Linux addresses about 124 GB through a community kernel setting (AMD documents a default of about half of RAM). On a 64 GB EVO-X2 the iGPU can take up to 48 GB (Notebookcheck).
5. Direct sourcing from Alibaba showed no price edge for a single unit. The one Strix Halo 128 GB listing (a search snippet) was USD 3,027-3,107 at MOQ 1.

## Roles in a fleet

| Role | Runs | Memory | Basis |
|---|---|---|---|
| Cockpit | Interactive sessions, headed browser | Existing laptop or desktop | n/a |
| Agent node | Background coding agents, headless browsers, builds | 32 GB for 10 sessions, 64 GB for 20 | Estimate: 1.0-1.5 GB per session plus 8-12 GB for build bursts, from one unpublished 30-minute profile of a 31 GB Windows machine. Replicate it with the method below before buying |
| Local model node | 30-35B mixture-of-experts, occasional 70B | 128 GB class | Size arithmetic: 25 GB and 46 GB including KV cache, plus 24 GB for the OS and 10 agent sessions |
| GPU box | Image and video generation | VRAM, not system RAM | Rent first |

Agent nodes need cores and RAM, not bandwidth. Page-read prices for 64 GB class machines: GMKtec EVO-X2 EUR 1,999.99 (tax not stated), EVO-X1 Pro EUR 1,499.99, Framework mainboard EUR 1,859 incl. VAT (board only). The cheaper serviceable route is SO-DIMM: Minisforum AI X1 Pro-370 at EUR 729 sale and GMKtec K11 from EUR 469.99, both without a verified RAM price, and DDR5 prices have risen sharply. That RAM cost is the open item for this route.

For the local model node, capacity alone gives:

| Machine | 30B MoE | 70B dense | 120B MoE |
|---|---|---|---|
| 64 GB class | yes | no | no |
| 96 GB (Mac Studio M5 Ultra) | yes | yes | no |
| 128 GB class | yes | yes | yes |

Speed is a separate question: independent tests of 70B dense models on 256 GB/s class memory gave about 4-5 tokens/s. That makes a 70B model a batch tool there, not an interactive one.

## When to buy

- Agent node: sample RAM and CPU every 5 seconds for 30 minutes on the machine you use now. Buy a node when median free RAM sits below your floor (4 GB is a reasonable one for Windows) during normal work, and when the same period shows the cost: longer task completion times, queue waits, retries or timeouts. Free RAM alone does not show that another machine will help.
- Local model node: buy when the monthly API cost of the tasks you would move is higher than the machine's monthly cost. The data holds no usage figures, so this trigger is open for each buyer.
- GPU box: rent until daily use justifies owning. At EUR 5,499 for an RTX 5090 against RunPod at USD 0.69-0.99 per hour, break-even is roughly 1.9-2.7 years of 8-hour days, before power and host costs. That arithmetic ignores the USD/EUR rate, whether a rented GPU gives equivalent results, how fully you would use an owned card, and the admin and recovery time an owned machine costs.

## Windows, Linux and Mac

Windows is cheaper to start and familiar. Windows 11 Home has no incoming Remote Desktop and no Hyper-V (both need Pro). Update restarts follow active hours of 8-17 by default, and Microsoft documents that the "no auto-restart" policy does not work as described, so agent sessions need a supervisor that survives reboots. WSL2 defaults to 50% of host RAM, NAT networking and a 60-second idle shutdown; set `.wslconfig` explicitly.

Linux has the best-documented Strix Halo path and is the only OS for the NVIDIA DGX Spark. Docker Desktop is free for companies under 250 employees and under USD 10M revenue.

macOS has the bandwidth lead and works as an always-on host: desktop Macs can restart after power loss, and launchd daemons run without a login. Apple hardware is not affiliate-eligible on the Apple program pages read.

Mixing them needs one network layer. Tailscale's free Personal plan covers 6 users and unlimited devices. Sunshine hosts on Windows, Linux and macOS and Moonlight clients exist for all three. Universal Control works only between Apple devices.

## Operating stack (all free or open source in the sources read)

Remote access: Tailscale and OpenSSH Server. Monitoring: Uptime Kuma, Beszel, Netdata or windows_exporter, all with Windows support. Backup: restic or Kopia to Backblaze B2 at USD 6.95 per TB per month. Secrets: Infisical (MIT, self-hostable) or 1Password service accounts. Microsoft Store NL lists Windows 11 Home at EUR 145.00 and Pro at EUR 259.00 (VAT not stated on the page); Pro is needed for Hyper-V and incoming Remote Desktop.

## Sourcing playbook

| Channel | Finding | Verdict |
|---|---|---|
| GMKtec EU store | Operator is Shenzhen GMK Technology under Hong Kong law, shipping from a Bremen warehouse. Its own pages disagree on returns (60 days in the FAQ, 7 days elsewhere) with a 15% restocking fee, and a German page states a two-year warranty. | Ask for the written EU terms and an invoice with a VAT ID before paying |
| Minisforum EU store | Seller is Micro Computer (HK) Tech Limited. 30 days from delivery for unopened items, customer pays return shipping unless the item is defective or wrong, 24-month warranty (36 months for EU orders from 2026-03-09). Sale and regular prices, tax not stated. | Clear written terms; no EU VAT ID found |
| Framework | Framework Computer B.V., Eindhoven (VAT NL864030204B01), ships from the Netherlands, 30-day return, 2-year guarantee, prices include taxes. Out of stock on the day read. Trustpilot 2.5 from 53 reviews; a customer-data breach in August 2026 is reported from search snippets. | Framework's EU entity and VAT number are documented on its own pages; the other makers' entities were not resolved by this research. Highest price for 128 GB among the complete options |
| B2B reseller | HP Z2 Mini G1a EUR 3,890.15 incl. VAT, ships when available | Cheapest verified in-NL 128 GB with VAT stated; confirm the SKU |
| Alibaba | One Strix Halo 128 GB listing seen (a search snippet) at USD 3,027-3,107, MOQ 1; no landed quote obtained | No price edge shown for one unit; use for samples and ODM talks |
| Refurbished business mini PCs | EUR 164-495 on refurbed.nl, 4-16 GB base RAM | Light agent nodes only |
| Used Mac Studio, used GPUs | Marktplaats, Tweakers V&A and Back Market NL blocked; used RTX 3090 EUR 660-1,039 from four snippets | Unverified |

Import facts, with their sources in the data: from 1 July 2026 until 1 July 2028 a EUR 3 duty applies per item category on parcels up to EUR 150, which does not touch a 128 GB machine. The 2026 EU tariff schedule shows duty-free for computers under 8471 30, 41, 49 and 50, and Douane says import VAT is usually 21% (live TARIC measures for Chinese origin were not retrievable). EU consumers get a 14-day withdrawal right and a 2-year legal guarantee that a store policy cannot waive; neither applies to business purchases, and Dutch rules on business-to-business limits were not read. GMKtec's German shipping policy says that for shipments from China it generally declares a lower goods value to reduce customs costs, and no page names the importer of record. Customs undervaluation is a compliance risk for the buyer and must not be used.

## Growing past one box

The evidence in `EXPANSION-PATHS.md` is thin and mostly secondary, so treat it as a lead for your own test. More agents mean more independent nodes, because agents do not need a cluster. For a bigger local model, the reported runs favour more memory in one machine: two-node llama.cpp over direct USB4 (Linux) gave 15.35 tokens/s on a 139B model and 12.6 on a 397B model, and a four-node Framework test over 5GbE matched a single node at about 8.25 tokens/s. Those runs differ in model, quantisation and setup and the method is described as experimental, so they do not establish a general rule. For an external GPU, OCuLink is PCIe 4.0 x4 (about 8 GB/s in theory, about 6.7 GB/s in a gaming test). One blog reports an RTX 5080 16GB over OCuLink running about 3 times the iGPU when the model fit in VRAM and 1.6 tokens/s when it did not, and an RTX Pro 6000 at 121 tokens/s on a 122B model but 37-38 when split with the iGPU; Level1Techs threads report Windows 11 instability with iGPU plus dGPU. No measured image or video generation numbers over OCuLink exist in the data, so rent first. RAG fits comfortably: 1M chunks need about 4-6 GB of vector memory.

## Building machines or partnering

- White-label on an existing platform: Sixunited supplies the AXB35 board and a stock case, so an own brand can start with case, firmware and packaging. No public Sixunited MOQ, NRE or certification cost was found. Search snippets for generic Shenzhen mini PCs show custom branding from 500-1,000 units and 30-60 days of lead time. Neither is verified for Strix Halo.
- Reseller route: Minisforum's bulk programme starts at 10 units with wholesale pricing, a 3-year warranty and a German warehouse. Beelink offers ODM and OEM through wholesale@bee-link.com.
- Framework's model, a standard board plus named partners, is the closest public example of designing the case, cooling and power around a vendor platform.
- No evidence was found that Taiwan ODMs such as Compal, Wistron or Quanta build these machines. Lite-On, FSP and Cooler Master are Taiwan component suppliers named in sources.

A sensible order is reseller or integrator first, then a co-branded case, then a board. The data does not support a manufacturing plan: certification costs for CE, RoHS, WEEE and ecodesign have no sourced figure.

## Revenue routes

Affiliate programs found: Minisforum 2% on Awin, 30-day cookie (page also says 7 days). Beelink 5-10% and Framework 1-5% are directory claims. GMKtec is on Awin with terms behind signup. Amazon's NL and DE fee pages conflict (6% and 5% for electronics). Apple's program covers digital content only. Minisforum's terms apply 2% to the price excluding VAT and postage, so a EUR 4,000 machine incl. 21% VAT earns about EUR 66 before reversals.

Disclosure: Awin requires #Ad or #sponsorship style labels, which is stricter than a footer note. The Dutch advertising code requires recognisable advertising. UK specifics were not verified.

Fleet offer: hardware resale margins appear as about 30-40% in one source and about 16% in another (both search summaries). Managed IT services show gross margins of 50-60% and USD 2,000-3,000 per month for a fully managed team of up to 20, from search summaries and for conventional IT, not AI fleets. No sourced price exists for an AI-agent fleet setup fee or retainer. Adjacent offers: Puget Systems from USD 4,812.73, tinygrad tinybox, Framework Desktop (no managed agent layer) and the Dutch AiBitches.nl (software modules, no price). This blueprint makes no revenue forecast.

## Research programme

Re-verify each price before it is used for a decision, and treat anything older than 30 days as stale. The validator warns on that and refuses a price without a date, an Amazon price, a variant that disagrees with the machine's memory, or a measurement claim that rests only on search snippets.

`VERIFICATION-LOG.md` records what each earlier "not verified" statement became. Still open and relevant to a purchase:

1. Coolblue, Megekko and Azerty prices, and Tweakers listings for the MS-S1 MAX, Bosgame M5 and Framework Desktop (Tweakers had none).
2. Independent LLM speed tests of the 64 GB EVO-X2 and any independent noise, power or LLM data for the EVO-X3.
3. A primary AMD or Microsoft page for the Windows 96 GB figure (the AMD pages never loaded), and a fix or confirmation for Vulkan loads near 64 GB.
4. Mac Studio M5 Max 128 GB and M5 Ultra configured prices in EUR, and any independent Apple tokens/s.
5. Dutch used-market prices (Marktplaats blocked the browser).
6. Compatibility of the DIY parts with the Framework mainboard; the DIY totals are indicative.
7. Live TARIC measures for Chinese origin, the CE directives that apply to a mini PC, who is importer of record on a GMKtec German-store order, and Dutch business-to-business warranty rules.
8. VAT ID or OSS registration for GMKtec, Minisforum, Beelink and Bosgame, and Bosgame's legal entity and terms.
9. Sixunited MOQ, NRE and certification costs.
10. GMKtec's affiliate commission (behind Awin signup) and Minisforum's wholesale terms (behind a form): owner actions.

Only the owner applies to affiliate programs, contacts makers for wholesale or ODM terms, or makes a purchase.
