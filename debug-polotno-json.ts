// Quick script to examine the actual structure of Polotno JSON to understand text elements

import * as fs from 'fs'

// Sample Polotno text element structure for debugging
const samplePolotnoDesign = {
  pages: [
    {
      children: [
        {
          type: 'text',
          text: '{Email}',
          x: 100,
          y: 100,
          fontSize: 24,
          fill: '#000000',
        },
      ],
    },
  ],
}

console.log('Sample Polotno structure:')
console.log(JSON.stringify(samplePolotnoDesign, null, 2))

// This will help us understand what properties Polotno actually uses for text
console.log('\nCheck your actual design JSON to see if text elements have:')
console.log('- text property (the actual text content)')
console.log('- fontSize (number or string?)')
console.log('- fill (color as hex or name?)')
console.log('- x, y coordinates')
console.log('- width, height dimensions')
