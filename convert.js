import fs from 'fs';
import path from 'path';

const htmlPath = path.join(__dirname, 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Extraer el body (rudimentario)
let bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (bodyMatch) {
    let body = bodyMatch[1];
    
    // Remover scripts
    body = body.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // HTML to JSX conversions
    body = body.replace(/class=/g, 'className=');
    body = body.replace(/for=/g, 'htmlFor=');
    body = body.replace(/onclick=/g, 'onClick=');
    body = body.replace(/onsubmit=/g, 'onSubmit=');
    body = body.replace(/<img([^>]*)(?<!\/)>/g, '<img$1 />'); // Self close imgs
    body = body.replace(/<input([^>]*)(?<!\/)>/g, '<input$1 />'); // Self close inputs
    body = body.replace(/<path([^>]*)(?<!\/)>/g, '<path$1 />'); // Self close SVG path
    body = body.replace(/<svg([^>]*)>/g, '<svg$1>');
    body = body.replace(/stroke-linecap=/g, 'strokeLinecap=');
    body = body.replace(/stroke-linejoin=/g, 'strokeLinejoin=');
    body = body.replace(/stroke-width=/g, 'strokeWidth=');
    body = body.replace(/fill-rule=/g, 'fillRule=');
    body = body.replace(/clip-rule=/g, 'clipRule=');
    body = body.replace(/viewbox=/gi, 'viewBox=');
    body = body.replace(/style="([^"]*)"/g, (match, style) => {
        const rules = style.split(';').filter(Boolean);
        const obj = rules.reduce((acc, rule) => {
            const [key, value] = rule.split(':').map(s => s.trim());
            if(!key || !value) return acc;
            const camelKey = key.replace(/-([a-z])/g, g => g[1].toUpperCase());
            acc[camelKey] = value;
            return acc;
        }, {});
        return `style={${JSON.stringify(obj)}}`;
    });
    
    fs.writeFileSync(path.join(__dirname, 'jsx_body.txt'), body, 'utf8');
    console.log('JSX extraido a jsx_body.txt');
} else {
    console.log('No body found');
}
