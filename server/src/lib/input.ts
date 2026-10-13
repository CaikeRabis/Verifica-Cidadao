import { ApiError } from '../errors'

export const MIN_INPUT = 10
export const MAX_INPUT = 3000

/** Valida e normaliza a entrada. Lança ApiError(400/422) quando inválida. */
export function validateInput(body: unknown): string {
  const raw = (body as { input?: unknown } | null | undefined)?.input
  if (typeof raw !== 'string') {
    throw new ApiError(400, 'invalid_input', 'Envie o texto a ser verificado no campo "input".')
  }
  // remove caracteres de controle (exceto quebras de linha e tab) e normaliza espaços
  const input = raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
  if (input.length < MIN_INPUT) {
    throw new ApiError(400, 'invalid_input', `Digite pelo menos ${MIN_INPUT} caracteres para verificar.`)
  }
  if (input.length > MAX_INPUT) {
    throw new ApiError(
      400,
      'invalid_input',
      `O texto é muito longo. Envie até ${MAX_INPUT} caracteres, de preferência só o trecho que deseja verificar.`,
    )
  }
  if (/^https?:\/\/\S+$/i.test(input)) {
    throw new ApiError(
      422,
      'unsupported_format',
      'Nesta versão a verificação funciona com texto. Cole o trecho da informação em vez do link.',
    )
  }
  return input
}
