export class APIError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
export async function apiRequest<T>(name: string, body: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new APIError('暂时连接不到协会，检查后端是否启动后再试。', 0)
  }
  const data = await response.json().catch(() => ({ message: '服务暂时没有响应，请稍后重试。' }))
  if (!response.ok)
    throw new APIError(data.message || '这次操作没有完成，请重试。', response.status)
  return data as T
}
