# Editor configuration

Getting started Editor configuration Configure uploads, translations, fonts, and color presets in Polotno How to change image upload behavior?  
 The default Side Panel has an Upload tab to import local images into the project. By default, Polotno converts a local file into a Base64 string. These strings are then used by image elements. Using Base64 may produce large project JSON because images are fully encoded inside it.
It is highly recommended to upload images to your server. This will keep JSON smaller, easier to read, and significantly improve editor performance.
If you want to upload local images to your server, use:
import { setUploadFunc } from 'polotno/config' ;

// define your upload function (implement your API logic here)  
 async function upload ( localFile : File ) {  
 const formData = new FormData ();  
 formData. append ( 'files[]' , localFile);  
 const res = await fetch (yourServerURL, {  
 method: 'POST' ,  
 body: formData,  
 });  
 const json = await res. json ();  
 const { url } = json;  
 // return a simple and short URL  
 return url as string ;  
 }

// set new function  
 setUploadFunc (upload);  
 Similar to image uploads, you can customize font uploading behavior in the Text panel:
import { setFontUploadFunc } from 'polotno/config' ;

// define your upload function (implement your API logic here)  
 async function upload ( localFile : File ) {  
 const formData = new FormData ();  
 formData. append ( 'files[]' , localFile);  
 const res = await fetch (yourServerURL, {  
 method: 'POST' ,  
 body: formData,  
 });  
 const json = await res. json ();  
 const { url } = json;  
 // return a simple and short URL  
 return url as string ;  
 }

// set new function  
 setFontUploadFunc (upload);  
 How to translate UI?  
 If you would like to translate the UI into a different language or change some labels, use:
import { setTranslations } from 'polotno/config' ;

setTranslations (  
 {  
 sidePanel: {  
 text: 'Текст' ,  
 myFonts: 'Мои шрифты' ,  
 },  
 },  
 {  
 validate: true , // set to false if you don't need validation  
 }  
 );  
 To inspect the full translation schema:
import { getTranslations } from 'polotno/config' ;

// log full translations object  
 console. log ( getTranslations ());  
 You can also use the same translation API to translate your custom components:
import { observer } from 'mobx-react-lite' ;  
 import { t } from 'polotno/utils/l10n' ;

// in your component  
 const App = observer (() =&gt; {  
 return &lt; div &gt;{ t ( 'sidePanel.yourLabel' )}&lt;/ div &gt;; // sidePanel.yourLabel is a key in translations object  
 });  
 If you are working on a translation for any language or changing default labels, please share your results—it helps us improve defaults and provide ready-to-use translations.
How to change available fonts and use custom fonts?  
 There are three types of fonts in Polotno :

Google Fonts
User fonts defined in store.fonts  
 Global fonts

1. Google Fonts usage  
   In the default text toolbar, Polotno uses a large list of Google Fonts. If you don't want the full list or want to disable it, use:
   import { setGoogleFonts } from 'polotno/config' ;

// pass an array with Google Fonts names  
 setGoogleFonts ([ 'Roboto' ]);  
 // pass an empty array if you don't want to see Google Fonts in available fonts  
 setGoogleFonts ([]);

// restore default loading of Google Fonts using Polotno API  
 setGoogleFonts ( 'default' );  
 By default Polotno loads regular, italic, bold and bold italic styles. To customize the variants:
import { setGoogleFontsVariants } from 'polotno/config' ;

// default is  
 setGoogleFontsVariants ( '400,400italic,700,700italic' );

// load only regular and thin styles  
 setGoogleFontsVariants ( '400,100' );  
 2) User fonts  
 If you want to add/remove fonts specific to the user, use the Store Fonts API .
Fonts added directly into the store will be included in JSON export via store.toJSON() .
A user can add/remove fonts from the default Text side panel inside the Fonts tab. 3) Global fonts  
 If you want to add fonts for all users, use the global API. Fonts added via the global API are not included in JSON export.
import { addGlobalFont } from 'polotno/config' ;

// add font by its URL  
 addGlobalFont ({  
 fontFamily: 'MyCustomFont' ,  
 url: 'https://example.com/path/to/font.ttf' ,  
 });

// more control over fonts  
 addGlobalFont ({  
 fontFamily: 'MyCustomFont' ,  
 styles: [
{
src: 'url("pathToNormalFile.ttf")' ,
fontStyle: 'normal' ,
fontWeight: 'normal' ,
},
{
src: 'url("pathToBoldFile.ttf")' ,
fontStyle: 'normal' ,
fontWeight: 'bold' ,
},
],  
 });

// if a font is already added into the page by some CSS,  
 // you can register it inside Polotno so it is listed in the toolbar  
 addGlobalFont ({  
 fontFamily: 'MyCustomFont' ,  
 });  
 For frameless integrations, you can also use the global object:
// works on pages where polotno exposes the global config  
 window.polotnoConfig. addGlobalFont ({  
 fontFamily: 'Alucky' ,  
 url: 'https://example.com/font.ttf' , // use a real path to the font file  
 });  
 How to get API endpoints for Google Fonts list and previews  
 import { getGoogleFontsListAPI, getGoogleFontImage } from 'polotno/config' ;

// returns a URL to api.polotno.com  
 const url = getGoogleFontsListAPI ();

// when you fetch the list you can show preview of every font  
 // to get image path you can use this:  
 const preview = getGoogleFontImage ( 'Roboto' );  
 // example usage in JSX  
 &lt; img src = { getGoogleFontImage ( 'Roboto' )} /&gt;  
 Change default preset colors in color picker  
 By default, the color picker generates preset colors from (1) used colors in the design and (2) default colors. You can override this logic with your own presets:
import { setColorsPresetFunc } from 'polotno/config' ;

// define your own function  
 setColorsPresetFunc (( store ) =&gt; {  
 // return array of colors  
 return [ '#000' , '#fff' ];  
 }); Customizations Learn what you can customize in the Polotno editor interface and functionality Theme Enable dark mode and override Polotno UI styles with CSS
