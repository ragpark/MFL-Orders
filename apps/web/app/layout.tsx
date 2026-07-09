import './globals.css';
import Link from 'next/link';
import { Providers } from './providers';
export const metadata = { title: 'ActiveHub Order Reconciliation', description: 'Cross-system order reconciliation' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Providers><div className="min-h-screen"><aside className="fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 p-6"><h1 className="text-xl font-bold">ActiveHub Recon</h1><p className="mt-2 text-sm text-slate-500">Single pane of glass for order placement and entitlement reconciliation.</p><nav className="mt-8 grid gap-2"><Link className="tab" href="/">Dashboard</Link><Link className="tab" href="/batches">Batches</Link><Link className="tab" href="/orders">Order Explorer</Link><Link className="tab" href="/failures">Failure Workbench</Link><Link className="tab" href="/upload">Upload</Link></nav></aside><main className="ml-72 p-8">{children}</main></div></Providers></body></html>;
}
