import express from "express";
import cors from "cors";
import sensors from "./routes/sensors";

const app = express();
// Enable CORS for all origins (allows frontend and ESP32 to connect)
app.use(cors());
// Middleware to parse incoming JSON request bodies (essential for the POST route)
app.use(express.json());

app.use("/api/sensors", sensors);

app.get("/", (req, res) => {
    res.send("NeuroSole Backend Running");
});

export default app;
