# Next.js

Getting started Next.js Use Polotno Design Editor in a Next.js app (App Router) How to use Polotno Design editor with Next.js?  
 Demo repository: polotno-next

1. Install dependencies  
   npm install polotno canvas
2. Create an Editor component (client-only)  
   Create components/editor.tsx . Do not place it inside pages or app to avoid server-side rendering.
   import React from 'react' ;  
    import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno' ;  
    import { Toolbar } from 'polotno/toolbar/toolbar' ;  
    import { PagesTimeline } from 'polotno/pages-timeline' ;  
    import { ZoomButtons } from 'polotno/toolbar/zoom-buttons' ;  
    import { SidePanel } from 'polotno/side-panel' ;  
    import { Workspace } from 'polotno/canvas/workspace' ;

import { createStore } from 'polotno/model/store' ;

const store = createStore ({  
 key: 'YOUR_API_KEY' , // create an API key at https://polotno.com/cabinet/  
 // you can hide back-link on a paid license  
 // but it will be good if you can keep it for Polotno project support  
 showCredit: true ,  
 });  
 store. addPage ();

export const Editor = () =&gt; {  
 return (  
 &lt; PolotnoContainer style = {{ width:   '100vw'  , height:   '100vh'   }}&gt;  
 &lt; link  
 rel = "stylesheet"  
 href = "https://unpkg.com/@blueprintjs/core@5/lib/css/blueprint.css"  
 /&gt;  
 &lt; SidePanelWrap &gt;  
 &lt; SidePanel store = {store} /&gt;  
 &lt;/ SidePanelWrap &gt;  
 &lt; WorkspaceWrap &gt;  
 &lt; Toolbar store = {store} downloadButtonEnabled /&gt;  
 &lt; Workspace store = {store} /&gt;  
 &lt; ZoomButtons store = {store} /&gt;  
 &lt; PagesTimeline store = {store} /&gt;  
 &lt;/ WorkspaceWrap &gt;  
 &lt;/ PolotnoContainer &gt;  
 );  
 };

export default Editor;  
 3) Use dynamic import in a client component  
 'use client' ;

import dynamic from 'next/dynamic' ;  
 const Editor = dynamic (() =&gt; import ( '../components/editor' ), {  
 ssr: false ,  
 });

export default function Home () {  
 return &lt; Editor /&gt;;  
 }  
 Next.js 15  
 Add the following to your package.json and reinstall dependencies.
{  
 "overrides" : {  
 "polotno" : {  
 "react" : "^19" ,  
 "react-dom" : "^19" ,  
 "react-konva" : "^19.0.3"  
 }  
 }  
 }  
 For pnpm:
{  
 "pnpm" : {  
 "overrides" : {  
 "polotno&gt;react" : "^19" ,  
 "polotno&gt;react-dom" : "^19" ,  
 "polotno&gt;react-konva" : "19.0.3"  
 }  
 }  
 }  
 Config (outdated)  
 Note: these configs were required in previous versions of Next.js. We keep them here temporarily for reference.
If you use the App Router with Webpack, put this into next.config.js :
/\*_ @type {import('next').NextConfig} _/  
 const nextConfig = {  
 webpack : ( config ) =&gt; {  
 config.externals = [ ... config.externals, { canvas: 'canvas' }]; // required to make Konva &amp; react-konva work  
 return config;  
 },  
 };

module . exports = nextConfig;  
 If you use Turbopack, you may need to create an empty file called empty.js and use this config to disable canvas module loading:
/\*_ @type {import('next').NextConfig} _/  
 const nextConfig = {  
 experimental: {  
 turbo: {  
 resolveAlias: {  
 canvas: { browser: './empty.js' },  
 },  
 },  
 },  
 };

export default nextConfig;  
 Live demo  
 Theme Enable dark mode and override Polotno UI styles with CSS Angular Integrate Polotno Design Editor into an Angular application
