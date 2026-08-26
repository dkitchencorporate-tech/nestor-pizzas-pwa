const fs = require('fs');

const content = fs.readFileSync('src/data/products.ts', 'utf-8');
const names = [...content.matchAll(/name:\s*'([^']+)'/g)].map(m => m[1]);

const dict = {};
names.forEach(name => {
    dict[name.toUpperCase()] = name.toUpperCase(); // Just to list them out, I will translate manually in the response or next script
});

console.log(JSON.stringify(dict, null, 2));
