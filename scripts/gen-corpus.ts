// Generates a larger, multi-document corpus for testing hybrid search at closer-to-
// real scale than the small 20-section data/eval-corpus.txt allows. Same rationale as
// gen-eval-set.ts (uses local llama3 to author content) but for corpus text instead of
// eval questions. Writes one .txt file per document to data/large-corpus/.
//
// Usage:
//   npx tsx scripts/gen-corpus.ts [--out-dir data/large-corpus] [--batch-size 5]
//
// Approach: each document is a list of section topics (hardcoded below -- this is a
// one-off content-generation run, not a general-purpose tool, so a config file would be
// premature). Topics are batched (default 5 per llama3 call) to keep total generation
// calls manageable -- one call per topic would mean ~85 calls; batching brings it down
// to ~17. The Employee Handbook document additionally prepends the existing 20 sections
// from data/eval-corpus.txt verbatim (no need to regenerate content that already exists
// and has already been used for the small-corpus eval).
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const GEN_MODEL = process.env.OLLAMA_GEN_MODEL ?? "llama3";
const GEN_TIMEOUT_MS = Number(process.env.OLLAMA_GEN_TIMEOUT_MS ?? 300_000);

/**
 * Deliberately does NOT reuse src/generation/llm.ts's generate() -- that function
 * always applies RAG_SYSTEM_PROMPT ("cite the source... of any fact you state"),
 * which is correct for its real job (answering questions from retrieved context) but
 * actively wrong here: applied to a bare content-authoring prompt with no "context" to
 * cite, it made the model fabricate a citation like "(File: Employee_Handbook.pdf,
 * Page 23)" that was never asked for. This script needs a neutral system prompt, not
 * the production RAG persona -- not worth complicating the shared function for a
 * one-off script's sake.
 */
async function generatePlain(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEN_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GEN_MODEL,
        prompt,
        system: "You are a corporate policy writer. Follow the formatting instructions exactly. Write only what is asked for -- no preamble, no citations, no commentary.",
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Ollama /api/generate returned HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as { response?: string; error?: string };
    if (data.error) throw new Error(`Ollama model error: ${data.error}`);
    if (typeof data.response !== "string") throw new Error("Ollama response missing 'response' field");
    return data.response;
  } finally {
    clearTimeout(timer);
  }
}

