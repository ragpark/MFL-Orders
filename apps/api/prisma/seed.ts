import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const categories = [
  { code: 'GPS_400_USER_ALREADY_IN_ANOTHER_ORG', description: 'GPS HTTP 400: user already belongs to another organisation in ActiveHub', pattern: 'user already.*another org|user already.*another organisation' },
  { code: 'TEP_NULL_CUSTOMER_OR_ORG', description: 'TEP returned null CUSTOMER_ID or OrgId', pattern: 'customer_id.*orgid.*null|customer id.*org.*null' },
  { code: 'GPS_404_ORG_NOT_FOUND', description: 'GPS organisation lookup returned 404 / no record found', pattern: '404.*not found|no record found|getorg' },
  { code: 'DATA_VALIDATION_ERROR', description: 'Data validation error in the processing payload', pattern: 'data validation error|validationerror' },
  { code: 'EMAIL_VALUE_N', description: 'Email value received as N or invalid for processing', pattern: 'email value.*received as n' },
  { code: 'GENERAL_HTTP_400', description: 'General HTTP 400 bad request', pattern: 'http/1\\.1 400|400 bad request' }
];

async function main() {
  for (const c of categories) {
    await prisma.failureCategory.upsert({ where: { code: c.code }, update: c, create: c });
  }
}

main().finally(async () => prisma.$disconnect());
