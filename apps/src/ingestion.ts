import { EventType, UploadStatus, UploadType } from '@prisma/client';
import { prisma } from './prisma.js';
import { Row, UploadKind } from './types.js';
import { normaliseOrderNumber, validateRows } from './excel.js';
import { classifyLmEvent, classifyProcessingEvent, parseAssignment, statusCodeFromMessage } from './eventClassifier.js';

async function upsertOrder(orderNumber: string, data: { customerId?: string | null; email?: string | null; orgName?: string | null }) {
  return prisma.order.upsert({
    where: { orderNumber },
    update: { customerId: data.customerId || undefined, email: data.email || undefined, orgName: data.orgName || undefined },
    create: { orderNumber, customerId: data.customerId || null, email: data.email || null, orgName: data.orgName || null }
  });
}

async function addEvent(orderId: string, eventType: EventType, rawMessage: string, statusCode?: string) {
  return prisma.event.create({ data: { orderId, eventType, rawMessage, statusCode } });
}

async function attachFailure(orderId: string, eventId: string, text: string) {
  const categories = await prisma.failureCategory.findMany();
  for (const c of categories) {
    const regex = new RegExp(c.pattern, 'i');
    if (regex.test(text)) {
      await prisma.orderFailure.upsert({
        where: { orderId_failureCategoryId_eventId: { orderId, failureCategoryId: c.id, eventId } },
        update: {},
        create: { orderId, failureCategoryId: c.id, eventId }
      });
      return c.code;
    }
  }
  return undefined;
}

export async function ingestUpload(type: UploadKind, fileName: string, rows: Row[], batchName?: string) {
  const validation = validateRows(type, rows);
  const upload = await prisma.upload.create({ data: { type: type as UploadType, fileName, status: validation.valid ? UploadStatus.VALIDATED : UploadStatus.FAILED, summaryJson: validation as any } });
  if (!validation.valid) return { upload, validation, imported: false };

  let importedOrders = 0;
  let importedEvents = 0;
  let failures = 0;
  let reorders = 0;

  if (type === 'BATCH') {
    const batch = await prisma.batch.create({ data: { name: batchName || fileName.replace(/\.[^.]+$/, ''), sourceFileName: fileName } });
    for (const row of rows) {
      const orderNumber = normaliseOrderNumber(row['Order Number']);
      const order = await upsertOrder(orderNumber, {
        customerId: normaliseOrderNumber(row['Customer ID']) || null,
        email: String(row['Email'] || '').trim() || null,
        orgName: String(row['Org Name'] || '').trim() || null
      });
      await prisma.orderBatch.upsert({ where: { orderId_batchId: { orderId: order.id, batchId: batch.id } }, update: {}, create: { orderId: order.id, batchId: batch.id } });
      await addEvent(order.id, EventType.BATCH_CREATED, `Batch import: ${batch.name}`);
      importedOrders++; importedEvents++;
    }
  }

  if (type === 'PROCESSING_REPORT') {
    for (const row of rows) {
      const orderNumber = normaliseOrderNumber(row['SOURCE_ORDER_NUMBER']);
      const raw = String(row['PROCESS_MESSAGE'] || '').trim();
      const order = await upsertOrder(orderNumber, { customerId: normaliseOrderNumber(row['CUSTOMER_ID']) || null, email: String(row['CONTACT_EMAIL'] || '').trim() || null, orgName: String(row['Party / Org Name'] || '').trim() || null });
      const eventType = classifyProcessingEvent(raw);
      const event = await addEvent(order.id, eventType, raw, statusCodeFromMessage(raw));
      importedOrders++; importedEvents++;
      const combined = `${raw} ${row['Error Reason'] || ''} ${row['Status'] || ''}`;
      if (eventType.toString().endsWith('FAILURE')) {
        const code = await attachFailure(order.id, event.id, combined);
        if (code) failures++;
      }
      const assignment = parseAssignment(String(row['Status'] || ''));
      if (assignment.reorderNumber) {
        // Reorder parent/child requires an explicit child order. Capture as event note for now.
        await addEvent(order.id, EventType.BULK_SUBS_ATTEMPT, `Reorder assignment detected: ${row['Status']}`);
        importedEvents++; reorders++;
      }
    }
  }

  if (type === 'LM_REPORT') {
    for (const row of rows) {
      const orderNumber = normaliseOrderNumber(row['orderkey']);
      const raw = String(row['Process Status'] || '').trim();
      const order = await upsertOrder(orderNumber, {});
      const eventType = classifyLmEvent(raw);
      const event = await addEvent(order.id, eventType, raw, statusCodeFromMessage(raw));
      importedOrders++; importedEvents++;
      if (eventType === EventType.LM_FAILURE) {
        const code = await attachFailure(order.id, event.id, raw);
        if (code) failures++;
      }
    }
  }

  if (type === 'REORDER') {
    for (const row of rows) {
      const parentNumber = normaliseOrderNumber(row['Original Order']);
      const childNumber = normaliseOrderNumber(row['New Order']);
      if (!childNumber) continue;
      const parent = await upsertOrder(parentNumber, {});
      const child = await upsertOrder(childNumber, {});
      await prisma.reorderChain.upsert({
        where: { parentOrderId_childOrderId: { parentOrderId: parent.id, childOrderId: child.id } },
        update: {},
        create: { parentOrderId: parent.id, childOrderId: child.id, reorderNumber: Number(row['Reorder Number'] || 1) }
      });
      reorders++; importedOrders += 2;
    }
  }

  const summary = { ...validation, importedOrders, importedEvents, failures, reorders };
  const updatedUpload = await prisma.upload.update({ where: { id: upload.id }, data: { status: UploadStatus.IMPORTED, summaryJson: summary as any } });
  return { upload: updatedUpload, validation: summary, imported: true };
}
