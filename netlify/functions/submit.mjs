import { getStore } from '@netlify/blobs';
import { submitOrder, SubmissionError } from '../lib/order.mjs';
import { readBillText } from '../lib/ocr.mjs';

export const config = {
  path: '/api/submit',
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] }
};

export default async function handler(request) {
  try {
    const result = await submitOrder(request, {
      orders: getStore({ name: 'energy-orders', consistency: 'strong' }),
      photos: getStore({ name: 'energy-photos', consistency: 'strong' }),
      recognize: readBillText
    });
    return Response.json(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = error instanceof SubmissionError ? error.status : 503;
    const message = error instanceof SubmissionError ? error.message : 'Atendimento indisponível. Tente novamente.';
    return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
