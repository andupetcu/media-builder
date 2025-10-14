# QR Code Side Panel

Components QR Code Side Panel Lean how to install and customize the QR Code side panel Installatin  
 CLI Manual npx shadcn@latest add http://registry.polotno.com:/r/qr-code.json After installatin you will see a new create file in /src/components/side-panel/qr-code.tsx
You can move that file to any other location you want and customize it per your needs. npx install qr-code @meronex/icons Copy and paste the following code into your project. examples/components/side-panel/qr-code.tsx import React from 'react' ;  
 import { observer } from 'mobx-react-lite' ;  
 import { SectionTab } from 'polotno/side-panel' ;  
 import QRCode from 'qrcode' ;  
 import \* as svg from 'polotno/utils/svg' ;  
 import FaQrcode from '@meronex/icons/fa/FaQrcode' ;  
 import { Button, InputGroup } from '@blueprintjs/core' ;

// create svg image for QR code for input text  
 export async function getQR ( text : string ) {  
 return new Promise (( resolve ) =&gt; {  
 QRCode. toString (  
 text || 'no-data' ,  
 {  
 type: 'svg' ,  
 color: {  
 dark: '#000' , // Blue dots  
 light: '#fff' , // Transparent background  
 },  
 },  
 ( err , string ) =&gt; {  
 resolve (svg. svgToURL (string));  
 }  
 );  
 });  
 }

// define the new custom section  
 export const QrSection = {  
 name: 'qr' ,  
 Tab : ( props : any ) =&gt; (  
 &lt; SectionTab name = "QR code" { ... props}&gt;  
 &lt; FaQrcode /&gt;  
 &lt;/ SectionTab &gt;  
 ),  
 // we need observer to update component automatically on any store changes  
 Panel: observer (({ store } : { store : any }) =&gt; {  
 const inputRef = React. useRef ( null );  
 return (  
 &lt; div &gt;  
 &lt; h3 style = {{ marginBottom:   '10px'  , marginTop:   '5px'   }}&gt;QR code&lt;/ h3 &gt;  
 &lt; p &gt;Generate QR code with any URL you want.&lt;/ p &gt;  
 &lt; InputGroup  
 placeholder = "Paste URL here"  
 style = {{ width:   '100%'  , marginTop:   '10px'  , marginBottom:   '10px'   }}  
 inputRef = {inputRef}  
 /&gt;

          &lt;  Button
            onClick  =  {  async   ()   =&gt;   {
              const   src   =   await   getQR  (inputRef.current.value);

              store.activePage.  addElement  ({
                type:   'svg'  ,
                name:   'qr'  ,
                x:   50  ,
                y:   50  ,
                width:   200  ,
                height:   200  ,
                src,
              });
            }}
            fill
            intent  =  "primary"
          &gt;
            Add new QR code
          &lt;/  Button  &gt;
        &lt;/  div  &gt;
      );
    }),

};

Usage  
 import { QrSection } from './side-panel/qr-code' ; // make sure to change the path to the correct location  
 import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel' ;

const sections = [ ... DEFAULT_SECTIONS , QrSection];

&lt; SidePanel sections = {sections} /&gt;  
 Demo  
 Refresh preview [3/3] Starting Brand Kit Side Panel Lean how to install and customize the Brand Kit side panel Sandpack Demo Component Interactive code sandbox for Polotno examples
