# QASPER FULL2 evaluation tools

Scope: original PDF and DOCX input fixtures only. These are evaluation tools, not application fixes. The approved plan/log is docs/evaluation/qasper-v2-evaluation.md. The current revision implements primary data acquisition, deterministic50-paper Word construction, targeted loader checks, full coverage preparation, isolated services/API-child prerequisites, HTTP uploads and once-only guarded baseline results. It is NOT completion of all14test blocks. Custom application scenarios, original-PDF evidence alignment review, rendered DOCX QA, full citation/page verification, isolated UI/concurrency/lifecycle/failure simulations and independent semantic scoring remain subsequent phases.

All cloud calls require a reviewed tool revision, configured backend credentials, explicit free-plan confirmation and the explicit29October2026IST continuation: local day ends2026-10-29T18:30:00Z, but this segment stops earlier at the next provider reset2026-10-29T00:00:00Z (05:30IST); no automatic reset continuation. First429/quota3036/auth failure latches a durable stop; no retries, paid capacity, added providers or next-day continuation. Unknown/missing usage is retained, not counted aszero. Reservations precede dispatch and remain durable under failures. InputUTF8bytes+512 and outputdefault2000/rewrite48 are conservative token reservations; prior account usage remains unknown and the provider free-tier limit is authoritative.

## Offline data and targeted checks

- node acquire-pdfs.mjs --index PAPER_INDEX --out OWNED_PDF_DIR (one active source request, >=3.1s response spacing, no same-paper automatic retry).
- python build-fixtures.py --data PREPARED_DATA --out NEW_WORD_DIR (first50sortedIDs,163questions; declared structured source, not original author Word; OOXML/source paragraph checks, no visual certification).
- node --test scripts/evaluation/offline.test.mjs
- node scripts/evaluation/verify-fixtures.mjs --data DATA --word WORD_DIR --out NEW_REPORT

Do not rerun the builder into an existing output directory. Keep first artifacts/results. Credentials are never arguments or fixture content.

## Frozen run preparation

node scripts/evaluation/run.mjs --stage prepare --data DATA --pdf PDF_DIR --word WORD_DIR --id 20261028-r1 --out NEW_RUN_DIR

Preparation records all1005PDFquestion coverage rows plus163DOCXrows; provisional unanswerable/visual/mixed labels do not exclude execution. Source-unavailable rows remain reported. PDF/DOCXcases are interleaved perpaper/question. The large run refuses until initial PDF acquisition accounted for all281targets. Original/title-prefixed wordings are saved but only title-prefixed wording receives one baseline answer performat.

## Owned services and actual HTTP ingestion

services.mjs is dry-run by default; --apply reviewed-isolated starts only cached images with --pull=never, own labels/names/volumes and loopback ports. It never stops/changes shared containers. Ports must be available; a failure leaves owned resource records for inspection. Services are not auto-deleted.

node scripts/evaluation/services.mjs --out RUN_DIR --apply reviewed-isolated
node scripts/evaluation/child-server.mjs --out RUN_DIR --format pdf --migrate yes

Start one child performat using the same configured backend environment (for example node --env-file=BACKEND_ENV). Cloud is disabled on APIchildren unless --cloud reviewed-free-today is explicitly supplied. The child binds127.0.0.1, sets owned PostgreSQL/Qdrant/document/sparse/TEMP paths before importing the unchanged API, and captures perrequest traces with AsyncLocalStorage. There are two APIpools of10connections; owned Postgres has30maximum connections, leaving migration/check capacity. APIchild migrations use actual unchanged migrations and close their pool. Capture console/error logs only in owned artifacts.

node scripts/evaluation/child-server.mjs --out RUN_DIR --format pdf
node scripts/evaluation/child-server.mjs --out RUN_DIR --format docx
node scripts/evaluation/run.mjs --stage ingest --format pdf --out RUN_DIR
node scripts/evaluation/run.mjs --stage ingest --format docx --out RUN_DIR

Primary ingestion is actual multipartHTTPPOST/ingest, not a function-only substitute. --limit1 allows an ingestion-only preflight; later runs skip attempted documents rather than uploading duplicates. Network/persistence failures stop instead of retrying blindly. All available documents in both collections must finish indexing before baseline questions.

## Guarded once-only baseline

node --env-file=BACKEND_ENV scripts/evaluation/preflight.mjs --free-plan user-confirmed --out RUN_DIR/credential-preflight.json
node --env-file=BACKEND_ENV scripts/evaluation/run.mjs --stage baseline --cloud reviewed-free-today --out RUN_DIR
node scripts/evaluation/run.mjs --stage summary --out RUN_DIR

Actual answerQuestion is called once perunattempted eligible format/question. A uniquely asserted passive in-memory loader hook records actual preparedchunks/passages/prompt; actual returnedcitations are retained. No appdisk edits, second generation or expected-answer prompt insertion. Original source hashes must match the freeze. Budgeted rewrite calls are also attributed; standalone baseline calls have no history.

