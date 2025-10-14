import * as puppeteer from 'puppeteer'

async function testPolotnoRender() {
  console.log('Starting Polotno render test...')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  const page = await browser.newPage()

  // Listen for console messages
  page.on('console', msg => {
    console.log(`[Browser Console ${msg.type()}]:`, msg.text())
  })

  // Listen for errors
  page.on('pageerror', error => {
    console.error(`[Browser Error]:`, error.message)
  })

  const width = 800
  const height = 600

  await page.setViewport({
    width,
    height,
    deviceScaleFactor: 2,
  })

  // Simple test design
  const designJson = {
    width: 800,
    height: 600,
    pages: [
      {
        id: 'page1',
        children: [
          {
            type: 'text',
            x: 50,
            y: 50,
            text: 'Hello World',
            fontSize: 40,
            fill: 'black',
          },
        ],
      },
    ],
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/konva@9/konva.min.js"></script>
  <script src="https://unpkg.com/mobx@6/dist/mobx.umd.production.min.js"></script>
  <script src="https://unpkg.com/polotno@2.29.2/build/polotno.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: white;
    }
  </style>
</head>
<body>
  <canvas id="canvas" width="${width}" height="${height}"></canvas>
  <script>
    console.log('Script starting...');
    console.log('window.polotno:', typeof window.polotno);

    // Wait for libraries to load
    setTimeout(function() {
      try {
        console.log('Checking polotno...');
        if (!window.polotno) {
          throw new Error('polotno library not loaded');
        }

        console.log('Creating store...');
        const { createStore } = window.polotno;
        const store = createStore({ key: '', showCredit: false });

        console.log('Loading JSON...');
        const designJson = ${JSON.stringify(designJson)};
        store.loadJSON(designJson);

        console.log('Pages loaded:', store.pages.length);

        // Wait for images then render
        setTimeout(async function() {
          try {
            console.log('Rendering to canvas...');
            const page = store.pages[0];
            const canvas = document.getElementById('canvas');

            await window.polotno.unstable_renderAsCanvas({
              store,
              pageId: page.id,
              canvas,
              pixelRatio: 2,
            });

            console.log('Render complete!');
            window.polotnoReady = true;
          } catch (err) {
            console.error('Render error:', err);
            window.polotnoError = err.message;
          }
        }, 1000);
      } catch (err) {
        console.error('Setup error:', err);
        window.polotnoError = err.message;
      }
    }, 2000);
  </script>
</body>
</html>
  `

  console.log('Setting page content...')
  await page.setContent(html, {
    waitUntil: 'networkidle0',
    timeout: 60000,
  })

  console.log('Waiting for ready or error...')
  await page.waitForFunction('window.polotnoReady === true || window.polotnoError', {
    timeout: 60000,
  })

  const hasError = await page.evaluate('window.polotnoError')
  const isReady = await page.evaluate('window.polotnoReady')

  console.log('Error:', hasError)
  console.log('Ready:', isReady)

  if (!hasError) {
    console.log('✅ Polotno loaded successfully!')
  } else {
    console.log('❌ Polotno failed to load:', hasError)
  }

  await browser.close()
  console.log('Test complete')
}

testPolotnoRender().catch(console.error)
