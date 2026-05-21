import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const books = [
  { id: "the-time-machine", title: "The Time Machine", url: "https://www.gutenberg.org/cache/epub/35/pg35.txt" },
  { id: "treasure-island", title: "Treasure Island", url: "https://www.gutenberg.org/cache/epub/120/pg120.txt" },
  { id: "wizard-of-oz", title: "The Wonderful Wizard of Oz", url: "https://www.gutenberg.org/cache/epub/55/pg55.txt" }
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchTextWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "LexiBook educational public-domain book fetcher" }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await wait(1200 * attempt);
      }
    }
  }
  throw lastError;
}

function trimGutenberg(text) {
  let body = text.replace(/\r\n/g, "\n");
  const startMatch = body.match(/\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  if (startMatch?.index !== undefined) {
    body = body.slice(startMatch.index + startMatch[0].length);
  }
  const endMatch = body.match(/\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  if (endMatch?.index !== undefined) {
    body = body.slice(0, endMatch.index);
  }
  return body.replace(/\n{3,}/g, "\n\n").trim();
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(scriptDir, "..", "content", "books");
await mkdir(outputDir, { recursive: true });

for (const book of books) {
  const text = await fetchTextWithRetry(book.url);
  const markdown = [
    `# ${book.title}`,
    "",
    `> Public-domain source: Project Gutenberg. Fetched from ${book.url}`,
    "",
    trimGutenberg(text),
    ""
  ].join("\n");

  await writeFile(path.join(outputDir, `${book.id}.md`), markdown, "utf8");
  console.log(`Fetched ${book.title}`);
  await wait(800);
}
