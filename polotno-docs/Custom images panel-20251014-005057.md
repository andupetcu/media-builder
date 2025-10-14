# Custom images panel

Side panel Custom images panel Load images from your API into a custom SidePanel section How to load custom photos in the side panel?  
 Using the customization API, you can add a new section to the Side Panel to display images from any remote API or your own backend.
You can write a custom panel that loads images from an API:
import React from 'react' ;  
 import { observer } from 'mobx-react-lite' ;  
 import { InputGroup } from '@blueprintjs/core' ;  
 import { SectionTab } from 'polotno/side-panel' ;  
 import { ImagesGrid } from 'polotno/side-panel/images-grid' ;  
 import { getImageSize } from 'polotno/utils/image' ;  
 import MdPhotoLibrary from '@meronex/icons/md/MdPhotoLibrary' ;

export const PhotosPanel = observer (({ store }) =&gt; {  
 const [ images , setImages ] = React. useState &lt; Array &lt;{ url : string }&gt;&gt;([]);

    async   function   loadImages  () {
      // implement your API requests here
      setImages  ([]);

      // emulate network request
      await   new   Promise  ((  resolve  )   =&gt;   setTimeout  (resolve,   3000  ));

      // demo data; in a real app use an API response
      setImages  ([
        { url:   './carlos-lindner-zvZ-HASOA74-unsplash.jpg'   },
        { url:   './guillaume-de-germain-TQWJ4rQnUHQ-unsplash.jpg'   },
      ]);
    }

    React.  useEffect  (()   =&gt;   {
      loadImages  ();
    }, []);

    return   (
      &lt;  div   style  =  {{ height:   '100%'  , display:   'flex'  , flexDirection:   'column'   }}&gt;
        &lt;  InputGroup
          leftIcon  =  "search"
          placeholder  =  "Search..."
          onChange  =  {()   =&gt;   {
            loadImages  ();
          }}
          style  =  {{ marginBottom:   20   }}
        /&gt;
        &lt;  p  &gt;Demo images:&lt;/  p  &gt;
        {  /* you can create your own custom component here */  }
        {  /* but we will use built-in grid component */  }
        &lt;  ImagesGrid
          images  =  {images}
          getPreview  =  {(  image  )   =&gt;   image.url}
          onSelect  =  {  async   (  image  ,   pos  ,   element  ,   event  )   =&gt;   {
            // image - an item from your array
            // pos - relative mouse position on drop. undefined if user just clicked
            // element - model from your store if image was dropped on an element
            // event - can contain additional data
            const   {   width  ,   height   }   =   await   getImageSize  (image.url);
            store.activePage?.  addElement  ({
              type:   'image'  ,
              src: image.url,
              width,
              height,
              x: pos?.x   ||   0  ,
              y: pos?.y   ||   0  ,
            });
          }}
          rowsNumber  =  {  2  }
          isLoading  =  {  !  images.  length  }
          loadMore  =  {  false  }
        /&gt;
      &lt;/  div  &gt;
    );

});

// define the new custom section  
 export const CustomPhotos = {  
 name: 'photos' ,  
 Tab : ( props ) =&gt; (  
 &lt; SectionTab name = "Photos" { ... props}&gt;  
 &lt; MdPhotoLibrary /&gt;  
 &lt;/ SectionTab &gt;  
 ),  
 Panel: PhotosPanel,  
 };  
 Live demo  
 Background side panel customization Change default search query and colors for the Background panel Customizing Resize Panel Build your own Sizes panel with presets and unit-aware inputs
