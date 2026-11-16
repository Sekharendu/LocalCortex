"""Summarise neurons-top10-vs-top15.jsonl. Run (repo root): python -X utf8 eval/ragbench-20261115/rerank/neurons-summary.py"""
import json, re, statistics as S
from pathlib import Path
HERE = Path(__file__).parent
rs = [json.loads(l) for l in open(HERE / "neurons-top10-vs-top15.jsonl", encoding="utf-8") if l.strip()]
def st(v):
    v = sorted(v); n = len(v)
    return {"n": n, "mean": round(S.mean(v), 2), "sd": round(S.stdev(v), 2) if n > 1 else 0, "min": round(v[0], 2), "median": round(v[n // 2], 2),
            "p90": round(v[int(n * 0.9)], 2), "max": round(v[-1], 2), "total": round(sum(v), 1)}
REFUSE = re.compile(r"insufficient|does not (provide|contain|mention|specify|include)|not (possible|able) to determine|no information", re.I)
out = {}
for c in ("top10", "top15"):
    a = [r for r in rs if r["config"] == c and r["rep"] == 1]
    ok = [r for r in a if r["usage"]]
    out[c] = {
        "calls": len(a), "failed": len(a) - len(ok), "retried": sum(1 for r in a if r["attempts"] > 1),
        "neurons": st([r["usage"]["neurons"] for r in ok]),
        "promptTokensQwen": st([r["usage"]["prompt_tokens"] for r in ok]),
        "outputTokens": st([r["usage"]["completion_tokens"] for r in ok]),
        "promptTokensLlama3": st([r["llama3Tokens"] for r in ok]),
        "promptChars": st([r["chars"] for r in ok]),
        "passagesSent": st([r["passages"] for r in ok]),
        "secondsPerCall": st([r["ms"] / 1000 for r in ok]),
        "hitMaxTokens512": sum(1 for r in ok if r["finish"] == "length"),
        "answerChunkInPicked": sum(1 for r in a if r["answerChunkInTopK"]),
        "answerTextInPrompt": sum(1 for r in a if r["answerTextInPrompt"]),
        "saidInsufficient": sum(1 for r in ok if REFUSE.search(r["answer"])),
    }
# paired difference per question
p = {}
for r in rs:
    if r["rep"] == 1 and r["usage"]: p.setdefault(r["id"], {})[r["config"]] = r
pairs = [v for v in p.values() if len(v) == 2]
out["paired_top15_minus_top10"] = {
    "questions": len(pairs),
    "neurons": st([v["top15"]["usage"]["neurons"] - v["top10"]["usage"]["neurons"] for v in pairs]),
    "promptTokens": st([v["top15"]["usage"]["prompt_tokens"] - v["top10"]["usage"]["prompt_tokens"] for v in pairs]),
    "top15MoreNeurons": sum(1 for v in pairs if v["top15"]["usage"]["neurons"] > v["top10"]["usage"]["neurons"]),
    "samePrompt": sum(1 for v in pairs if v["top15"]["usage"]["prompt_tokens"] == v["top10"]["usage"]["prompt_tokens"]),
}
# noise: same prompt sent twice
noise = {}
for c in ("top10", "top15"):
    d = {}
    for r in rs:
        if r["config"] == c and r["usage"]: d.setdefault(r["id"], {})[r["rep"]] = r
    two = [v for v in d.values() if 1 in v and 2 in v]
    noise[c] = {"questions": len(two),
                "promptTokensIdentical": sum(1 for v in two if v[1]["usage"]["prompt_tokens"] == v[2]["usage"]["prompt_tokens"]),
                "sameAnswerText": sum(1 for v in two if v[1]["answer"] == v[2]["answer"]),
                "absNeuronDiff": st([abs(v[1]["usage"]["neurons"] - v[2]["usage"]["neurons"]) for v in two]),
                "absOutputTokenDiff": st([abs(v[1]["usage"]["completion_tokens"] - v[2]["usage"]["completion_tokens"]) for v in two]),
                "absSecondsDiff": st([abs(v[1]["ms"] - v[2]["ms"]) / 1000 for v in two])}
out["noise_same_prompt_twice"] = noise
# neurons vs tokens: check the rate
ok = [r for r in rs if r["usage"]]
fit = [(r["usage"]["neurons"] - (r["usage"]["prompt_tokens"] * 4625 + r["usage"]["completion_tokens"] * 30475) / 1e6) for r in ok]
out["rate_check_neurons_minus_4625in_30475out_per_M"] = st(fit)
by = {}
for r in rs:
    if r["rep"] == 1 and r["usage"]: by.setdefault((r["source"], r["config"]), []).append(r["usage"]["neurons"])
out["neurons_by_source_mean"] = {f"{s} {c}": round(S.mean(v), 2) for (s, c), v in sorted(by.items())}
t = sorted(r["at"] for r in rs)
out["wallClock"] = {"first": t[0], "last": t[-1], "totalCalls": len(rs), "totalNeurons": round(sum(r["usage"]["neurons"] for r in ok), 1)}
json.dump(out, open(HERE / "neurons-summary.json", "w", encoding="utf-8"), indent=1)
print(json.dumps(out, indent=1))
