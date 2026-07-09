'use client';
import { useQuery } from '@tanstack/react-query';
import { getJson } from '../../lib/api';
export default function BatchesPage() {
  const { data } = useQuery({ queryKey: ['batches'], queryFn: () => getJson<any[]>('/batches') });
  return <div><h1 className="text-3xl font-bold">Batch List</h1><div className="card mt-8 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-2">Batch</th><th>Orders</th><th>Uploaded</th><th>Source file</th></tr></thead><tbody>{data?.map(b => <tr key={b.id} className="border-t"><td className="py-3 font-medium">{b.name}</td><td>{b._count?.orders ?? 0}</td><td>{new Date(b.uploadedAt).toLocaleString()}</td><td>{b.sourceFileName}</td></tr>)}</tbody></table></div></div>;
}
