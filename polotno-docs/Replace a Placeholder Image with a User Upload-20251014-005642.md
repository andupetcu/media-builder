# Replace a Placeholder Image with a User Upload

Demos Replace a Placeholder Image with a User Upload Mark placeholder images and replace them with user-selected photos in Polotno Use this approach when you want to give users the ability to quickly replace a default placeholder image in their design with a custom photo. This is useful for flyers, posters, and other templates where large images can be swapped out.

1. Mark an Image as a Placeholder  
    const width = 600 ;  
   const height = 400 ;  
   // Add a placeholder image element  
   // you can make you own with your own text  
   // placehold.co is just an example, better to use your own image  
   store.activePage. addElement (  
    {  
    type: 'image' ,  
    src: 'https://placehold.co/600x400?text=Click+to+add+image' ,  
    x: (store.width - width) / 2 ,  
    y: (store.height - height) / 2 ,  
    width,  
    height,  
    // custom property to identify placeholder  
    custom: {  
    isPlaceholder: true ,  
    },  
    },  
    { skipSelect: true }  
   );
2. Detect When the Placeholder Is Selected  
   Watch for changes in store.selectedElements . If a placeholder image is selected, show an “Upload Your Picture” button or open a file picker immediately.
3. Replace the Placeholder Image  
   Once a user selects an image file, set the element’s src to the URL of that file and clear out custom.isPlaceholder .
   Implementation Example  
   Below is a minimal React-based implementation. The key points are:

A hidden file input used to pick images
A MobX reaction or state check to detect when the user selects the placeholder
Replacing the placeholder image with the uploaded file

      import   React   from   'react'  ;

import { reaction } from 'mobx' ;

export function usePlaceholderSelection ( store : any ) {  
 const fileInputRef = React. useRef &lt; HTMLInputElement | null &gt;( null );

    // react to selected elements
    React.  useEffect  (()   =&gt;   {
      // Dispose reaction when component unmounts
      const   dispose   =   reaction  (
        ()   =&gt;   store.selectedElements,
        (  selectedElements  :   any  [])   =&gt;   {
          // Check if at least one selected element is a placeholder
          const   placeholder   =   selectedElements.  find  (
            (  el  )   =&gt;   el.custom?.isPlaceholder
          );
          if   (placeholder) {
            // Trigger the hidden file input
            fileInputRef.current?.  click  ();
          }
        }
      );
      return   ()   =&gt;   dispose  ();
    }, [store]);

    // handle file change
    const   handleFileChange   =   (  e  :   React  .  ChangeEvent  &lt;  HTMLInputElement  &gt;)   =&gt;   {
      const   file   =   e.target.files?.[  0  ];
      if   (  !  file)   return  ;

      const   reader   =   new   FileReader  ();
      reader.  onload   =   (  loadEvent  )   =&gt;   {
        // we will use dataURL to set the image
        // but it is recommended to upload image to the server first
        // for better performance and smaller JSON export
        const   dataURL   =   loadEvent.target?.result   as   string  ;
        // Find the currently selected placeholder element
        const   placeholder   =   store.selectedElements.  find  (
          (  el  :   any  )   =&gt;   el.custom?.isPlaceholder
        );
        if   (placeholder) {
          placeholder.  set  ({
            src: dataURL,
            custom: { isPlaceholder:   false   },
          });
        }
      };
      reader.  readAsDataURL  (file);
      // Reset the file input so selecting the same file triggers onChange again
      e.target.value   =   ''  ;
    };

    // Return a hidden file input to be triggered by the reaction
    return   (
      &lt;  input
        ref  =  {fileInputRef}
        type  =  "file"
        style  =  {{ display:   'none'   }}
        accept  =  "image/*"
        onChange  =  {handleFileChange}
      /&gt;
    );

}  
 Then we can use such hook in the app:
import React from 'react' ;  
 import { PolotnoContainer, SidePanelWrap, WorkspaceWrap } from 'polotno' ;  
 import { Toolbar } from 'polotno/toolbar/toolbar' ;  
 import { PagesTimeline } from 'polotno/pages-timeline' ;  
 import { ZoomButtons } from 'polotno/toolbar/zoom-buttons' ;  
 import { SidePanel } from 'polotno/side-panel' ;  
 import { Workspace } from 'polotno/canvas/workspace' ;

export const App = ({ store } : { store : any }) =&gt; {  
 const fileInput = usePlaceholderSelection (store);

    return   (
      &lt;  PolotnoContainer   style  =  {{ width:   '100vw'  , height:   '100vh'   }}&gt;
        &lt;  SidePanelWrap  &gt;
          &lt;  SidePanel   store  =  {store} /&gt;
        &lt;/  SidePanelWrap  &gt;
        &lt;  WorkspaceWrap  &gt;
          &lt;  Toolbar   store  =  {store}   downloadButtonEnabled   /&gt;
          &lt;  Workspace   store  =  {store} /&gt;
          {fileInput}
          &lt;  ZoomButtons   store  =  {store} /&gt;
          &lt;  PagesTimeline   store  =  {store} /&gt;
        &lt;/  WorkspaceWrap  &gt;
      &lt;/  PolotnoContainer  &gt;
    );

};  
 Alternative UI Approaches

Manual Button: Instead of automatically triggering the file input, you can display a button in the Toolbar or Tooltip . Clicking it would open the same file dialog.
Side Panel Section: Create a custom side panel tab that appears only when a placeholder is selected, displaying an “Upload Image” button inside the panel.

Tips

Use a custom property ( custom.isPlaceholder ) or any property you prefer to mark which images can be replaced.
Provide instructions or hints to the end user so they know where and how to upload.
When the user’s image is loaded, consider adjusting its bounding box or aspect ratio if needed.

Live demo  
 Real-time Collaboration with PartyKit Stream and replay MobX patches to sync Polotno stores across clients Single-page view with arrow navigation Show only the active page and add left/right arrows to navigate