function argValue(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

interface DocSpec {
  filename: string;
  title: string;
  topics: string[];
  /** Verbatim content to prepend before any generated sections (used for the Employee
   * Handbook to reuse the existing eval-corpus.txt sections instead of regenerating). */
  prependPath?: string;
}

const DOCS: DocSpec[] = [
  {
    filename: "employee-handbook.txt",
    title: "Employee Handbook (Expanded)",
    prependPath: "data/eval-corpus.txt",
    topics: [
      "Diversity, Equity & Inclusion Policy",
      "Anti-Harassment and Anti-Discrimination Policy",
      "Whistleblower Protection Policy",
      "Workplace Accommodations for Disabilities",
      "Employee Referral Program",
      "Internal Transfer and Mobility Policy",
      "Contractor vs Employee Classification",
      "Overtime and Timekeeping Policy",
      "Bereavement, Jury Duty, and Military Leave",
      "Employee Wellness and Assistance Program",
    ],
  },
  {
    filename: "it-security-policy.txt",
    title: "IT Security & Acceptable Use Policy",
    topics: [
      "Password Policy",
      "Multi-Factor Authentication Requirements",
      "Device Encryption Standards",
      "Bring Your Own Device (BYOD) Policy",
      "VPN and Remote Access Requirements",
      "Approved Cloud Storage Services",
      "Data Classification Levels",
      "Security Incident Response Process",
      "Phishing and Suspicious Email Reporting",
      "Patch and Update Management",
      "Network Access Control",
      "Privileged Account Management",
      "Third-Party Vendor Access Policy",
      "Data Retention and Secure Deletion",
      "Backup and Disaster Recovery Policy",
      "Acceptable Use of AI Tools",
      "Security Awareness Training Requirements",
      "Vulnerability Disclosure Process",
      "Email Security and Anti-Spoofing Standards",
      "Offboarding Access Revocation Procedure",
    ],
  },
  {
    filename: "engineering-practices.txt",
    title: "Engineering Practices Guide",
    topics: [
      "Code Review Requirements",
      "Git Branching Strategy",
      "Commit Message Conventions",
      "CI/CD Pipeline Overview",
      "Deployment Approval Process",
      "Feature Flag Policy",
      "On-Call Rotation Guidelines",
      "Incident Severity Classification",
      "Postmortem and Root Cause Analysis Process",
      "Architecture Decision Record Process",
      "API Design Guidelines",
      "Database Migration Process",
      "Test Coverage Requirements",
      "Dependency Update Policy",
      "Secrets Management Standards",
      "Monitoring and Alerting Standards",
      "Documentation Requirements for New Services",
      "Third-Party Library Approval Process",
      "Rollback Procedures",
      "Engineering Onboarding Checklist",
    ],
  },
  {
    filename: "legal-compliance-manual.txt",
    title: "Legal & Compliance Manual",
    topics: [
      "Data Privacy and GDPR Compliance",
      "Export Control Compliance Policy",
      "Anti-Corruption and FCPA Policy",
      "Insider Trading Policy",
      "Intellectual Property Assignment Agreement",
      "Open Source License Compliance",
      "Records Retention Schedule",
      "Contract Signing Authority Matrix",
      "Non-Disclosure Agreement Requirements",
      "Litigation Hold Process",
      "Antitrust and Competition Law Compliance",
      "Sanctions Screening Policy",
      "Data Subject Access Request Process",
      "Data Breach Notification Procedure",
      "Trade Secret Protection Policy",
    ],
  },
];

function batch<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function buildPrompt(topics: string[]): string {
  const list = topics.map((t, i) => `${i + 1}. ${t}`).join("\n");
  return `You are writing sections of a corporate policy handbook. Write ONE section for EACH of the following ${topics.length} topics, in the given order.

For each section:
- Start with a markdown heading exactly as given: "## <topic>"
- Follow with ONE paragraph of 120-180 words in a formal corporate-policy tone
- Include specific, concrete, invented details (exact numbers, timeframes, dollar amounts, role names, or thresholds) so the section states a clear factual policy, not vague generalities
- Do not add any commentary, preamble, or explanation outside the sections themselves

Topics:
${list}

Write the ${topics.length} sections now, each starting with its "## " heading:`;
}

function parseSections(raw: string, expectedTopics: string[]): Map<string, string> {
  const result = new Map<string, string>();
  const parts = raw.split(/^##\s+/m).slice(1); // drop any preamble before the first heading
  for (const part of parts) {
    const newlineIdx = part.indexOf("\n");
    if (newlineIdx === -1) continue;
    const heading = part.slice(0, newlineIdx).trim();
    const body = part.slice(newlineIdx + 1).trim();
    if (heading && body) result.set(heading, body);
  }
  const missing = expectedTopics.filter((t) => !result.has(t));
  if (missing.length > 0) {
    console.warn(`    warning: model didn't return a section for: ${missing.join(", ")}`);
  }
  return result;
}

async function probeStack(): Promise<boolean> {
  try {
    const res = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Extract whatever "## <topic>" sections are already present in a previously-written
 * output file, without the "missing" warning parseSections prints -- used to make runs
 * resumable: re-running only regenerates topics that didn't make it in last time. */
function extractExisting(raw: string): Map<string, string> {
  const result = new Map<string, string>();
  const parts = raw.split(/^##\s+/m).slice(1);
  for (const part of parts) {
    const newlineIdx = part.indexOf("\n");
    if (newlineIdx === -1) continue;
    const heading = part.slice(0, newlineIdx).trim();
    const body = part.slice(newlineIdx + 1).trim();
    if (heading && body) result.set(heading, body);
  }
  return result;
}

async function main(): Promise<void> {
  const outDir = path.resolve(ROOT, argValue("--out-dir", "data/large-corpus"));
  const batchSize = Number(argValue("--batch-size", "5"));

  const stackUp = await probeStack();
  if (!stackUp) {
    console.error("Ollama not reachable. Bring up the stack with `docker compose up -d && ollama pull llama3`.");
    process.exit(1);
  }

  await fs.mkdir(outDir, { recursive: true });

  for (const doc of DOCS) {
    const outPath = path.join(outDir, doc.filename);

    let base = "";
    if (doc.prependPath) {
      const prepend = await fs.readFile(path.resolve(ROOT, doc.prependPath), "utf8");
      base = prepend.trimEnd() + "\n\n";
    } else {
      base = `# ${doc.title}\n\n`;
    }

    // Resume support: skip topics already present in a prior run's output.
    const sectionMap = new Map<string, string>();
    try {
      const existingRaw = await fs.readFile(outPath, "utf8");
      for (const [topic, body] of extractExisting(existingRaw)) {
        if (doc.topics.includes(topic)) sectionMap.set(topic, body);
      }
    } catch {
      // no prior output for this doc -- fresh run
    }

    const missingTopics = doc.topics.filter((t) => !sectionMap.has(t));
    console.log(
      `\n=== ${doc.title} (${doc.topics.length} sections total, ${sectionMap.size} already done, ${missingTopics.length} to generate) ===`,
    );
    if (missingTopics.length === 0) {
      console.log(`  already complete, skipping generation`);
    } else {
      const batches = batch(missingTopics, batchSize);
      for (let i = 0; i < batches.length; i++) {
        const topicsBatch = batches[i];
        process.stdout.write(`  batch ${i + 1}/${batches.length} (${topicsBatch.length} topics)... `);
        const prompt = buildPrompt(topicsBatch);
        let raw: string;
        try {
          raw = await generatePlain(prompt);
        } catch (e) {
          console.log(`FAILED: ${e instanceof Error ? e.message : String(e)}`);
          continue;
        }
        const sections = parseSections(raw, topicsBatch);
        for (const [topic, body] of sections) sectionMap.set(topic, body);
        console.log(`got ${sections.size}/${topicsBatch.length} sections`);
      }
    }

    // Rebuild in original topic order regardless of which batch a section came from.
    let content = base;
    for (const topic of doc.topics) {
      const body = sectionMap.get(topic);
      if (body) content += `## ${topic}\n\n${body}\n\n`;
    }

    await fs.writeFile(outPath, content.trimEnd() + "\n", "utf8");
    const stillMissing = doc.topics.filter((t) => !sectionMap.has(t));
    console.log(
      `  wrote ${path.relative(ROOT, outPath)} (${content.length} chars)` +
        (stillMissing.length > 0 ? ` -- still missing: ${stillMissing.join(", ")}` : ""),
    );
  }

  console.log(`\nDone. Next: ingest each file in data/large-corpus/ into a dedicated collection, e.g.:`);
  console.log(`  curl -X POST localhost:3000/ingest -F "file=@data/large-corpus/employee-handbook.txt"`);
  console.log(`(POST /ingest always uses the default QDRANT_COLLECTION -- set QDRANT_COLLECTION=rag-large in the server's env, or ingest via ingestDocument() directly with a collection override, to keep this corpus isolated from the small-corpus eval.)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
