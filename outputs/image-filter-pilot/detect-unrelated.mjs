import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const cases = [
  ['synthetic-bill', './conta-ficticia.png'],
  ['jewelry-on-bill', './joias-sobre-conta-ficticias.png'],
  ['jewelry-only', './joias-ficticias-negativo.png']
];
const format = {
  type: 'object',
  properties: {
    objeto_alheio_em_destaque: { type: 'boolean' },
    objetos: { type: 'array', items: { type: 'string' } }
  },
  required: ['objeto_alheio_em_destaque', 'objetos'],
  additionalProperties: false
};

for (const [id, relativePath] of cases) {
  const image = await sharp(await readFile(new URL(relativePath, import.meta.url)))
    .rotate().resize({ width: 768, height: 768, fit: 'inside' }).jpeg({ quality: 75 }).toBuffer();
  const response = await fetch('http://127.0.0.1:11434/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3-vl:4b-instruct', stream: false, format,
      options: { temperature: 0, num_predict: 180 },
      messages: [{ role: 'user', content: 'Ignore por um momento se existe conta de luz. Procure objetos físicos alheios à fatura em destaque na imagem, especialmente joias, anéis, colares, comida ou roupas cobrindo o documento. Uma fatura limpa, sem esses objetos, deve retornar falso. Se houver joias grandes sobre a conta, retorne verdadeiro. Responda apenas JSON nos campos solicitados.', images: [image.toString('base64')] }]
    })
  });
  if (!response.ok) throw new Error(`${id}: HTTP ${response.status}`);
  const body = await response.json();
  let parsed;
  try { parsed = JSON.parse(body.message?.content || ''); } catch { parsed = null; }
  const valid = body.done_reason === 'stop' && parsed && typeof parsed.objeto_alheio_em_destaque === 'boolean' && Array.isArray(parsed.objetos);
  console.log(JSON.stringify({ id, valid: Boolean(valid), response: parsed }));
}
