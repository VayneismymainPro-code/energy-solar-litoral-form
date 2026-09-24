# Ensaio local de pertinência de imagens

> **Histórico:** a regra de rejeitar fotos por conter joias ou outros objetos foi retirada depois deste ensaio. As checagens visuais documentadas abaixo não fazem parte do contrato atual. Consulte [o contrato atualizado](../proposta-triagem-imagens-2026-09-23.md).

**Data:** 23/09/2026. **Objetivo:** verificar se um modelo visual disponível localmente consegue distinguir algumas fotos relacionadas a padrão/poste de imagens claramente alheias. Não altera o formulário, não recebe fotos de clientes e não é validação para produção.

## Execução

- Modelo: `qwen3-vl:4b-instruct` servido localmente pelo Ollama em `127.0.0.1:11434`.
- Arquivos lidos localmente, sem envio a um serviço externo. Foram reduzidos para no máximo 768 × 768 pixels antes da inferência, sem salvar a versão reduzida.
- `evaluate.mjs` envia imagem e critério de serviço, pede resposta JSON com `decisao` e `motivo` e usa schema com enum. Saída malformada, truncada, sem os dois campos ou diferente de `stop` vira `incerta` no ensaio.
- A foto de joias é **sintética**, criada com a ferramenta embutida de geração de imagem exclusivamente para o teste negativo (`joias-ficticias-negativo.png`). Prompt: fotografia realista de anéis e colar em mesa neutra, sem pessoas, texto, logos, conta de luz, poste ou painel solar. Não é foto de cliente nem faz parte da página.

## Observações

| Caso | Esperado | Modelo local |
|---|---|---|
| Padrão/poste foto 08 selecionada | aprovada | aprovada |
| Padrão/poste foto 23 selecionada | aprovada | aprovada |
| Padrão/poste foto 18 selecionada | aprovada | aprovada |
| Joias fictícias | rejeitada | rejeitada |
| Logo Energy Solar como imagem de padrão/poste | rejeitada | rejeitada |
| Conta de luz sintética | aprovada | aprovada |
| Joias sobre conta sintética | **rejeitada** | **aprovada (erro)** |
| Painéis solares no campo “conta de luz” | rejeitada | rejeitada |
| Joias no campo “conta de luz” | rejeitada | rejeitada |

**8/9 no primeiro classificador:** o caso misto foi aprovado indevidamente porque a conta estava visível atrás das joias. Não ativar essa checagem sozinha. Uma primeira execução em `format: 'json'` deixou o modelo alterar o nome de um campo (`motivo curto`); o formato restrito por JSON Schema fez os retornos cumprirem o contrato. Estrutura válida não prova classificação correta.

`detect-unrelated.mjs` fez uma **segunda pergunta com outro critério ao mesmo modelo**, focada em objetos alheios em destaque. Marcou `false` para a fatura sintética limpa e `true` para joias sozinhas ou sobre a conta (**3/3 nesses casos**). A política conservadora proposta é aprovar apenas quando as duas respostas forem válidas, a primeira aprovar a categoria e a segunda não encontrar objeto alheio. Divergência, incerteza, falha, truncamento ou JSON inválido bloqueiam o avanço. Os erros das duas respostas podem ser correlacionados; isso não garante barrar toda imagem de joias.

`policy.mjs` implementa apenas a combinação das respostas para este ensaio, incluindo respostas ausentes, malformadas, com campos extras e tipo errado. Não está ligado ao formulário nem é um endpoint de upload.

## Ensaio com Tesseract OCR

O ambiente não tem o executável `tesseract.exe`, mas já inclui `tesseract.js` 7.0.0 no runtime de desenvolvimento. `tesseract-evaluate.mjs` usou um worker com idioma português, sem adicionar pacote ao produto. A saída resumida está em `tesseract-results.json`; texto completo não foi salvo para evitar retenção acidental de dados de imagens.

| Imagem | Termos de fatura encontrados | Confiança OCR observada |
|---|---|---:|
| Conta fictícia limpa | conta, energia, consumo, kWh, fatura | 93 |
| Joias sobre conta fictícia inclinada | nenhum dos termos pesquisados | 38 |
| Joias ao lado de conta fictícia legível | conta, energia, consumo, kWh | 56 |
| Joias sem conta | nenhum | 39 |
| Foto selecionada de padrão/poste | nenhum | 40 |

**Conclusão do ensaio:** OCR é um sinal útil para reconhecer texto de conta de luz, mas o caso com joias ao lado também contém todos os termos necessários. Portanto, não aprova foto sozinho e não substitui visão para padrão/poste ou para detectar objetos alheios. A confiança acima é o número retornado pelo motor neste pequeno conjunto, não uma taxa de acerto calibrada. Fotos reais tortas, cortadas ou pouco nítidas precisam de testes separados.

`policy.mjs` combina os sinais no ramo solar: aprovação visual da fatura **e** ausência visual de objetos alheios **e** texto OCR com termos de conta/energia/consumo. Se o OCR faltar ou não encontrar os termos, o resultado vira `incerta`. Os testes da política agora passam **3/3**, incluindo a regra de que OCR positivo não libera joias quando a checagem de objetos as detecta. Continua apenas um protótipo local; não há upload/painel no produto.

`joias-ao-lado-conta-ficticias.png` é a terceira imagem sintética de teste, gerada pela ferramenta integrada. Prompt: fotografia de conta de energia plana e legível, com título e consumo sem obstrução, e anéis e colar em destaque ao lado; sem dados pessoais reais. Não foi adicionada à página.

## Limites antes da implementação

- O campo de Energia Solar pede **conta de luz**. Foi usado um documento sintético com dados fictícios (`conta-ficticia.png`); não foi fornecida uma conta real desidentificada. A foto de painéis foi rejeitada para esse campo.
- `joias-sobre-conta-ficticias.png` é outra imagem sintética de teste, criada com a ferramenta embutida: anéis e colar em destaque sobre conta fictícia parcialmente visível, sem dados pessoais reais. Ela revelou o falso positivo do primeiro classificador.
- O projeto atual é uma página estática; nenhum endpoint de upload, armazenamento privado ou painel autenticado foi implementado.
- O servidor Ollama foi iniciado somente nesta máquina. Ele não é infraestrutura hospedada e não resolve a ausência do projeto Energy Solar na conta Sites conectada.
- Para produção, testar imagens positivas e negativas reais de cada categoria, inclusive fotos ruins, documentos com informações privadas ocultadas, imagens mistas e tentativas de burlar MIME. Rejeitar ou encaminhar para revisão resultados incertos, falhas de classificação e saídas fora do contrato.
- Mesmo com backend, o site não controla anexos enviados diretamente ao número aberto do WhatsApp.

**Próximo corte implementável:** upload no servidor + decodificação real do arquivo + análise de pertinência + persistência somente da foto aprovada + painel privado autenticado. O WhatsApp leva apenas o ID do pedido. Antes de ativar, precisamos de uma amostra desidentificada de conta de luz, definição final das categorias aceitas para Solar, acesso ao projeto hospedado e serviço de inferência que funcione no ambiente de produção.
