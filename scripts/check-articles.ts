import Database from "better-sqlite3";
import path from "path";
const db = new Database(path.resolve(process.cwd(), "prisma/dev.db"));
const a35 = db.prepare("SELECT content FROM articles WHERE id = 35").get() as any;
// Show first list item
const p1idx = a35.content.indexOf("<p>1.");
console.log("Article 35 first item:\n", a35.content.slice(p1idx, p1idx + 300));
db.close();
