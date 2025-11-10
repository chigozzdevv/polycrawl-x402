import { api } from '@/services/api'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export function redirectThroughSession(returnTo: string) {
  if (!returnTo) return
  const token = api.getToken()
  if (!apiBaseUrl || !token) {
    window.location.href = returnTo
    return
  }

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = `${apiBaseUrl}/auth/session`
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
