import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjM4NzUxZjU1ZGE5ZjQ3OGZiNjhkOGVjZTViM2M4ZGQwIiwiaCI6Im11cm11cjY0In0="; // pon aquí tu key de ORS
const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
const RUTAS_DIR = path.join(process.cwd(), "rutas");

// Crear carpeta si no existe
if (!fs.existsSync(RUTAS_DIR)) fs.mkdirSync(RUTAS_DIR, { recursive: true });

// Endpoint para generar una ruta desde varios puntos
app.post("/directions", async (req, res) => {
    const { nombre, puntos } = req.body;
    if (!nombre || !puntos || puntos.length < 2) {
        return res.status(400).json({ error: "Se requieren al menos 2 puntos y un nombre" });
    }

    try {
        // Llamada a ORS
        const response = await fetch(ORS_URL, {
            method: "POST",
            headers: {
                "Authorization": ORS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ coordinates: puntos })
        });

        const data = await response.json();

        // Guardar en archivo JSON en la carpeta rutas/
        const safeName = nombre.replace(/[^a-z0-9]/gi, "_");
        const filePath = path.join(RUTAS_DIR, `${safeName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error consultando ORS" });
    }
});

// Endpoint para listar rutas guardadas
app.get("/rutas", (req, res) => {
    const archivos = fs.readdirSync(RUTAS_DIR).filter(f => f.endsWith(".json"));
    const rutas = archivos.map(f => {
        const data = JSON.parse(fs.readFileSync(path.join(RUTAS_DIR, f), "utf8"));
        let puntos = [];
        if (data.features && data.features[0].geometry) {
            puntos = data.features[0].geometry.coordinates;
        }
        return { nombre: f.replace(".json", ""), puntos, color: "blue" };
    });
    res.json({ rutas });
});

app.listen(3000, () => console.log("Servidor corriendo en http://localhost:3000"));
