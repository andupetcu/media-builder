# Saving custom data into a design

Misc Saving custom data into a design Store additional metadata on store, pages, and elements via the custom attribute How to save additional metadata into a design?  
 In some use cases, you may want to save your own data into the store/page/element. You may want to save:

Name of the design
Design id
Custom page properties
Element metadata

For such use cases, you can use the custom attribute. It is available for all nodes in the store: the store itself, any page, any element.
// set custom data  
 element. set ({  
 custom: {  
 // optionally, keep previous custom data  
 ... element.custom,  
 // save new data  
 price: 10 ,  
 },  
 });

// read custom data  
 // notice that by default element.custom will be null  
 const price = element.custom?.price;

// also you can save metadata into a page  
 page. set ({  
 custom: {  
 ... page.custom,  
 reference: 'sample' ,  
 },  
 });

// or into store  
 store. set ({  
 custom: {  
 productId: 'some-id' ,  
 },  
 });  
 custom must be an object {} . You can write any data into that object. Polotno never uses it for rendering, so it is under your control. By default, custom will be null , so when you read some data from custom , make sure it is defined. Remove Background API Programmatically remove image backgrounds using Polotno Cloud API Store Observer and Reactions React to canvas changes using observer components, store events, and MobX reactions
