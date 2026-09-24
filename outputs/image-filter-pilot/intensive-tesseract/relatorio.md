# Bateria intensiva local — Tesseract OCR

> **Decisão posterior:** a exigência de rejeitar joias/objetos alheios foi retirada pelo usuário. Este relatório preserva a medição histórica do filtro estrito; `falseApprovals` abaixo significa apenas que OCR encontrou palavras de fatura na foto mista, não uma falha contra o contrato atual. O contrato vigente está em [proposta-triagem-imagens-2026-09-23.md](../../proposta-triagem-imagens-2026-09-23.md).

**Data:** 23/09/2026. **Objeto:** verificar se Tesseract pode ajudar a reconhecer fotos de conta de luz no formulário Energy Solar e, sobretudo, se seria seguro usá-lo para bloquear fotos alheias. Não houve integração ao site, upload de clientes, publicação nem envio ao WhatsApp.

## Ambiente e corpus

- Tesseract.js **7.0.0**, worker `por`, no Node.js local. O executável `tesseract.exe` não estava instalado. O pacote estava no runtime já disponível; nenhum pacote foi adicionado ao produto.
- **8 imagens**: duas contas de luz fictícias positivas (uma limpa e uma foto sintética de celular inclinada, com luz irregular); quatro negativas centrais (joias sobre conta, joias ao lado de conta legível, joias sem conta e logo); e duas fotos alheias ao campo de conta (padrão/poste e painéis solares). Todos os documentos de conta e imagens de joias são sintéticos. A foto de padrão e a de painéis já faziam parte do material local do projeto. Nenhuma foto pessoal de cliente foi usada.
- A nova conta de celular, [conta-celular-ficticia.png](conta-celular-ficticia.png), foi gerada com o ImageGen integrado para este ensaio. Prompt: foto manual realista de fatura elétrica brasileira fictícia, inclinada cerca de 12°, luz interna irregular e leve desfoque, com “CONTA DE ENERGIA ELÉTRICA”, “Consumo do mês” e “452 kWh”, sem dados reais, QR code ou marca. O arquivo é um teste e não entra no site.
- **32 leituras**: `SINGLE_BLOCK` duas vezes em cada imagem; `AUTO` e `SPARSE_TEXT` uma vez cada. O worker foi criado uma vez e reutilizado; o texto OCR integral não foi salvo. `results.json` guarda apenas termos detectados, confiança informada pelo motor, tamanho e hash curto do texto para verificar repetibilidade.

## Critério medido

Uma regra **somente OCR** liberaria uma foto se o texto contivesse os três grupos: `conta` ou `fatura`, `energia` e `consumo` ou `kWh`. Isso mede presença de palavras, **não** se a foto mostra apenas uma conta, nem autenticidade do documento. O teste usa exatamente esse sinal textual da função experimental `combineBillChecks` quando as demais respostas são simuladas como favoráveis; a decisão real combinada ainda não foi executada com vision e OCR no mesmo backend.

## Resultado

| Caso | Esperado | SINGLE_BLOCK | AUTO | SPARSE_TEXT |
|---|---|---|---|---|
| Conta fictícia limpa | detectar palavras de conta | PASS | PASS | PASS |
| Conta fictícia fotografada em ângulo | detectar palavras de conta | PASS | PASS | PASS |
| Joias sobre conta parcialmente visível | **não aprovar foto mista** | não passou no OCR | não passou no OCR | não passou no OCR |
| Joias ao lado de conta legível | **não aprovar foto mista** | **FALSO POSITIVO** | **FALSO POSITIVO** | **FALSO POSITIVO** |
| Joias sem conta | não encontrar termos completos | PASS | PASS | PASS |
| Foto de padrão/poste | não tratar como conta | PASS | PASS | PASS |
| Painéis solares | não tratar como conta | PASS | PASS | PASS |
| Logo | não tratar como conta | PASS | PASS | PASS |

As duas contas positivas passaram nas **8/8 leituras positivas**; a foto de joias ao lado da conta passou indevidamente em **4/4 leituras** (contando a repetição de `SINGLE_BLOCK`). Essas leituras não são amostras independentes de clientes e não justificam porcentagens de precisão. Repetindo `SINGLE_BLOCK`, os hashes curtos do OCR foram iguais nos oito pares neste ambiente.

`AUTO` retornou confiança OCR de **91** para a imagem com joias ao lado da conta e valores altos até para imagens sem texto de fatura. Esse número não é probabilidade de pertinência; um corte de confiança não resolve o falso positivo. O Tesseract levou **79–1.834 ms por imagem** nas 32 leituras, média observada de aproximadamente **593 ms**; inicialização medida em **158 ms** com idioma já disponível no ambiente, e RSS final aproximado de **149 MB**. Esses tempos não são benchmark de produção, concorrência nem partida fria.

## Entrada inválida e robustez

Um ensaio isolado passando bytes que não são imagem diretamente ao Tesseract.js encerrou o processo Node com erro não recuperado pelo `try/catch` em volta de `recognize`. A bateria normal foi repetida sem esse caso e concluiu 32/32 leituras. A política necessária para um backend é **decodificar e validar antes do OCR**. O protótipo `preflight.mjs` usa `sharp` para checar bytes, formatos aceitos, limite de 10 MB e teto de 16 megapixels, além de decodificar a imagem completa. `node --test preflight.test.mjs` passou **3/3**: PNG válido aceito; bytes vazios, texto fingindo ser JPG, excesso de tamanho e imagem truncada rejeitados. Esse código é apenas prova local, não está ligado ao formulário.

## Veredito

**Usar Tesseract como sinal adicional somente para o campo “conta de luz”; rejeitar Tesseract como aprovador único.** O falso positivo 4/4 com joias e conta na mesma foto contraria o bloqueio que o usuário pediu. No ramo Padrão/Poste, OCR nem deve ser obrigatório: a foto válida pode não conter texto relevante. O servidor futuro deve exigir, além do OCR, verificação visual da categoria e de objetos alheios em destaque; respostas ausentes, incertas ou contraditórias não liberam a foto. O painel privado não pode receber imagem antes da decisão server-side.

**NOT_VERIFIED:** contas reais desidentificadas, imagens de clientes, variações de celular/aparelho, documentos parcialmente cortados, ataques deliberados, falsa rejeição em produção, inferência concorrente, privacidade/retensão e integração com servidor/painel/WhatsApp. Este corpus pequeno e sintético não calibra taxa de erro nem prova que o bloqueio seja confiável para uso real.

## Reprodução

Com o runtime local onde `tesseract.js` e `sharp` estão disponíveis em `NODE_PATH`:

```powershell
$env:NODE_PATH='C:/Users/Gabri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
node 'outputs/image-filter-pilot/intensive-tesseract/run.mjs'
node --test 'outputs/image-filter-pilot/intensive-tesseract/preflight.test.mjs'
node --test 'outputs/image-filter-pilot/policy.test.mjs'
```

O script lê somente amostras explicitamente listadas, não percorre fotos pessoais nem grava o texto reconhecido. Saídas estruturadas: [results.json](results.json) e [tesseract-results.json](../tesseract-results.json) para o ensaio anterior.
