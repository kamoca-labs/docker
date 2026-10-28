import { composeContent, composeRole, deny, entries, lines, readInput, targetPath } from '../lib.ts'

const input = readInput()
const role = composeRole(targetPath(input))
const yaml = role === 'base' ? null : composeContent(input)
const first = yaml === null ? null : entries(lines(yaml))[0]

if (yaml !== null && (first?.key !== 'name' || !first.value)) {
  deny('compose-name', 'The first key of the compose file must be `name:` with a value (example: `name: ${APP_NAME:-app}`), before `services:`. Containers get this name through ${COMPOSE_PROJECT_NAME}.')
}

if (first && role === 'dev' && !first.value.replace(/^["']/, '').startsWith('dev-')) {
  deny('compose-name', `Dev compose file with a name that has no dev- prefix: ${first.value}. Use \`name: dev-\${APP_NAME:-app}\`.`)
}
