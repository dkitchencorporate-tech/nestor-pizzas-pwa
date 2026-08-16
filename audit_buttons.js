const fs = require('fs');
const path = require('path');

function findDeadButtons(dir) {
  let issues = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      issues = issues.concat(findDeadButtons(fullPath));
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Encontrar todos los botones.
      // Usamos regex basica para encontrar tags button.
      const buttonRegex = /<button[^>]*>/g;
      let match;
      while ((match = buttonRegex.exec(content)) !== null) {
        const tag = match[0];
        
        // Verifica si tiene onClick o type="submit"
        const hasOnClick = tag.includes('onClick=');
        const hasSubmit = tag.includes('type="submit"');
        const hasDisabled = tag.includes('disabled'); // aveces un boton esta temporalmente disabled
        
        if (!hasOnClick && !hasSubmit) {
           // Encontrar línea
           const upToMatch = content.slice(0, match.index);
           const line = upToMatch.split('\\n').length;
           issues.push({ file: fullPath, line, type: 'NO_ACTION', tag });
        } else if (hasOnClick) {
           // Si tiene onClick, revisar si tiene alert() o console.log o vacío
           const onClickMatch = tag.match(/onClick=\{([^}]+)\}/);
           if (onClickMatch) {
             const action = onClickMatch[1];
             if (action.includes('alert(') || action.includes('console.log') || action.replace(/\\s/g,'') === '()=>{}') {
               const upToMatch = content.slice(0, match.index);
               const line = upToMatch.split('\\n').length;
               issues.push({ file: fullPath, line, type: 'MOCKED_ACTION', action });
             }
           }
        }
      }
    }
  }
  return issues;
}

const issues = findDeadButtons(path.join(__dirname, 'src'));
console.log(JSON.stringify(issues, null, 2));
