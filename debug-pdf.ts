import pdf from 'pdf-parse';
import * as fs from 'fs';

const dataBuffer = fs.readFileSync('./data/19th-jan.pdf');

pdf(dataBuffer).then((data: any) => {
  const text = data.text;

  console.log('=== SEARCHING FOR "Country-wise Revenue" SECTION ===\n');
  const countryIdx = text.search(/Country.*wise.*Revenue/i);
  if (countryIdx >= 0) {
    console.log('Found at index:', countryIdx);
    console.log('\nText from that section (800 chars):');
    console.log(text.substring(countryIdx, countryIdx + 800));
    console.log('\n================\n');
  }

  console.log('=== SEARCHING FOR ALL MTD VALUES ===\n');
  const mtdPattern = /MTD[\s\n]+([\d,]+)/gi;
  let match;
  let count = 1;
  while ((match = mtdPattern.exec(text)) !== null) {
    const idx = match.index;
    console.log(`Match ${count}: MTD = ${match[1]}`);
    console.log(`Context: ...${text.substring(Math.max(0, idx-80), idx + 120)}...`);
    console.log('---\n');
    count++;
    if (count > 10) break; // Limit to first 10 matches
  }

  console.log('\n=== SEARCHING FOR "Brand Mix" SECTION ===\n');
  const brandIdx = text.search(/Brand.*Mix/i);
  if (brandIdx >= 0) {
    console.log('Found at index:', brandIdx);
    console.log('\nText from that section (600 chars):');
    console.log(text.substring(brandIdx, brandIdx + 600));
    console.log('\n================\n');
  }
});
