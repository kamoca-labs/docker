import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export type HookInput = {
  tool_name?: string
  tool_input: { file_path?: string, content?: string, old_string?: string, new_string?: string, replace_all?: boolean }
  cwd: string
}

export type Line = { indent: number, text: string }

export type Entry = { key: string, value: string, body: Line[] }

const COMPOSE_FILE = /^(docker-)?compose(\.[\w-]+)?\.ya?ml$/
const CASES_LOG = process.env.HOOK_CASES_LOG || path.join(os.homedir(), '.claude', 'hook-cases.jsonl')

let currentInput: HookInput | null = null

export function readInput(): HookInput {
  const input = JSON.parse(fs.readFileSync(0, 'utf8'))
  currentInput = { ...input, cwd: input.cwd || process.cwd() }
  return currentInput!
}

function capture(rule: string, reason: string) {
  if (!currentInput) return
  const { tool_name, tool_input } = currentInput
  const useCase = { plugin: 'docker', description: reason, origin: 'real', tool_name, tool_input, deny: [rule] }
  try {
    fs.appendFileSync(CASES_LOG, `${JSON.stringify(useCase)}\n`)
  } catch {}
}

export function deny(rule: string, reason: string): never {
  capture(rule, reason)
  process.stderr.write(`[docker:${rule}] ${reason}\n`)
  process.exit(2)
}

export function isDeploy(file: string): boolean {
  return file.split(path.sep).includes('deploy')
}

export function targetPath({ tool_input, cwd }: HookInput): string {
  return path.resolve(cwd, tool_input.file_path || '')
}

export function contentAfter(input: HookInput): string | null {
  const { content, old_string, new_string, replace_all } = input.tool_input
  if (content !== undefined) return content
  if (old_string === undefined || new_string === undefined) return null
  try {
    const current = fs.readFileSync(targetPath(input), 'utf8')
    return replace_all ? current.replaceAll(old_string, new_string) : current.replace(old_string, () => new_string)
  } catch {
    return null
  }
}

export function composeContent(input: HookInput): string | null {
  return COMPOSE_FILE.test(path.basename(targetPath(input))) ? contentAfter(input) : null
}

export function lines(yaml: string): Line[] {
  return yaml.split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('#') && line.trim() !== '---')
    .map((line) => ({ indent: line.length - line.trimStart().length, text: line.trim() }))
}

export function entries(block: Line[]): Entry[] {
  if (!block.length) return []
  const indent = Math.min(...block.map((line) => line.indent))
  const result: Entry[] = []
  for (const line of block) {
    const isKey = line.indent === indent && !line.text.startsWith('-')
    if (!isKey) {
      result.at(-1)?.body.push(line)
      continue
    }
    const match = line.text.match(/^["']?([^"':]+)["']?\s*:(?:\s+(.*))?$/)
    result.push({ key: match?.[1] ?? line.text, value: match?.[2] ?? '', body: [] })
  }
  return result
}

export function items(block: Line[]): string[] {
  if (!block.length) return []
  const indent = Math.min(...block.map((line) => line.indent))
  const result: string[] = []
  for (const line of block) {
    if (line.indent === indent && line.text.startsWith('-')) result.push(line.text.replace(/^-\s*/, ''))
    else if (result.length) result[result.length - 1] += `\n${line.text}`
  }
  return result
}

export function services(yaml: string): Entry[] {
  return entries(entries(lines(yaml)).find((entry) => entry.key === 'services')?.body ?? [])
}

export function field(service: Entry, key: string): Entry | undefined {
  return entries(service.body).find((entry) => entry.key === key)
}

export function values(entry: Entry | undefined): string[] {
  if (!entry) return []
  const inline = entry.value.replace(/^\[|\]$/g, '')
  const raw = inline ? inline.split(',') : items(entry.body)
  return raw.map((value) => value.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
}
