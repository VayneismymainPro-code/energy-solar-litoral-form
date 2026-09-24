# Refinamento visual Energy Solar — validação local

**Data:** 23/09/2026  
**Estado:** integrado e validado localmente na pasta principal.  
**Prévia:** http://127.0.0.1:4190/ (servidor estático local sobre `dist/`).

## Arquivos integrados

- `dist/index.html` — entrada com cartões ilustrados para os dois serviços; galeria responsiva e diálogo de ampliação acessível.
- `dist/app.mjs` — textos das etapas, estado separado por serviço e ampliação com restauração de foco.
- `dist/styles.css` — acabamento visual, cartões da entrada, galerias compactas e diálogo responsivo.
- `tests/gallery.mjs` — cobertura de troca de imagem, estados, zoom, teclado, fechamento e foco.
- `tests/browser.mjs` — cobertura dos dois fluxos, rolagem horizontal a 200%, atualização assíncrona do resumo e destino do WhatsApp.

Os arquivos atuais de telefone foram preservados sem alteração nesta integração: `dist/form-core.mjs`, `tests/form-core.test.mjs` e `README.md` continuam usando `+55 41 99558-7407` (`5541995587407`). Os demais arquivos WIP foram mantidos.

## Verificações

| Verificação | Resultado |
|---|---|
| `npm test` na pasta principal | PASS — 25/25 |
| `tests/browser.mjs`, apontado à prévia local da pasta principal | PASS — Energia Solar e Padrão/Poste, validação, Enter, foto, edição, preservação, reinício, resumo seguro, destino `5541995587407`, sem erros de console/HTTP |
| `tests/gallery.mjs`, apontado à prévia local da pasta principal | PASS — mouse/teclado, três fotos por serviço, seleção independente, visibilidade por etapa, reinício, ampliação por botão e teclado, Esc/Fechar, retorno de foco e carregamento |
| Regressão visual automatizada | PASS — 320, 390, 768 e 1440 px; texto raiz de 32 px (200%) nos quatro tamanhos; ambas as galerias e diálogos sem overflow horizontal; sem erros de console/HTTP |
| Capturas | 16 arquivos em `outputs/refinamento-final/capturas/` |
| `Netlify Dev` local com Functions | NOT_VERIFIED — inicializou a página estática, mas a CLI encerrou ao copiar `netlify/ocr/tesseract-core.wasm` para o bundle da Function (`EBUSY`) |

O teste de navegador foi ajustado para esperar a resposta assíncrona do resumo e verificar overflow em vez de procurar `.preview-label`, que não existe nesta versão. Nenhuma mensagem foi aberta ou enviada pelo WhatsApp.

## Limites

- A prévia em `http://127.0.0.1:4190/` serve a interface estática; não comprova execução local das Functions.
- A bateria de regras exercita as rotas localmente em `npm test`; a integração real com o runtime Netlify permanece não verificada pelo erro de cópia do WASM.
- Não houve teste de recebimento real no WhatsApp, produção, Safari/iPhone real ou auditoria completa de acessibilidade.
- Sem commit, push ou deploy.

## Pacote para Netlify

`energy-solar-litoral-form-netlify-source.zip` é um pacote de código-fonte para o Netlify executar o build definido em `netlify.toml`; inclui `dist`, Functions, OCR, dependências travadas, testes, fixtures sintéticas e esta evidência final. Não inclui `.git`, `node_modules`, `.netlify`, cache local, `work/` nem imagens originais não usadas pelo site. O ZIP não foi publicado.

## Ajuste de fundo solicitado depois da integração

O fundo geral passou para `#ead89a`, um amarelo queimado suave em relação ao amarelo de destaque `#ffd329`. Na entrada, a placa branca do logo foi removida e o marcador passou a usar o mesmo fundo do restante da página. Conferi a prévia local na entrada e nos dois serviços; as capturas responsivas foram atualizadas para 320, 390, 768 e 1440 px e 200% de texto, sem overflow horizontal.
