import { composeContent, deny, entries, isDeploy, lines, readInput, targetPath } from '../lib.ts'

const input = readInput()
const yaml = composeContent(input)
const first = yaml === null ? null : entries(lines(yaml))[0]

if (yaml !== null && (first?.key !== 'name' || !first.value)) {
  deny('compose-name', 'A primeira chave do compose deve ser `name:` com valor (ex.: `name: ${APP_NAME:-app}`), antes de `services:`. Os containers herdam esse nome por ${COMPOSE_PROJECT_NAME}.')
}

if (first && !isDeploy(targetPath(input)) && !first.value.replace(/^["']/, '').startsWith('dev-')) {
  deny('compose-name', `Compose de dev com name sem o prefixo dev-: ${first.value}. Use \`name: dev-\${APP_NAME:-app}\`.`)
}
