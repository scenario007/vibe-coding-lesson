const KEY = 'heroes.session.v1'
export function getToken() {
  return localStorage.getItem(KEY)
}
export function saveToken(token: string) {
  localStorage.setItem(KEY, token)
}
export function clearToken() {
  localStorage.removeItem(KEY)
}
