# Background side panel customization

Side panel Background side panel customization Change default search query and colors for the Background panel You can change the default search query used in the background side panel:
import { setDefaultQuery } from 'polotno/side-panel/background-panel' ;

setDefaultQuery ( 'city' );  
 You can't change other aspects of the default background side panel. If you need more customizations, remove the default panel and implement your own version for full control.
You can change the default color preset using this:
import { setBackgroundColorsPreset } from 'polotno/side-panel/background-panel' ;

setBackgroundColorsPreset ([ 'red' , 'green' ]);  
 Live demo  
 Workspace Main React canvas component to render and interact with designs Custom images panel Load images from your API into a custom SidePanel section
