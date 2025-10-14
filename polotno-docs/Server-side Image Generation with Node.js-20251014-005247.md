# Server-side Image Generation with Node.js

Export &amp; Import Server-side Image Generation with Node.js Render images from Polotno JSON on the backend using polotno-node Is it possible to generate images from Polotno JSON on the backend?  
 Yes, you can leverage the polotno-node package .
Using polotno-node you can use most of the Polotno Store API . The common usage is image export from Polotno JSON:
const fs = require ( 'fs' );  
 // import polotno-node API  
 const { createInstance } = require ( 'polotno-node' );

async function run () {  
 // create working instance  
 const instance = await createInstance ({  
 // to create your own API key please go here: https://polotno.com/cabinet  
 key: 'nFA5H9elEytDyPyvKL7T' ,  
 });

    // load sample json
    const   json   =   JSON  .  parse  (fs.  readFileSync  (  'polotno.json'  ));
    // here you can manipulate JSON somehow manually
    // for example replace some images or change text

    // then we can convert json into image
    const   imageBase64   =   await   instance.  jsonToImageBase64  (json);   // default is PNG
    // write image into local file
    fs.  writeFileSync  (  'out.png'  , imageBase64,   'base64'  );

    // also we can export design into lower size
    // and change image type
    const   jpegImage   =   await   instance.  jsonToImageBase64  (json, {
      pixelRatio:   0.5  ,   // make image twice smaller
      mimeType:   'image/jpeg'  ,
    });
    fs.  writeFileSync  (  'out.jpg'  , jpegImage,   'base64'  );

    // close instance
    instance.  close  ();

}

run (); PPTX Export Export Polotno designs to PowerPoint format Video Export Convert Polotno designs to video files using browser-based encoding
