# Energy Solar Litoral

Formulário de orçamento em três etapas para Energia Solar e Padrão/Poste, com API de pedidos em Netlify Functions e painel privado para o atendimento.

## Estrutura

- `dist/`: página pública, galerias e painel em `admin.html`.
- `netlify/functions/`: recebimento de pedidos, autenticação, consulta de pedidos/fotos e exclusão diária após 30 dias.
- `netlify/lib/`: validação no servidor, OCR em português, autorização e regras de armazenamento.
- `netlify/ocr/por.traineddata`: dados do idioma português usados pelo Tesseract no servidor.

`dist/` é a fonte pública servida diretamente, não um diretório descartável de build. As fotos de clientes são gravadas em **Netlify Blobs**, nunca dentro de `dist/`.

## Fluxo

1. A pessoa escolhe o serviço, preenche os dados e pode selecionar uma foto JPG/PNG/WebP de até **4 MB**.
2. A Function valida e decodifica a imagem real. Para Energia Solar, a foto da conta de luz passa pelo Tesseract OCR; se não houver texto suficiente, o cliente tenta outra foto ou informa o consumo manualmente. Para Padrão/Poste não há OCR.
3. Após a API salvar o pedido e a foto, a página mostra um ID e o link para a conversa de WhatsApp. A mensagem leva o ID; o cliente não precisa anexar a foto outra vez.
4. Um usuário do Netlify Identity com papel **`admin`** vê pedidos e fotos no painel `/admin.html`. As rotas `/api/orders` e `/api/photo` exigem o papel no servidor. Pedidos e fotos expiram após **30 dias**; uma Function agendada roda diariamente.

O OCR apenas identifica termos de conta de energia; não prova autenticidade e não barra joias ou outros objetos na imagem. O número WhatsApp é o valor já existente no projeto (`554199587407`); sua titularidade e recebimento real não foram confirmados.

## Desenvolvimento local

Instale dependências e inicie o runtime Netlify:

```powershell
npm install
npx netlify dev --offline --port 8888 --dir dist
```

Abra `http://127.0.0.1:8888/`. Servir somente `dist/` com `python -m http.server` mostra a interface, mas **não** registra pedidos nem executa OCR. Netlify Dev usa um armazenamento local isolado; não acessa as fotos de produção.

Para o painel em produção, crie/vincule um site Netlify, habilite Netlify Identity com inscrição por convite e atribua o papel `admin` apenas aos atendentes autorizados. O login do painel usa `/api/login`; as rotas privadas verificam o papel também no servidor. Não compartilhe credenciais em arquivos do repositório.

## Verificação

```powershell
npm test
node tests/netlify-local.mjs
npx netlify functions:build -s netlify/functions -f .netlify/functions-verify
```

`tests/netlify-browser.mjs` também verifica a interface no runtime Netlify e usa o Playwright disponibilizado pelo ambiente de QA. `tests/browser.mjs` e `tests/gallery.mjs` mantêm os percursos de interface com resposta de API simulada. Fotos e dados dos testes são fictícios. Nenhum teste abre ou envia uma mensagem de WhatsApp.

## Limites de entrega

- A publicação exige uma conta Netlify conectada e um projeto criado ou vinculado. O CLI local sem autenticação não consegue concluir `netlify build`/deploy.
- O pacote de Functions montado **neste Windows** contém o binário Windows do `sharp`. A publicação deve instalar dependências e montar as Functions em um build **Linux da Netlify**, por exemplo pelo repositório Git conectado, antes de ser considerada verificada em produção. Não enviar o ZIP local como artefato final.
- A função síncrona da Netlify tem limite de payload; o formulário usa 4 MB para imagens por esse motivo.
- Ainda é necessário verificar em um deploy privado: convite/login de um atendente `admin`, leitura da foto armazenada, execução agendada da retenção e recebimento externo no WhatsApp. HTTP 201 local e build das Functions não provam esses pontos.
- Anexos enviados diretamente ao número aberto do WhatsApp ficam fora do controle do formulário.
