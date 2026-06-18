const fs = require('fs');
const path = require('path');

const rawPath = path.join(__dirname, 'raw_export.json');
const outputPath = path.join(__dirname, 'public', 'regions.json');

const raw = fs.readFileSync(rawPath, 'utf8');
const root = JSON.parse(raw);

const rootArray = root[Object.keys(root)[0]];
const firstObject = rootArray[0];
const firstValue = firstObject[Object.keys(firstObject)[0]];

const geojson = JSON.parse(firstValue);

if (geojson.type !== 'FeatureCollection') {
  throw new Error(`Tipo inesperado: esperado "FeatureCollection", recebido "${geojson.type}"`);
}
if (!Array.isArray(geojson.features) || geojson.features.length < 1) {
  throw new Error('"features" precisa ser um array com pelo menos 1 item');
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));

console.log(`Features encontradas: ${geojson.features.length}`);
console.log('Codes:');
for (const feature of geojson.features) {
  console.log(`- ${feature.properties.code}`);
}
