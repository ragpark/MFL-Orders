export function FlowDiagram({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  return <div className="card"><h2 className="font-semibold">Processing flow</h2><div className="mt-5 space-y-4">{entries.map(([k, v]) => <div key={k}><div className="flex justify-between text-sm"><span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</span><span>{v}</span></div><div className="mt-1 h-3 rounded bg-slate-100"><div className="h-3 rounded bg-blue-600" style={{ width: `${(v / max) * 100}%` }} /></div></div>)}</div></div>;
}
