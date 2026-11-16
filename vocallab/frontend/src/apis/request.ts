import type { z } from 'zod'

export function endpoint(api: object, ...path: string[]) {
  const operation = api.constructor.name.toLowerCase()
  return ['/api', operation, ...path.map(encodeURIComponent)].join('/')
}

export function checked<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) throw new Error('服务器返回了无法读取的数据。')
  return result.data
}

export function errorText(data: unknown, status: number) {
  if (typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string') return data.error
  return `请求未完成（${status}）。请检查本地服务。`
}

export async function request<T>(api: object, schema: z.ZodType<T>, body?: unknown, signal?: AbortSignal) {
  const response = await fetch(endpoint(api), body === undefined ? { signal } : {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-VocalLab': '1' },
    body: JSON.stringify(body), signal,
  })
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new Error(errorText(data, response.status))
  return checked(schema, data)
}
