# Brand Kit Side Panel

Components Brand Kit Side Panel Lean how to install and customize the Brand Kit side panel The Brand Kit side panel is a tool that allows you to manage your brand kit. It includes a color palette, typography, and assets.
We recommend to read the Overview page to understand how to use the Brand Kit side panel.
Installation  
 npx shadcn@latest add http://registry.polotno.com:/r/brand-kit.json  
 After installatin you will see a new files in /src/components/side-panel/brand-kit/
You can move that file to any other location you want and customize it per your needs.
Usage  
 // make sure to change the path to the correct location  
 import { BrandKitSection } from './components/side-panel/brand-kit/brand-kit-panel' ;  
 import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel' ;

const sections = [ ... DEFAULT_SECTIONS , BrandKitSection];

// in sidepanel render:  
 &lt; SidePanel sections = {sections} /&gt;  
 Demo  
 Refresh preview [3/3] Starting Components Overview Open, customizable UI components you add to your repository QR Code Side Panel Lean how to install and customize the QR Code side panel
