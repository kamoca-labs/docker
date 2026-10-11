import { composeContent, deny, lines, readInput } from '../lib.ts'

const PROVIDED_BY_COMPOSE = new Set(['COMPOSE_PROJECT_NAME'])

const yaml = composeContent(readInput())
const text = yaml === null ? '' : lines(yaml).map((line) => line.text).join('\n').replaceAll('$$', '')
const missing = [...new Set(text.matchAll(/\$\{(\w+)\}|\$(\w+)/g).map((match) => match[1] ?? match[2]))]
  .filter((variable) => !PROVIDED_BY_COMPOSE.has(variable))

if (missing.length) {
  deny('var-defaults', `Variável sem default: ${missing.join(', ')}. Use \${${missing[0]}:-valor}; segredo sem default seguro vira \${${missing[0]}:?defina ${missing[0]} no .env}.`)
}
