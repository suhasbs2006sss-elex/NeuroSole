import app from "./app";
import { initDB } from "./db";

const PORT = 4000;

async function start() {
    await initDB();
    app.listen(PORT, () => console.log("Backend running on port", PORT));
}

start();
