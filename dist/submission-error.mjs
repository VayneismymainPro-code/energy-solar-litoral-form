import { FORM_ERRORS } from './form-core.mjs';

const validationMessages = new Set(Object.values(FORM_ERRORS));

const knownErrors = new Map([
  ['Não conseguimos ler uma conta de luz nessa foto. Envie outra ou informe o consumo.', 'Não conseguimos identificar uma conta de luz legível nessa foto. Escolha outra imagem ou remova a foto para informar o consumo.'],
  ['Não foi possível analisar a conta agora. Tente outra foto ou informe o consumo.', 'Não conseguimos analisar a conta agora. Tente outra foto ou remova a foto para informar o consumo.'],
  ['Não foi possível ler a foto. Escolha outra imagem.', 'Esta imagem não pôde ser aberta. Escolha outra foto.'],
  ['Use uma imagem JPG, PNG ou WebP.', 'A foto precisa ser JPG, PNG ou WebP. Escolha outro arquivo.'],
  ['Selecione uma imagem de até 4 MB.', 'A foto precisa ter até 4 MB. Escolha outro arquivo.'],
  ['Não foi possível salvar o pedido. Seus dados continuam no formulário.', 'Não foi possível registrar o pedido. Seus dados continuam no formulário; tente novamente.'],
  ['Não foi possível ler o pedido.', 'Não conseguimos ler os dados do formulário. Confira as informações e tente novamente.'],
  ['Dados do pedido inválidos.', 'Revise os dados informados e tente novamente.'],
  ['Confira as opções selecionadas.', 'Confira as opções selecionadas e tente novamente.'],
  ['Pedido grande demais.', 'O pedido ficou grande demais. Escolha uma imagem de até 4 MB e tente novamente.'],
  ['Origem do pedido inválida.', 'Não foi possível validar o envio. Atualize a página e tente novamente.']
]);

export function submissionErrorMessage({ status = 0, message = '', responseParsed = true, networkError = false } = {}) {
  if (networkError) {
    return 'Não conseguimos confirmar se o pedido foi registrado. Seus dados continuam aqui. Confira com o atendimento antes de reenviar para evitar duplicidade.';
  }

  if (!responseParsed) {
    return 'Não foi possível confirmar o registro. Seus dados continuam aqui. Confira antes de reenviar para evitar duplicidade.';
  }

  if (validationMessages.has(message)) return message;
  if (knownErrors.has(message)) return knownErrors.get(message);
  if (status === 413) return knownErrors.get('Pedido grande demais.');
  if (status === 429) return 'Muitas tentativas em sequência. Aguarde um pouco e tente novamente.';
  if (status === 403) return knownErrors.get('Origem do pedido inválida.');
  if (status >= 500) return 'O atendimento está temporariamente indisponível. Seus dados continuam aqui; tente novamente em alguns instantes.';
  if (status >= 400) return 'Não conseguimos validar os dados enviados. Confira as informações e tente novamente.';
  return 'Não foi possível concluir o pedido. Seus dados continuam no formulário; tente novamente.';
}
