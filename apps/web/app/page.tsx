'use client';
import { useQuery } from '@tanstack/react-query';
import { getJson } from '../lib/api';
import { KpiCard } from '../components/KpiCard';
import { FlowDiagram } from '../components/FlowDiagram';
export default function DashboardPage() {
  const summary = useQuery({ queryKey: ['summary'], queryFn: () => getJson<any>('/dashboard/summary') });
  const flow = useQuery({ queryKey: ['flow'], queryFn: () => getJson<Record<string, number>>('/dashboard/flow') });
  return <div><h1 className="text-3xl font-bold">Dashboard</h1><p className="mt-2 text-slate-600">Operational view of order status, failure leakage and entitlement completion.</p><div className="mt-8 grid grid-cols-5 gap-4"><KpiCard label="Total orders" value={summary.data?.totalOrders ?? '-'} /><KpiCard label="Completed" value={summary.data?.completed ?? '-'} /><KpiCard label="Failed" value={summary.data?.failed ?? '-'} /><KpiCard label="In progress" value={summary.data?.inProgress ?? '-'} /><KpiCard label="Reorders" value={summary.data?.reorders ?? '-'} /></div><div className="mt-8">{flow.data && <FlowDiagram data={flow.data} />}</div></div>;
}
