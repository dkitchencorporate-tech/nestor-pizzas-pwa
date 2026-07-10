const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const urls = content.match(/https:\/\/images\.unsplash\.com\/photo-[^\?\'\"\s]+\?[^\'\"\s]+/g) || [];
const unique = [...new Set(urls)];
console.log('Checking', unique.length, 'unique Unsplash URLs...');
Promise.all(unique.map(async u => {
    try {
        const r = await fetch(u, {method: 'HEAD'});
        return {u, status: r.status};
    } catch (e) {
        return {u, status: 'ERROR: ' + e.message};
    }
})).then(results => {
    let brokenCount = 0;
    results.forEach(r => {
        if (r.status !== 200) {
            console.log('BROKEN/NON-200:', r.status, '->', r.u);
            brokenCount++;
        }
    });
    console.log(`Check complete. Found ${brokenCount} broken URLs out of ${unique.length}.`);
});
