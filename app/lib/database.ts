import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const STORAGE_DIR : string = path.join(process.cwd(), "storage");
const DB_PATH     : string = path.join(STORAGE_DIR, "database.sqlite");
const SCHEMA_PATH : string = path.join(STORAGE_DIR, "database_creation.sql");
const SEED_PATH   : string = path.join(STORAGE_DIR, "database_insert.sql");

export let db : Database.Database | null = null;

function readSqlFile(filePath: string) : string {
    if (!fs.existsSync(filePath))
        throw new Error(`SQL file not found: ${filePath}`);
    return fs.readFileSync(filePath, "utf8");
}

function initializeDatabase() : void {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
    const schemaSql : string = readSqlFile(SCHEMA_PATH);
    const seedSql   : string = readSqlFile(SEED_PATH);
    db = new Database(DB_PATH);
    db.pragma("foreign_keys = ON");
    try {
        db.exec(schemaSql);
        db.exec(seedSql);
    } catch (error) {
        if (fs.existsSync(DB_PATH))
            fs.unlinkSync(DB_PATH);
        console.error("Database initialization failed:", error);
        throw error;
    }
}

export function getDatabase() : void {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
    if (!fs.existsSync(DB_PATH))
        initializeDatabase();
    else {
        db = new Database(DB_PATH);
        db.pragma("foreign_keys = ON");
    }
}