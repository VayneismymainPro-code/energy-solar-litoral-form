import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyBillText } from './policy.mjs';

test('Tesseract text recognizes a readable electricity bill without inspecting other objects', () => {
  const billWords = 'CONTA DE ENERGIA ELÉTRICA. Consumo do mês: 452 kWh';
  assert.equal(classifyBillText(billWords), 'conta_lida');
  assert.equal(classifyBillText(`${billWords}\nAnéis sobre a mesa`), 'conta_lida');
});

test('missing or insufficient OCR text stays uncertain', () => {
  for (const value of ['joias de ouro', 'conta de energia', '', null, {}, []]) {
    assert.equal(classifyBillText(value), 'incerta');
  }
});