Attempt rows and provider reservations are saved before dispatch. A crash/unknown result remains attempted; resuming never replays it automatically. Manual reconciliation is required. The ledger lock is not stolen. Logs store no headers/account IDs/tokens or raw provider errors. HTTPnonstreaming baseline calls preserve the provider's default answer cap. Streaming transport support exists in theguard for the later APIphase; it has not been runtimevalidated here.

Evidence fields distinguish full-paragraph normalized matches from sentence coverage; numeric values, units and negation are preserved. Citation placeholders/real PDFreference differences, hyphenation and visual evidence still require alignment review. Reference tokenF1/exact screens are diagnostics only. All semantic verdicts remain pending until independent review; no result is automatically declared correct or safe merely because it matches keywords/refusal patterns.

## Fail-closed revision R3 protections

The immutable run.json is sealed by run.sha256; coverage and input manifests plus application/tooling sources are checked at execution/resume and before hosted dispatch. Application source includes all src modules, migrations, dependency lock/configuration and the unchanged migration entry point. The append-only checkpoint log/results/ledger are intentionally not code-freeze invariants. Freeze a fresh run after approved tooling and source-resolution changes; do not modify a prepared queue in place.

All execution endpoints derive from the matching run-owned services.json registry, validated Docker labels and loopback bindings. Cross-format API overrides and shared Qdrant ports are rejected. API health requires the owned run/format identity headers. Both the driver and API child apply the frozen embedding/retrieval/context settings before imports, assert actual imported config and share source/credential checks. A fresh credential-preflight.json must bind the exact sealed run. API cloud flags cannot bypass those checks. Deadline abort remains active through provider body consumption; fragmented LF/CRLF metadata captures usage and latches quota3036 immediately. Offline mocked checks exercise quota/cancel cleanup; live streaming remains unverified.

## Explicit29October continuation and PDF skips

The28October run/evidence stays immutable. The user renewed free-only requests for29October and instructed failing PDFs be skipped. Do not re-run prepare or re-upload completed papers. After reviewed continuation tooling, invoke:

node scripts/evaluation/continue.mjs --from OLD_PRIMARY_RUN --out NEW_CONTINUATION_DIR --id 20261029-continuation-r1 --reconciliation OLD_PRIMARY_RUN/reconciliation-20261029.json --reviewed-r3 ARTIFACT_ROOT/tooling-review-r3.json

This links the original sealed baseline, exact reviewed old/new tooling hashes and read-only state proof; retains the same case IDs, collection IDs, Docker-owned resources and ports; copies working document/sparse/ingestion state and starts a new authorization/credential/Cloudflare ledger segment. No containers/collections are recreated. Start the child APIs against NEW_CONTINUATION_DIR after the existing owned containers pass identity checks. Run the local-only credential protection scan again, then ingest remaining PDFs/DOCX and only then baseline. No repeat technical model probes.

1708.06185 has zero document/vector state and is explicitly excluded without retry:1PDF/3questions. Original coverage remains1005PDF+163DOCX=1168 entries; initial execution target1002PDF+163DOCX=1165 answers.181 already indexed PDFs are inherited, leaving99PDF and50DOCX uploads. Future file failures add explicit PDF skip records only after owned health passes and no partial source state is confirmed. Partial/unknown state pauses for reconciliation. Repeated unexplained infrastructure-like failures pause for diagnosis rather than mass-labeling PDFs; consecutive clearly file-specific load/type failures may be skipped. DOCX failures pause. No automatic retries or application fixes.

The renewed segment hard stop is2026-10-29T00:00Z, earlier than the recorded local-calendar authorization end18:30Z. First quota/rate exhaustion stops immediately even before that boundary. Prior account consumption remains unknown; no paid use or automatic continuation after quota/reset is allowed.

### Superseding user scope:200 successful PDFs and50 DOCX

The user explicitly reduced primary scope to200 successfully indexed PDFs plus the same50 DOCX. The continuation inherits181 successful PDFs, skips1708.06185 without retry, prioritizes15 missing Word-paired PDFs then next original-order eligible papers until19 further successes. PDF ingestion stops at200 successes.69 successful uploads remain initially (19PDF+50DOCX), with extra PDF candidates used only to replace recorded failures. No answer results inform selection.

After200 PDF successes the runner seals pdf-cohort.json/pdf-cohort.sha256 and cohort-coverage.jsonl. Original1168 coverage rows stay unchanged; excluded failures and PDFs outside the new user scope are distinct. The initial deterministic candidate cohort is expected to cover708PDF questions +163DOCX=871 answers; publish actual final counts after indexing, since replacements can change them. Guarded baseline refuses until exactly200PDF and50DOCX are successfully indexed and cohort/coverage hashes agree. Only selected PDF rows and all selected DOCX rows receive one answer; original281/1005 raw metadata is retained.
