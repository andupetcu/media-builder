# Animations and Videos

Features Animations and Videos Enable animations, preview on canvas, export as GIF, and render MP4 via Cloud API How to enable animation support?  
 import { unstable_setAnimationsEnabled } from 'polotno/config' ;

unstable_setAnimationsEnabled ( true );  
 When you enable animations, Polotno will add additional UI in the toolbar to change animation properties of the selected object, show a “Videos” side panel with a library of stock videos, and adapt the Pages component with scene preview.
You can preview animations and export an animated scene as a GIF on the client side programmatically:
store. play ();  
 store. stop ();  
 await store. saveAsGIF ();  
 To export the design into a final MP4 video, use the Cloud Render API .
Live demo  
 Store Root data model to control canvas, pages, elements, export, and more Canvas Rulers Show and toggle rulers to improve alignment and precision
