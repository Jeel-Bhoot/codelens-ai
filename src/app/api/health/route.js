import { describeConfiguration } from '@/lib/ai/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Liveness probe. Reports capability, never key material. */
export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'critiq',
    ...describeConfiguration(),
    byoKeyAllowed: process.env.NEXT_PUBLIC_ALLOW_BYO_KEY !== 'false',
    timestamp: new Date().toISOString(),
  });
}
