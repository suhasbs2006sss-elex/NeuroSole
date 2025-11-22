import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

const adapter = new JSONFile("db.json");
const db = new Low(adapter, { sensors: [] });

export async function initDB() {
    await db.read();
    if (!db.data) db.data = { sensors: [] };
}

export async function addSensorReading(reading) {
    db.data.sensors.push(reading);
    await db.write();
}

export async function getLatestReading() {
    await db.read();
    return db.data.sensors[db.data.sensors.length - 1];
}
