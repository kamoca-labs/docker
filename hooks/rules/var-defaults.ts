import { composeContent, deny, lines, readInput } from '../lib.ts'

const PROVIDED_BY_COMPOSE = new Set(['COMPOSE_PROJECT_NAME'])

const yaml = composeContent(readInput())
const text = yaml === null ? '' : lines(yaml).map((line) => line.text).join('\n').replaceAll('$$', '')
const missing = [...new Set(text.matchAll(/\$\{(\w+)\}|\$(\w+)/g).map((match) => match[1] ?? match[2]))]
  .filter((variable) => !PROVIDED_BY_COMPOSE.has(variable))

if (missing.length) {
  deny('var-defaults', `Variable without a default: ${missing.join(', ')}. Use \${${missing[0]}:-value}. A secret with no safe default becomes \${${missing[0]}:?set ${missing[0]} in the .env}.`)
}
