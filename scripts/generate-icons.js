const { createCanvas } = require('canvas');
const fs = require('fs');

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#E63946';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size * 0.35}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CL', size / 2, size / 2);
  fs.writeFileSync(`public/icon-${size}.png`, canvas.toBuffer('image/png'));
  console.log(`Generated icon-${size}.png`);
}

generateIcon(192);
generateIcon(512);
