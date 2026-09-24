# Decisão: Tesseract para conta de luz, sem filtro visual de objetos

**Decisão do usuário em 23/09/2026:** retirar a regra que rejeitava fotos com joias ou outros objetos. No campo solar, usar Tesseract OCR para conferir se há texto suficiente de uma conta de luz. No campo padrão/poste, não exigir OCR. Uma foto com conta legível e joias ao lado pode passar; o produto não prometerá bloquear joias.

## Contrato experimental executável

- `policy.mjs` expõe `classifyBillText(text)`: retorna `conta_lida` quando há `conta` ou `fatura`, mais `energia`, mais `consumo` ou `kWh`; retorna `incerta` quando o texto é ausente, insuficiente ou inválido.
- `triage.mjs` valida e decodifica bytes reais antes do OCR. Para `solar`, usa a leitura do Tesseract e a política textual. Para `pattern`, aceita a imagem decodificada sem chamar OCR. Falha de OCR fica `uncertain`, não vira aprovação.
- Os nomes de estados são resultados **locais do protótipo**, não IDs de pedidos nem autorização de acesso. Não há upload, persistência, painel ou conexão com o site nesta etapa.

## Provas locais

- `node --test outputs/image-filter-pilot/policy.test.mjs outputs/image-filter-pilot/intensive-tesseract/preflight.test.mjs outputs/image-filter-pilot/triage.test.mjs`: **9/9 PASS**. Inclui conta com joias aceita quando o texto de fatura está presente, padrão/poste sem chamada OCR, bytes inválidos rejeitados e falha OCR tratada como incerta.
- `triage-run.mjs` chamou o worker Tesseract real: conta fictícia limpa `accepted`, conta fictícia fotografada `accepted`, conta fictícia com joias ao lado `accepted`, joias sozinhas `uncertain`, padrão/poste `accepted` sem OCR. As contas e joias desses casos são sintéticas.
- A bateria de **32 leituras/8 imagens** foi repetida com a regra textual. As duas contas positivas tiveram texto suficiente em todas as leituras. O caso misto de joias ao lado da conta também teve texto suficiente nas quatro leituras — **comportamento agora aceito pelo contrato**, não erro contra ele. [Medições](intensive-tesseract/results.json).

## Ainda não implementado no formulário

O site atual em `dist/` é estático: lê tipo/tamanho e depois pede que a pessoa anexe a foto no WhatsApp. A decisão anterior de **enviar pelo formulário e exibir em painel privado** permanece. Para cumpri-la, faltam endpoint seguro, armazenamento privado, acesso autenticado do atendente e Tesseract disponível no servidor hospedado. Não inserir um rótulo “foto verificada” na página até que esse fluxo esteja completo e testado ponta a ponta.

O número público do WhatsApp continuará podendo receber anexos enviados diretamente fora do formulário. O filtro de texto não controla esse canal.
