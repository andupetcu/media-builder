/**
 * Removes Polotno branding from the DOM
 * This runs periodically to catch dynamically added branding elements
 */
export function removePolotnoBranding() {
  // Remove all links to polotno.com
  const links = document.querySelectorAll('a[href*="polotno"]')
  links.forEach(link => {
    ;(link as HTMLElement).style.display = 'none'
    link.remove()
  })

  // Remove elements containing "Powered by" text
  const allElements = document.querySelectorAll('*')
  allElements.forEach(element => {
    const text = element.textContent?.trim() || ''
    if (
      (text.includes('Powered by') && text.includes('polotno')) ||
      text === 'Powered by polotno.com' ||
      text.toLowerCase().includes('polotno.com')
    ) {
      // Check if it's a small element (likely a credit/watermark)
      const rect = element.getBoundingClientRect()
      if (rect.height < 100 && rect.width < 300) {
        ;(element as HTMLElement).style.display = 'none'
        element.remove()
      }
    }
  })

  // Remove any absolutely/fixed positioned elements in bottom-right that contain polotno
  const positionedElements = document.querySelectorAll(
    '[style*="position: absolute"], [style*="position: fixed"]'
  )
  positionedElements.forEach(element => {
    const style = window.getComputedStyle(element)
    const text = element.textContent?.toLowerCase() || ''

    if (
      (style.position === 'absolute' || style.position === 'fixed') &&
      text.includes('polotno')
    ) {
      ;(element as HTMLElement).style.display = 'none'
      element.remove()
    }
  })
}

/**
 * Initialize branding removal with periodic checks
 */
export function initializePolotnoBrandingRemoval() {
  // Run immediately
  removePolotnoBranding()

  // Run after a short delay to catch lazy-loaded elements
  setTimeout(removePolotnoBranding, 500)
  setTimeout(removePolotnoBranding, 1000)
  setTimeout(removePolotnoBranding, 2000)

  // Set up a MutationObserver to watch for new elements
  const observer = new MutationObserver(() => {
    removePolotnoBranding()
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  // Also run periodically as a fallback
  setInterval(removePolotnoBranding, 3000)

  return () => observer.disconnect()
}
