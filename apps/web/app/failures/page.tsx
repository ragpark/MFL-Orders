'use client';
import { useQuery } from '@tanstack/react-query';
import { getJson } from '../../lib/api';
export default function FailuresPage() {
  const { data } = useQuery({ queryKey: ['failures'], queryFn: () => getJson<any[]>('/failures') });
  return <div><h1 className="text-3xl font-bold">Failure Workbench</h1><div className="card mt-8 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-2">Code</th><th>Description</th><th>Count</th></tr></thead><tbody>{data?.map(f => <tr key={f.code} className="border-t"><td className="py-3 font-mono font-medium">{f.code}</td><td>{f.description}</td><td>{f.count}</td></tr>)}</tbody></table></div></div>;
}
