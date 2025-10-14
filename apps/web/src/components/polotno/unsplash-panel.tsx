'use client'

import React from 'react'
import { observer } from 'mobx-react-lite'
import { SectionTab } from 'polotno/side-panel'
import { ImagesGrid } from 'polotno/side-panel/images-grid'
import { getImageSize, getCrop } from 'polotno/utils/image'
import { useInfiniteAPI } from 'polotno/utils/use-api'
import { InputGroup } from '@blueprintjs/core'
import MdPhoto from '@meronex/icons/md/MdPhoto'

// Your Unsplash API key
const UNSPLASH_ACCESS_KEY = 'Kr_8PLGrcec6zRWEzXK9dm55U2lkjSYbsTRSB3mZC_w'

const getUnsplashAPI = ({ query, page }: { query: string; page: number }) => {
  const searchQuery = query || 'nature'
  return `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&page=${page}&per_page=20&client_id=${UNSPLASH_ACCESS_KEY}`
}

export const UnsplashPanel = observer(({ store }: { store: any }) => {
  const { setQuery, loadMore, isReachingEnd, data, isLoading, error } = useInfiniteAPI({
    defaultQuery: 'nature',
    getAPI: ({ page, query }) => getUnsplashAPI({ page, query }),
    getSize: (lastResponse: any) => Math.ceil(lastResponse.total / 20),
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <InputGroup
        leftIcon="search"
        placeholder="Search Unsplash photos..."
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          setQuery(e.target.value)
        }}
        type="search"
        style={{ marginBottom: '20px' }}
      />
      <p style={{ textAlign: 'center', marginBottom: '10px', fontSize: '12px', color: '#666' }}>
        Photos by{' '}
        <a
          href="https://unsplash.com"
          target="_blank"
          rel="noreferrer"
          style={{ color: '#0066cc' }}
        >
          Unsplash
        </a>
      </p>
      <ImagesGrid
        images={data?.map((item: any) => item.results).flat().filter(Boolean)}
        getPreview={(image: any) => image.urls.small}
        onSelect={async (image: any, pos?: { x: number; y: number }, element?: any) => {
          // get url of image
          const src = image.urls.regular

          // if we dropped image into svg element, apply mask for it
          if (element && element.type === 'svg' && element.contentEditable) {
            element.set({ maskSrc: src })
            return
          }

          // get image size
          const { width, height } = await getImageSize(src)

          // if dropped into another image, recalculate crop and apply new image
          if (element && element.type === 'image' && element.contentEditable) {
            const crop = getCrop(element, { width, height })
            element.set({ src, ...crop })
            return
          }

          // otherwise create new image
          const x = (pos?.x || store.width / 2) - width / 2
          const y = (pos?.y || store.height / 2) - height / 2
          store.activePage?.addElement({
            type: 'image',
            src,
            width,
            height,
            x,
            y,
          })
        }}
        isLoading={isLoading}
        error={error}
        loadMore={!isReachingEnd && loadMore}
        getCredit={(image: any) => (
          <span style={{ fontSize: '11px' }}>
            Photo by{' '}
            <a
              href={`${image.user.links.html}?utm_source=media-builder&utm_medium=referral`}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#0066cc' }}
            >
              {image.user.name}
            </a>
            {' on '}
            <a
              href="https://unsplash.com/?utm_source=media-builder&utm_medium=referral"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#0066cc' }}
            >
              Unsplash
            </a>
          </span>
        )}
      />
    </div>
  )
})

// Define the custom Unsplash section
export const UnsplashSection = {
  name: 'photos',
  Tab: (props: any) => (
    <SectionTab name="Photos" {...props}>
      <MdPhoto size={24} />
    </SectionTab>
  ),
  Panel: UnsplashPanel,
}
