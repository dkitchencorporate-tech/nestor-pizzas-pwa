const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(htmlPath, 'utf8');

// Replace everything between <body> and </body>
content = content.replace(/<body[^>]*>([\s\S]*?)<\/body>/i, `<body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
</body>`);

fs.writeFileSync(htmlPath, content, 'utf8');
console.log('index.html updated successfully');
