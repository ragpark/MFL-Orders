'use client';
import { useState } from 'react';
import { api } from '../../lib/api';
const types = ['BATCH', 'PROCESSING_REPORT', 'LM_REPORT', 'REORDER'];
export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState('BATCH');
  const [batchName, setBatchName] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  async function runPreview() { if (!file) return; const fd = new FormData(); fd.append('file', file); fd.append('type', type); const res = await api.post('/uploads/preview', fd); setPreview(res.data); }
  async function upload() { if (!file) return; const fd = new FormData(); fd.append('file', file); fd.append('type', type); if (batchName) fd.append('batchName', batchName); const res = await api.post('/uploads', fd); setResult(res.data); }
  return <div><h1 className="text-3xl font-bold">Upload</h1><p className="mt-2 text-slate-600">Controlled ingestion — validate, preview, dry-run, then import.</p><div className="card mt-8 space-y-4 max-w-3xl"><div><label className="block text-sm font-medium">Upload type</label><select className="input mt-1" value={type} onChange={e => setType(e.target.value)}>{types.map(t => <option key={t}>{t}</option>)}</select></div>{type === 'BATCH' && <div><label className="block text-sm font-medium">Batch name</label><input className="input mt-1 w-full" value={batchName} onChange={e => setBatchName(e.target.value)} placeholder="International Batch 1" /></div>}<div><label className="block text-sm font-medium">Excel file</label><input className="mt-1" type="file" accept=".xlsx,.xls,.csv" onChange={e => setFile(e.target.files?.[0] ?? null)} /></div><div className="flex gap-2"><button className="btn" onClick={runPreview} disabled={!file}>Validate & preview</button><button className="btn" onClick={upload} disabled={!file}>Import</button></div></div>{preview && <pre className="card mt-6 overflow-x-auto text-xs">{JSON.stringify(preview, null, 2)}</pre>}{result && <pre className="card mt-6 overflow-x-auto text-xs">{JSON.stringify(result, null, 2)}</pre>}</div>;
}
