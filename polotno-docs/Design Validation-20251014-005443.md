# Design Validation

Features Design Validation Validate canvas designs with custom rules using the Store API You can use the Store API to inspect each element's properties on the page, enabling thorough design checks and validation to custom standards. Define your own validation logic and display it however best fits your use case.
Why Use Design Validation?  
 Here are several common use cases where design validation can enhance the design workflow and final output:

Compliance with Brand Guidelines
Ensure elements meet brand standards (e.g., font, color, size) by validating attributes against predefined values. For example, check if all text elements use a specific font or approved color palette.

Image Quality Control
Validate image resolutions to confirm they meet print or screen quality standards, avoiding low‑quality images in high‑resolution exports.

Layout Checks for Export
Review layout constraints to ensure elements are within the visible canvas and aligned correctly, preventing cut‑off or misplaced content in the final export.

Content Accessibility
Check text elements for minimum font size, contrast, and positioning to ensure readability and accessibility compliance.

Getting Started with the Store API  
 The Store API gives you direct access to every element's properties on the canvas, making it easy to build custom validation checks for your specific needs:
const errors : { message : string ; elementId : string }[] = [];

// Use "find" to iterate through all elements  
 store. find (( item ) =&gt; {  
 // Perform validation checks on element properties  
 if (item.type === 'text' ) {  
 if (item.text. length &gt; 300 ) {  
 errors. push ({  
 message: 'Too long text' ,  
 elementId: item.id,  
 });  
 }  
 }  
 });

// then surface errors in your UI (e.g., toolbar, toast, side panel)  
 With Polotno’s Store API, you gain powerful control over your design quality, ensuring that each element aligns with your project standards before exporting or publishing.
Demo  
 In the demo there is a simple validation for position, font size, and image quality. The toolbar shows validation status. Click an issue to select the related element on the canvas.
Custom Elements Create and render your own element types on the canvas Overlays and watermarks Control element behavior with selectable, alwaysOnTop, and showInExport
