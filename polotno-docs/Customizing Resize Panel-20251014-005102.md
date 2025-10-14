# Customizing Resize Panel

Side panel Customizing Resize Panel Build your own Sizes panel with presets and unit-aware inputs How to set your own default page sizes?  
 You can make your own panel from scratch and define new Sizes section. For example:
import React, { useState, useEffect } from 'react' ;  
 import { observer } from 'mobx-react-lite' ;  
 import { Button, NumericInput, HTMLSelect } from '@blueprintjs/core' ;  
 import { pxToUnitRounded, unitToPx } from 'polotno/utils/unit' ;

const MIN_PX = 10 ;

const PRESETS = [
{ label: 'IG Post' , w: 1080 , h: 1080 , unit: 'px' },
{ label: 'IG Story' , w: 1080 , h: 1920 , unit: 'px' },
{ label: 'Full HD' , w: 1920 , h: 1080 , unit: 'px' },
{ label: 'A4' , w: 21 , h: 29.7 , unit: 'cm' },
{ label: 'Letter' , w: 8.5 , h: 11 , unit: 'in' },
];

const Num = ({ value , onChange , ... rest }) =&gt; {  
 const [ val , setVal ] = useState (value);  
 useEffect (() =&gt; setVal (value), [value]);  
 return (  
 &lt; NumericInput  
 { ... rest}  
 value = {val}  
 onValueChange = {( v ) =&gt; setVal (v)}  
 onBlur = {() =&gt; onChange (val)}  
 onKeyDown = {( e ) =&gt; e.key === 'Enter' &amp;&amp; onChange (val)}  
 allowNumericCharactersOnly = { false }  
 fill  
 /&gt;  
 );  
 };

export const ResizePanel = observer (({ store }) =&gt; {  
 const [ w , setW ] = useState ( 0 );  
 const [ h , setH ] = useState ( 0 );

    useEffect  (()   =&gt;   {
      setW  (
        pxToUnitRounded  ({ px: store.width, unit: store.unit, dpi: store.dpi })
      );
      setH  (
        pxToUnitRounded  ({ px: store.height, unit: store.unit, dpi: store.dpi })
      );
    }, [store.width, store.height, store.unit, store.dpi]);

    const   applyResize   =   (  unitW   =   w,   unitH   =   h)   =&gt;   {
      const   widthPx   =   unitToPx  ({
        unitVal: unitW,
        unit: store.unit,
        dpi: store.dpi,
      });
      const   heightPx   =   unitToPx  ({
        unitVal: unitH,
        unit: store.unit,
        dpi: store.dpi,
      });
      if   (widthPx   &gt;=   MIN_PX   &amp;&amp;   heightPx   &gt;=   MIN_PX  )
        store.  setSize  (widthPx, heightPx,   true  );
    };

    const   Row   =   ({   children   })   =&gt;   (
      &lt;  div
        style  =  {{
          display:   'flex'  ,
          alignItems:   'center'  ,
          gap:   8  ,
          marginBottom:   10  ,
        }}
      &gt;
        {children}
      &lt;/  div  &gt;
    );

    return   (
      &lt;  div   style  =  {{ padding:   16  , overflowY:   'auto'  , maxHeight:   '100%'   }}&gt;
        &lt;  Row  &gt;
          &lt;  div   style  =  {{ width:   60   }}&gt;Width&lt;/  div  &gt;
          &lt;  Num   value  =  {w}   onChange  =  {setW}   min  =  {  1  } /&gt;
        &lt;/  Row  &gt;
        &lt;  Row  &gt;
          &lt;  div   style  =  {{ width:   60   }}&gt;Height&lt;/  div  &gt;
          &lt;  Num   value  =  {h}   onChange  =  {setH}   min  =  {  1  } /&gt;
        &lt;/  Row  &gt;
        &lt;  Row  &gt;
          &lt;  div   style  =  {{ width:   60   }}&gt;Units&lt;/  div  &gt;
          &lt;  HTMLSelect
            value  =  {store.unit}
            options  =  {[  'px'  ,   'cm'  ,   'in'  ]}
            onChange  =  {(  e  )   =&gt;
              store.  setUnit  ({ unit: e.target.value, dpi: store.dpi })
            }
            fill
          /&gt;
        &lt;/  Row  &gt;
        &lt;  Button
          intent  =  "primary"
          fill
          onClick  =  {()   =&gt;   applyResize  ()}
          style  =  {{ marginBottom:   16   }}
        &gt;
          Resize
        &lt;/  Button  &gt;

        {  /* preset buttons, one per row */  }
        {  PRESETS  .  map  (({   label  ,   w  :   pw  ,   h  :   ph  ,   unit   })   =&gt;   (
          &lt;  Button
            key  =  {label}
            fill
            style  =  {{ height:   60  , marginBottom:   8   }}
            onClick  =  {()   =&gt;   {
              store.  setUnit  ({ unit, dpi: store.dpi });
              applyResize  (pw, ph);
            }}
          &gt;
            {label}
            &lt;  span   style  =  {{ fontSize:   '0.75em'  , marginLeft:   6  , opacity:   0.7   }}&gt;
              {pw}×{ph} {unit}
            &lt;/  span  &gt;
          &lt;/  Button  &gt;
        ))}
      &lt;/  div  &gt;
    );

});  
 Live demo  
 Custom images panel Load images from your API into a custom SidePanel section Hidden panels Implement a side panel that doesn’t appear in tabs and opens programmatically
