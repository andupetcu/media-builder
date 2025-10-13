import { create } from 'zustand'
import { apiClient } from '../lib/api-client'

interface User {
  id: string
  email: string
  name: string
  avatarUrl: string | null
}

interface AuthStore {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean

  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  fetchUser: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        await get().fetchUser()
      } catch (error) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
      }
    }
    set({ isLoading: false })
  },

  login: async (email: string, password: string) => {
    try {
      const { data } = await apiClient.post('/auth/login', { email, password })

      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)

      await get().fetchUser()
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed')
    }
  },

  register: async (email: string, password: string, name: string) => {
    try {
      const { data } = await apiClient.post('/auth/register', {
        email,
        password,
        name,
      })

      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)

      await get().fetchUser()
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed')
    }
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      set({ user: null, isAuthenticated: false })
    }
  },

  fetchUser: async () => {
    try {
      const { data } = await apiClient.get('/users/me')
      set({ user: data, isAuthenticated: true })
    } catch (error) {
      throw error
    }
  },
}))
