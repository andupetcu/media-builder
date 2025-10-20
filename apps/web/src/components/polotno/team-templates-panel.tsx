'use client'

import React, { useState, useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { SectionTab } from 'polotno/side-panel'
import { InputGroup, Card } from '@blueprintjs/core'
import { apiClient } from '@/lib/api-client'
import { useTeamStore } from '@/stores/team-store'

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

      // Add pages from template to existing design
      if (templateJson && templateJson.pages) {
        templateJson.pages.forEach((page: any) => {
          const newPage = store.addPage()
          // Copy all page properties
          Object.keys(page).forEach(key => {
            if (key !== 'id' && key !== 'children') {
              newPage.set({ [key]: page[key] })
            }
          })
          // Copy all elements/children
          if (page.children) {
            page.children.forEach((child: any) => {
              newPage.addElement(child)
            })
          }
        })

        // Select the first new page
        if (templateJson.pages.length > 0) {
          const lastPageIndex = store.pages.length - templateJson.pages.length
          store.selectPage(store.pages[lastPageIndex].id)
        }
      }
    } catch (error) {
      console.error('Failed to apply template:', error)
      alert('Failed to apply template')
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-2">
        <InputGroup
          leftIcon="search"
          placeholder="Search my templates..."
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8">
            <MyTemplatesIcon size={48} />
            <p className="text-sm text-gray-600 mt-4 font-semibold">No templates yet</p>
            <p className="text-xs text-gray-500 mt-2 px-4">
              Save your first template using the "Save as Template" button in the editor toolbar
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {templates.map(template => (
              <Card
                key={template.id}
                interactive
                elevation={1}
                className="cursor-pointer hover:shadow-lg transition-shadow p-0 overflow-hidden"
                onClick={() => applyTemplate(template)}
              >
                {template.thumbnail ? (
                  <img
                    src={template.thumbnail}
                    alt={template.name}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-32 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    <MyTemplatesIcon size={32} />
                  </div>
                )}
                <div className="p-3">
                  <h4 className="text-sm font-semibold truncate">{template.name}</h4>
                  {template.description && (
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1">{template.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>
                      {template.width} × {template.height}px
                    </span>
                    {template.tags && template.tags.length > 0 && (
                      <span className="truncate ml-2">#{template.tags[0]}</span>
                    )}
                  </div>
                </div>
              </Card>
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
