'use client';
import { useQuery } from '@tanstack/react-query';
import { getJson } from '../../lib/api';
import Link from 'next/link';
import { useState } from 'react';
export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const { data, refetch } = useQuery({ queryKey: ['orders', search], queryFn: () => getJson<any[]>(`/orders?search=${encodeURIComponent(search)}`) });
  return <div><h1 className="text-3xl font-bold">Order Explorer</h1><div className="mt-6 flex gap-2"><input className="input w-80" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order number" /><button className="btn" onClick={() => refetch()}>Search</button></div><div className="card mt-8 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="py-2">Order</th><th>Customer</th><th>Org</th><th>Last event</th><th>Failures</th></tr></thead><tbody>{data?.map(o => <tr key={o.id} className="border-t"><td className="py-3 font-medium"><Link className="text-blue-700" href={`/orders/${o.orderNumber}`}>{o.orderNumber}</Link></td><td>{o.customerId}</td><td>{o.orgName}</td><td>{o.events?.[0]?.eventType ?? '-'}</td><td>{o.failures?.length ?? 0}</td></tr>)}</tbody></table></div></div>;
}
