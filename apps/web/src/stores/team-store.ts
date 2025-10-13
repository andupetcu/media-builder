import { create } from 'zustand'
import { apiClient } from '../lib/api-client'

interface Org {
  id: string
  name: string
  slug: string
  role: string
}

interface Team {
  id: string
  orgId: string
  name: string
  slug: string
  role: string
}

interface TeamStore {
  orgs: Org[]
  teams: Team[]
  currentTeamId: string | null
  currentOrgId: string | null
  isLoading: boolean

  initialize: () => Promise<void>
  setCurrentTeam: (teamId: string) => void
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  orgs: [],
  teams: [],
  currentTeamId: null,
  currentOrgId: null,
  isLoading: false,

  initialize: async () => {
    set({ isLoading: true })
    try {
      // Fetch user's orgs
      const { data: orgs } = await apiClient.get('/orgs')

      if (orgs.length > 0) {
        const firstOrg = orgs[0]

        // Fetch teams for the first org
        const { data: teams } = await apiClient.get(`/orgs/${firstOrg.id}/teams`)

        set({
          orgs,
          teams,
          currentOrgId: firstOrg.id,
          currentTeamId: teams[0]?.id || null,
        })
      }
    } catch (error) {
      console.error('Failed to fetch orgs/teams:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  setCurrentTeam: (teamId: string) => {
    const team = get().teams.find(t => t.id === teamId)
    if (team) {
      set({ currentTeamId: teamId, currentOrgId: team.orgId })
    }
  },
}))
