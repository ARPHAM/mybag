const fs = require('fs');

const filesToUpdate = [
  './app/(main)/tasks/tasks.module.css',
];

for (const filePath of filesToUpdate) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Cyan
    content = content.replace(/#00f0ff/gi, 'var(--sao-primary-hex)');
    content = content.replace(/0,\s*240,\s*255/g, 'var(--sao-primary-rgb)');
    
    // Green (Health)
    content = content.replace(/#00ffaa/gi, 'var(--sao-primary-hex)');
    content = content.replace(/0,\s*255,\s*170/g, 'var(--sao-primary-rgb)');
    
    // Yellow (Shopping)
    content = content.replace(/#ffaa00/gi, 'var(--sao-primary-hex)');
    content = content.replace(/255,\s*170,\s*0/g, 'var(--sao-primary-rgb)');

    // Cyan variation
    content = content.replace(/0,\s*200,\s*255/g, 'var(--sao-primary-rgb)');
    content = content.replace(/0,\s*150,\s*255/g, 'var(--sao-primary-rgb)');

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}
