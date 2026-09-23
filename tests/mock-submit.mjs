import { buildWhatsappUrl } from '../dist/form-core.mjs';

export async function mockSubmit(page) {
  await page.route('**/api/submit', async route => {
    const multipart = route.request().postDataBuffer()?.toString('utf8') || '';
    const match = multipart.match(/name="data"\r\n\r\n([^\r\n]+)\r\n/);
    if (!match) throw new Error('Expected form data in test submission');
    const data = JSON.parse(match[1]);
    const photoStored = multipart.includes('name="photo"');
    const id = '00000000-0000-4000-8000-000000000001';
    await route.fulfill({
      status: 201, contentType: 'application/json',
      body: JSON.stringify({ id, photoStored, whatsappUrl: buildWhatsappUrl(data, { reference: id, photoStored }) })
    });
  });
}
