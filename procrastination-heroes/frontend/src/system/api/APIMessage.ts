import { apiNameOf } from './apiNameOf'
import { APIError, apiRequest } from './apiRequest'
import { getToken } from './authToken'
export abstract class APIMessage<Response> {
  declare readonly responseType: Response
  get authenticated() {
    return true
  }
  send(): Promise<Response> {
    const token = getToken()
    if (this.authenticated && !token)
      return Promise.reject(new APIError('请先登录，再继续冒险。', 401))
    return apiRequest<Response>(
      apiNameOf(this),
      this.authenticated ? { ...this, userToken: token } : this,
    )
  }
}
