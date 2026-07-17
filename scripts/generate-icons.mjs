import sharp from "sharp";
import { mkdirSync } from "node:fs";

mkdirSync("public/icons", { recursive: true });

const svg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#2B5049"/>
  <ellipse cx="180" cy="330" rx="52" ry="64" fill="#E4C578"/>
  <ellipse cx="256" cy="352" rx="56" ry="68" fill="#C99A3E"/>
  <ellipse cx="332" cy="330" rx="52" ry="64" fill="#E4C578"/>
  <path d="M70 400 Q256 360 442 400" stroke="#8a6a3f" stroke-width="14" fill="none" stroke-linecap="round"/>
  <path d="M90 424 Q256 388 422 424" stroke="#8a6a3f" stroke-width="14" fill="none" stroke-linecap="round"/>
</svg>`;

const sizes = [192, 512];
for (const size of sizes) {
  await sharp(Buffer.from(svg(size)))
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
}

await sharp(Buffer.from(svg(180)))
  .resize(180, 180)
  .png()
  .toFile("public/icons/apple-touch-icon.png");

console.log("Icons generated.");
