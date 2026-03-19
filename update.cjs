const fs = require('fs');
const path = require('path');
const dir = path.join('e:', 'travelplan', 'src', 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
files.forEach(f => {
    let content = fs.readFileSync(path.join(dir, f), 'utf8');
    let updated = content.replace(/className=\"(.*?bg-white.*?)\"/g, (match, p1) => {
        if (!p1.includes('dark:bg-gray-900')) {
            return `className="${p1.replace('bg-white', 'bg-white dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100')}"`;
        }
        return match;
    });
    if (content !== updated) {
        fs.writeFileSync(path.join(dir, f), updated);
        console.log(`Updated ${f}`);
    }
});
