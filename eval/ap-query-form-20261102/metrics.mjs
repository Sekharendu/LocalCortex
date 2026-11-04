export function scoreItems(records, length) {
  const all = records.flatMap(r => r.items).filter(i => !length || i.lengthGroup === length);
  const mapped = all.filter(i => i.mapping === 'mapped');
  const result = { cases: records.length, mappedItems: mapped.length, unmappedItems: all.length - mapped.length };
  for (const k of [5, 10, 20, 50]) {
    const hits = mapped.filter(i => i.rank !== null && i.rank <= k).length;
    result['r' + k] = mapped.length ? hits / mapped.length : null; result['hits' + k] = hits;
  }
  result.mrr = mapped.length ? mapped.reduce((sum, i) => sum + (i.rank === null ? 0 : 1 / i.rank), 0) / mapped.length : null;
  return result;
}
export function caseChanges(records, k, group, length, requireAll = false) {
  const pairs = new Map();
  for (const r of records.filter(r => r.group === group)) { pairs.set(r.caseId, { ...(pairs.get(r.caseId) ?? {}), [r.variant]: r }); }
  let both = 0, Aonly = 0, Ponly = 0, neither = 0, unscorable = 0;
  for (const pair of pairs.values()) {
    if (!pair.A || !pair.P) throw Error('Incomplete A/P pair');
    const a = pair.A.items.filter(i => i.mapping === 'mapped' && (!length || i.lengthGroup === length));
    const p = pair.P.items.filter(i => i.mapping === 'mapped' && (!length || i.lengthGroup === length));
    if (JSON.stringify(a.map(i => i.itemId)) !== JSON.stringify(p.map(i => i.itemId))) throw Error('A/P item denominator mismatch');
    if (!a.length) { unscorable++; continue; }
    const passes = items => requireAll ? items.every(i => i.rank !== null && i.rank <= k) : items.some(i => i.rank !== null && i.rank <= k);
    const ahit = passes(a), phit = passes(p);
    if (ahit && phit) both++; else if (ahit) Aonly++; else if (phit) Ponly++; else neither++;
  }
  return { group, k, lengthGroup: length ?? 'all quotes', passRule: requireAll ? 'all mapped items' : 'any mapped item', scorableCases: both + Aonly + Ponly + neither, unscorableCases: unscorable, both, Aonly, Ponly, neither, different: Aonly + Ponly };
}
