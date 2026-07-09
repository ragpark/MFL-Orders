export function KpiCard({ label, value, tone = 'slate' }: { label: string; value: number | string; tone?: string }) {
  return <div className="card"><div className="text-sm text-slate-500">{label}</div><div className={`mt-2 text-4xl font-bold text-${tone}-900`}>{value}</div></div>;
}
