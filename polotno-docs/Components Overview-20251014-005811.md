# Components Overview

Components Components Overview Open, customizable UI components you add to your repository Open components — own and customize  
 These components are installed as source files into your repository. You commit them, edit them, and adapt them to your product. They’re designed to be customized — markup, styles, and behavior are all yours.
Note: we still publish npm components for convenience. These “open components” are an additional option when you want full control and easy customization.
Add components  
 Use our CLI to add components; it copies files into your repo (commonly under ./src/components/ ). # add a few UI components  
 npx shadcn@latest add http://registry.polotno.com:/r/qr-code.json  
 Customize

Edit the component files directly to match your UX, API and business logic
Because it’s your code, refactors and reviews are straightforward

Update or remove

To update, add the component again and compare diffs in Git (cherry‑pick what you need)
To remove, delete the files and related imports — no special uninstall
Units and Measures How Polotno uses pixels, setting UI units, converting values, and export DPI Brand Kit Side Panel Lean how to install and customize the Brand Kit side panel
