export function apiNameOf(message: object) {
  return message.constructor.name.toLowerCase()
}
