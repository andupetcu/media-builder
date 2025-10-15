// Quick script to check what's in a design JSON
const designJson = {
  width: 1080,
  height: 1080,
  pages: [
    {
      id: 'page1',
      children: [
        { id: 'bg', type: 'image', name: 'Background' },
        { id: 'shape1', type: 'svg', name: 'Shape' },
        { id: 'text1', type: 'text', text: '{Email}', name: 'Email Variable' },
        { id: 'logo', type: 'image', name: 'Logo' },
      ],
    },
  ],
}

console.log('Design structure:')
console.log('Total pages:', designJson.pages.length)
console.log('Children on page 1:', designJson.pages[0].children.length)
designJson.pages[0].children.forEach((child, i) => {
  console.log(`  ${i}: ${child.type} - ${child.name}`)
})
