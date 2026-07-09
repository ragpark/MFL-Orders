import express from 'express';
import multer from 'multer';
import { EventType } from '@prisma/client';
import { prisma } from './prisma.js';
import { readFirstSheet, validateRows } from './excel.js';
import { ingestUpload } from './ingestion.js';
import { UploadKind } from './types.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
export const router = express.Router();

router.get('/health', (_req, res) => res.json({ ok: true }));

router.post('/uploads/preview', upload.single('file'), async (req, res, next) => {
  try {
    const type = req.body.type as UploadKind;
    if (!req.file || !type) return res.status(400).json({ error: 'file and type are required' });
    const rows = readFirstSheet(req.file.buffer);
    res.json({ preview: rows.slice(0, 10), validation: validateRows(type, rows) });
  } catch (e) { next(e); }
});

router.post('/uploads', upload.single('file'), async (req, res, next) => {
  try {
    const type = req.body.type as UploadKind;
    if (!req.file || !type) return res.status(400).json({ error: 'file and type are required' });
    const rows = readFirstSheet(req.file.buffer);
    const result = await ingestUpload(type, req.file.originalname, rows, req.body.batchName);
    res.status(result.imported ? 201 : 422).json(result);
  } catch (e) { next(e); }
});

router.get('/uploads/:id/status', async (req, res, next) => {
  try {
    const upload = await prisma.upload.findUnique({ where: { id: req.params.id } });
    if (!upload) return res.status(404).json({ error: 'Upload not found' });
    res.json(upload);
  } catch (e) { next(e); }
});

function orderStatusFilter(status?: string) {
  if (!status) return {};
  const typeMap: Record<string, EventType[]> = {
    completed: [EventType.LM_SUCCESS],
    failed: [EventType.BULK_SUBS_FAILURE, EventType.TEP_FAILURE, EventType.LM_FAILURE],
    inProgress: [EventType.BATCH_CREATED, EventType.BULK_SUBS_ATTEMPT, EventType.TEP_ATTEMPT, EventType.LM_ATTEMPT]
  };
  const types = typeMap[status];
  return types ? { events: { some: { eventType: { in: types } } } } : {};
}

router.get('/orders', async (req, res, next) => {
  try {
    const { batchId, status, failureCategory, search } = req.query as Record<string, string>;
    const where: any = { ...orderStatusFilter(status) };
    if (search) where.orderNumber = { contains: search, mode: 'insensitive' };
    if (batchId) where.batches = { some: { batchId } };
    if (failureCategory) where.failures = { some: { failureCategory: { code: failureCategory } } };
    const orders = await prisma.order.findMany({ where, take: 100, orderBy: { updatedAt: 'desc' }, include: { events: { orderBy: { createdAt: 'desc' }, take: 1 }, failures: { include: { failureCategory: true } } } });
    res.json(orders);
  } catch (e) { next(e); }
});

router.get('/orders/:orderNumber', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
      include: {
        batches: { include: { batch: true } },
        events: { orderBy: { createdAt: 'asc' } },
        failures: { include: { failureCategory: true, event: true } },
        parentLinks: { include: { childOrder: true } },
        childLinks: { include: { parentOrder: true } }
      }
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (e) { next(e); }
});

router.get('/batches', async (_req, res, next) => {
  try {
    const batches = await prisma.batch.findMany({ orderBy: { uploadedAt: 'desc' }, include: { _count: { select: { orders: true } } } });
    res.json(batches);
  } catch (e) { next(e); }
});

router.get('/dashboard/summary', async (_req, res, next) => {
  try {
    const [totalOrders, completed, failed, reorders] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { events: { some: { eventType: EventType.LM_SUCCESS } } } }),
      prisma.order.count({ where: { events: { some: { eventType: { in: [EventType.BULK_SUBS_FAILURE, EventType.TEP_FAILURE, EventType.LM_FAILURE] } } } } }),
      prisma.reorderChain.count()
    ]);
    res.json({ totalOrders, completed, failed, inProgress: Math.max(totalOrders - completed - failed, 0), reorders });
  } catch (e) { next(e); }
});

router.get('/dashboard/flow', async (_req, res, next) => {
  try {
    const submitted = await prisma.order.count({ where: { events: { some: { eventType: EventType.BATCH_CREATED } } } });
    const bulkSubs = await prisma.order.count({ where: { events: { some: { eventType: { in: [EventType.BULK_SUBS_ATTEMPT, EventType.BULK_SUBS_SUCCESS, EventType.BULK_SUBS_FAILURE] } } } } });
    const tep = await prisma.order.count({ where: { events: { some: { eventType: { in: [EventType.TEP_ATTEMPT, EventType.TEP_SUCCESS, EventType.TEP_FAILURE] } } } } });
    const licenceManager = await prisma.order.count({ where: { events: { some: { eventType: { in: [EventType.LM_ATTEMPT, EventType.LM_SUCCESS, EventType.LM_FAILURE] } } } } });
    const entitled = await prisma.order.count({ where: { events: { some: { eventType: EventType.LM_SUCCESS } } } });
    res.json({ submitted, bulkSubs, tep, licenceManager, entitled });
  } catch (e) { next(e); }
});

router.get('/failures', async (_req, res, next) => {
  try {
    const categories = await prisma.failureCategory.findMany({ include: { _count: { select: { failures: true } } }, orderBy: { code: 'asc' } });
    res.json(categories.map(c => ({ code: c.code, description: c.description, count: c._count.failures })));
  } catch (e) { next(e); }
});
