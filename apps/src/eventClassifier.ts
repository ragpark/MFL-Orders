import { EventType } from '@prisma/client';

export function statusCodeFromMessage(raw: string): string | undefined {
  const match = raw.match(/HTTP\/1\.1\s+(\d{3})/i) || raw.match(/\b(400|404|200)\b/);
  return match?.[1];
}

export function classifyProcessingEvent(rawMessage: string): EventType {
  const msg = rawMessage.toLowerCase();
  if (msg.includes('api call is successful') || msg.includes('http/1.1 200')) return EventType.TEP_SUCCESS;
  if (msg.includes('http/1.1 400') || msg.includes('400 bad request')) return EventType.TEP_FAILURE;
  if (msg.includes('http/1.1 404') || msg.includes('404 not found')) return EventType.TEP_FAILURE;
  if (msg.includes('gps')) return EventType.BULK_SUBS_FAILURE;
  return EventType.BULK_SUBS_ATTEMPT;
}

export function classifyLmEvent(status: string): EventType {
  const msg = status.toLowerCase();
  if (msg.includes('api call is successful') || msg.includes('success') || msg.includes('entitled')) return EventType.LM_SUCCESS;
  if (msg.includes('fail') || msg.includes('error') || msg.includes('400') || msg.includes('404')) return EventType.LM_FAILURE;
  return EventType.LM_ATTEMPT;
}

export function parseAssignment(status: string): { owner?: string; reorderNumber?: number } {
  const ownerMatch = status.match(/Assigned to\s+([^()]+)/i);
  const reorderMatch = status.match(/Reorder\s*(\d+)/i);
  return {
    owner: ownerMatch?.[1]?.trim(),
    reorderNumber: reorderMatch ? Number(reorderMatch[1]) : undefined
  };
}
