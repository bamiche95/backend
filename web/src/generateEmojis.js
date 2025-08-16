import fs from 'fs';
import path from 'path';

// Path to your emojis folder
const emojiFolder = path.resolve('./emojis');

// Generate emoji list
const emojiList = fs.readdirSync(emojiFolder).map(file => `/emojis/${file}`);

// Save the list as JSON
fs.writeFileSync('./emojiList.json', JSON.stringify(emojiList, null, 2));

console.log('Emoji list generated successfully!');
