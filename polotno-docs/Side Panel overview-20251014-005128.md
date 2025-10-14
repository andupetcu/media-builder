# Side Panel overview

Side panel Side Panel overview Default tabs for adding elements and how to customize side panel SidePanel provides a default set of components for adding new elements to the canvas, changing page sizes, and more.
import { SidePanel } from 'polotno/side-panel' ;

const MyPanel = () =&gt; {  
 return (  
 &lt; div &gt;  
 &lt; SidePanel store = {store} /&gt;  
 &lt;/ div &gt;  
 );  
 };  
 The SidePanel will automatically use the full width and height of its parent; you don't have to manually adjust its size. Set the size of the parent div with CSS.
How to customize side panel tabs?  
 You can pass the sections property to the &lt;SidePanel /&gt; component to specify all available tabs manually.
Default UI:
import { SidePanel, DEFAULT_SECTIONS } from 'polotno/side-panel' ;

const MyPanel = () =&gt; {  
 return (  
 &lt; div &gt;  
 &lt; SidePanel store = {store} sections = { DEFAULT_SECTIONS } /&gt;  
 &lt;/ div &gt;  
 );  
 };  
 Define sections manually:
import { observer } from 'mobx-react-lite' ;  
 import { SidePanel } from 'polotno/side-panel' ;  
 // import existing section  
 import { TextSection } from 'polotno/side-panel' ;

// import default tab component  
 import { SectionTab } from 'polotno/side-panel' ;  
 // import our own icon  
 import FaShapes from '@meronex/icons/fa/FaShapes' ;

// define the new custom section  
 const CustomSection = {  
 name: 'custom' ,  
 Tab : ( props ) =&gt; (  
 &lt; SectionTab name = "Custom" { ... props}&gt;  
 &lt; FaShapes /&gt;  
 &lt;/ SectionTab &gt;  
 ),  
 // we need observer to update component automatically on any store changes  
 Panel: observer (({ store }) =&gt; {  
 return (  
 &lt; div &gt;  
 &lt; p &gt;Here we will define our own custom tab.&lt;/ p &gt;  
 &lt; p &gt;Elements on the current page: {store.activePage?.children. length }&lt;/ p &gt;  
 &lt;/ div &gt;  
 );  
 }),  
 };

// we will have just two sections  
 const sections = [CustomSection, TextSection];

const CustomSidePanel = () =&gt; {  
 return &lt; SidePanel store = {store} sections = {sections} defaultSection = "custom" /&gt;;  
 };  
 Live demo  
 Remove side panel Hide or remove specific side panel sections in Polotno Upload panel Implement a persistent, backend-powered Upload section for user images
