import { api } from '@/services/api'

function getSessionEndpoint() {
  const envBase = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  if (envBase) return `${envBase}/auth/session`

  if (typeof window !== 'undefined') {
    const apiOrigin = window.location.origin.replace(/\/$/, '')
    return `${apiOrigin}/auth/session`
  }

  return '/auth/session'
}

export function redirectThroughSession(returnTo: string) {
  if (!returnTo) return
  const token = api.getToken()
  if (!token) {
    window.location.href = returnTo
    return
  }

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = getSessionEndpoint()
  form.style.display = 'none'

  const tokenInput = document.createElement('input')
  tokenInput.type = 'hidden'
  tokenInput.name = 'token'
  tokenInput.value = token

  const returnInput = document.createElement('input')
  returnInput.type = 'hidden'
  returnInput.name = 'return_to'
  returnInput.value = returnTo

  form.append(tokenInput, returnInput)
  document.body.appendChild(form)
  form.submit()
}
