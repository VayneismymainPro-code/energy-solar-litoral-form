import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const scenarios = [
  { id: 'pattern-selected-08', service: 'pattern', path: '../../assets/cliente/whatsapp-2026-09-22/imagens/WhatsApp Image 2026-09-22 at 12.56.14 (2).jpeg' },
  { id: 'pattern-selected-23', service: 'pattern', path: '../../assets/cliente/whatsapp-2026-09-22/imagens/WhatsApp Image 2026-09-22 at 13.00.09 (2).jpeg' },
  { id: 'pattern-selected-18', service: 'pattern', path: '../../assets/cliente/whatsapp-2026-09-22/imagens/WhatsApp Image 2026-09-22 at 13.00.07 (1).jpeg' },
  { id: 'synthetic-jewelry', service: 'pattern', path: './joias-ficticias-negativo.png' },
  { id: 'unrelated-logo', service: 'pattern', path: '../../dist/energy-solar-mark.png' },
  { id: 'synthetic-electricity-bill', service: 'solar', path: './conta-ficticia.png' },
  { id: 'synthetic-jewelry-on-bill', service: 'solar', path: './joias-sobre-conta-ficticias.png' },
  { id: 'solar-panel-not-bill', service: 'solar', path: '../../assets/cliente/whatsapp-2026-09-22/imagens/WhatsApp Image 2026-09-22 at 13.00.13 (3).jpeg' },
  { id: 'synthetic-jewelry-solar', service: 'solar', path: './joias-ficticias-negativo.png' }
];

for (const scenario of scenarios) {
  const source = new URL(scenario.path, import.meta.url);
  const image = await sharp(await readFile(source)).rotate().resize({ width: 768, height: 768, fit: 'inside' }).jpeg({ quality: 75 }).toBuffer();
  const prompt = scenario.service === 'pattern'
    ? 'Avalie apenas se a imagem é pertinente ao serviço Padrão/Poste: deve mostrar um padrão de entrada elétrica, poste, medidor ou local da instalação. Imagens de joias, pessoas, logos, documentos não relacionados ou objetos genéricos devem ser rejeitadas. Se estiver pouco claro, marque incerta. Não deduza especificações elétricas nem autoria. Responda JSON com campos decisao (aprovada, rejeitada ou incerta) e motivo curto.'
    : 'Avalie apenas se a imagem é uma conta de luz ou fatura de energia elétrica visível. Fotos de painéis solares, telhados, joias, logos ou outros assuntos NÃO são contas de luz e devem ser rejeitadas. Se estiver pouco claro, marque incerta. Não extraia dados pessoais nem deduza autenticidade. Responda JSON com campos decisao (aprovada, rejeitada ou incerta) e motivo curto.';
  const response = await fetch('http://127.0.0.1:11434/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'qwen3-vl:4b-instruct', stream: false, format: { type: 'object', properties: { decisao: { type: 'string', enum: ['aprovada', 'rejeitada', 'incerta'] }, motivo: { type: 'string' } }, required: ['decisao', 'motivo'], additionalProperties: false }, options: { temperature: 0, num_predict: 180 }, messages: [{ role: 'user', content: prompt, images: [image.toString('base64')] }] })
  });
  if (!response.ok) throw new Error(`${scenario.id}: local model HTTP ${response.status}`);
  const result = await response.json();
  let parsed;
  try { parsed = JSON.parse(result.message?.content || ''); } catch { parsed = null; }
  const schemaValid = parsed && ['aprovada', 'rejeitada', 'incerta'].includes(parsed.decisao) && typeof parsed.motivo === 'string' && Object.keys(parsed).sort().join(',') === 'decisao,motivo';
  const effectiveDecision = result.done_reason === 'stop' && schemaValid ? parsed.decisao : 'incerta';
  console.log(JSON.stringify({ id: scenario.id, response: parsed, effectiveDecision, schemaValid: Boolean(schemaValid), finish_reason: result.done_reason, durationMs: Math.round((result.total_duration || 0) / 1e6) }));
}
