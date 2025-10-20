'use client'

import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { SectionTab } from 'polotno/side-panel'
import { InputGroup, Button, Spinner } from '@blueprintjs/core'
import { apiClient } from '@/lib/api-client'
import { useTeamStore } from '@/stores/team-store'
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
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

  const deleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the apply template action

    if (!confirm('Are you sure you want to delete this template?')) {
      return
    }

    setDeletingId(templateId)
    try {
      await apiClient.delete(`/teams/${teamId}/templates/${templateId}`)
      // Remove from local state
      setTemplates(prev => prev.filter(t => t.id !== templateId))
    } catch (error) {
      console.error('Failed to delete template:', error)
      alert('Failed to delete template')
    } finally {
      setDeletingId(null)
    }
  }

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
        const generateId = () => {
          return Math.random().toString(36).substring(2, 12)
        }

        forEveryChild({ children: templateJson.pages }, (child: any) => {
          child.id = generateId()
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

      <div style={{ height: '100%', overflow: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}>
            <Spinner />
          </div>
        ) : templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
            <MyTemplatesIcon size={48} />
            <p style={{ marginTop: '10px' }}>No templates found</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0' }}>
            {templates.map(template => (
              <div
                key={template.id}
                style={{
                  padding: '5px',
                  width: '100%',
                  float: 'left',
                }}
              >
                <div
                  style={{
                    borderRadius: '5px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 0 5px rgba(16, 22, 26, 0.3)',
                    cursor: 'pointer',
                  }}
                  onClick={() => applyTemplate(template)}
                >
                  <img
                    src={template.thumbnail || ''}
                    alt={template.name}
                    style={{
                      width: '100%',
                      display: 'block',
                      maxHeight: '300px',
                      minHeight: '50px',
                      objectFit: 'contain',
                    }}
                  />
                  <Button
                    icon="trash"
                    intent="danger"
                    minimal
                    small
                    loading={deletingId === template.id}
                    onClick={(e: React.MouseEvent) => deleteTemplate(template.id, e)}
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
