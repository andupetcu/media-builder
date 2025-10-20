'use client'

import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { SectionTab } from 'polotno/side-panel'
import { InputGroup } from '@blueprintjs/core'
import { ImagesGrid } from 'polotno/side-panel/images-grid'
import { apiClient } from '@/lib/api-client'
import { useTeamStore } from '@/stores/team-store'
import { nanoid } from 'nanoid'
import { forEveryChild } from 'polotno/model/group-model'

// Icon for the templates section
const MyTemplatesIcon = ({ size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
  </svg>
)

// Panel component
const TeamTemplatesPanel = observer(({ store }: { store: any }) => {
  const [templates, setTemplates] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const teamId = useTeamStore(state => state.currentTeamId)

  const loadTemplates = async () => {
    if (!teamId) return

    setLoading(true)
    try {
      const { data } = await apiClient.get(`/teams/${teamId}/templates`, {
        params: {
          query: searchQuery || undefined,
          per_page: 100,
        },
      })
      setTemplates(data.items || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [teamId, searchQuery])

  const applyTemplate = async (template: any) => {
    try {
      // Load template JSON
      let templateJson = template.doc

      // If doc is not already loaded, fetch it
      if (!templateJson || !templateJson.pages) {
        const { data } = await apiClient.get(`/teams/${teamId}/templates/${template.id}/json`)
        templateJson = data
      }

      // Apply template using the same logic as Polotno's default templates
      if (store.pages.length <= 1) {
        // If only one page or empty, replace everything
        store.loadJSON(templateJson, true)
      } else {
        // Otherwise, insert template pages at current position
        const currentStoreJSON = JSON.parse(JSON.stringify(store.toJSON()))

        // Ensure size compatibility
        if (currentStoreJSON.width !== templateJson.width || currentStoreJSON.height !== templateJson.height) {
          templateJson.pages.forEach((page: any) => {
            page.width = page.width || templateJson.width
            page.height = page.height || templateJson.height
          })
        }

        // Generate new IDs for all elements
        forEveryChild({ children: templateJson.pages }, (child: any) => {
          child.id = nanoid(10)
        })

        // Insert template pages at current position
        const activePageIndex = store.pages.indexOf(store.activePage)
        currentStoreJSON.pages.splice(activePageIndex, 1, ...templateJson.pages)

        store.loadJSON(currentStoreJSON, true)
      }
    } catch (error) {
      console.error('Failed to apply template:', error)
      alert('Failed to apply template')
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <InputGroup
        leftIcon="search"
        placeholder="Search my templates..."
        type="search"
        value={searchQuery}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
        style={{ marginBottom: '20px' }}
      />

      <ImagesGrid
        images={templates}
        getPreview={(template: any) => template.thumbnail || ''}
        isLoading={loading}
        onSelect={applyTemplate}
        shadowEnabled={true}
      />
    </div>
  )
})

// Section definition for Polotno
export const TeamTemplatesSection = {
  name: 'team-templates',
  Tab: (props: any) => (
    <SectionTab name="My Templates" {...props}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MyTemplatesIcon size={20} />
      </div>
    </SectionTab>
  ),
  Panel: TeamTemplatesPanel,
}
