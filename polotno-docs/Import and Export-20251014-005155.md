# Import and Export

Export &amp; Import Import and Export Overview of Polotno’s import (JSON) and export (PNG, JPEG, PDF, HTML, SVG, GIF, MP4) options Polotno offers a comprehensive suite of tools for importing and exporting designs, catering to a wide range of needs from simple JSON file handling to high-quality image and video exports. This page outlines the various import and export capabilities of Polotno with typical use cases.
Use Cases

JSON Import and Export : Save and load design states, share templates, or integrate with other systems that utilize JSON.
Image Exports (PNG, JPEG) : Create high‑quality images for digital use, social media, or printing.
PDF Export : Produce high‑quality prints, useful for marketing materials, books, and documentation.
HTML and SVG Export : Embed designs into websites (experimental).
GIF Export : Create animated designs for web use.
MP4 Video Export : Create video content for digital marketing and social media (via Cloud Render API).

Importing Designs  
 Polotno allows you to import a design from a JSON file. This functionality is ideal for loading saved design states or templates into the Polotno editor. Whether you're resuming a previous project or sharing templates with team members, importing JSON files ensures a seamless workflow.
The JSON must follow Polotno's store structure .
Polotno doesn't support importing of other formats like PDF, PPT, PSD. But you can write your own tools to convert other formats into Polotno's JSON. If you plan to do that, please contact us to collaborate on it.
Exporting Designs  
 For a deep dive into available options for each export, see the store documentation .
JSON Export  
 Save the current design state to JSON for storage, sharing, or integration.
store. toJSON ();  
 PNG and JPEG Export  
 Export designs to PNG or JPEG with configurable quality. Do it client‑side or server‑side depending on your workflow.
await store. saveAsImage ();  
 await store. toDataURL ();  
 PDF Export  
 Export designs into PDF files. Currently, PDFs contain raster images (JPEGs), but can be exported in very high quality and are suitable for printing. Both client‑side and server‑side are supported.
store. saveAsPDF ();  
 HTML and SVG Export (Experimental)  
 Export designs into HTML and SVG. These formats are experimental and may not fully support all features or produce consistent results. Useful for embedding designs into websites.
store. saveAsHTML ();  
 store. saveAsSVG ();  
 GIF Export  
 Export animated designs as GIFs for use in banners, ads, and social posts. Available client‑side and server‑side.
store. saveAsGIF ();  
 MP4 Video Export (Cloud Render API)  
 Export to MP4 is available via the Cloud Render API (not in the browser). Use MP4 for video content in marketing, social, and more. Utils API Helper components and hooks for building custom side panels Cloud Render API Render images, GIFs, PDFs, and MP4 videos from Polotno JSON in the cloud
