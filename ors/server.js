import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import multer from "multer";

const app = express();
app.use(cors());
app.use(express.json());

const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjdkMjQ1MDA3MTk2YTRjM2RhMDYxMTdkZGIzMDljYzU5IiwiaCI6Im11cm11cjY0In0="; // pon aquí tu key de ORS
const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
const RUTAS_DIR = path.join(process.cwd(), "..", "rutas");
const RUTAS_FILE = path.join(process.cwd(), "..", "rutasGenerar.json");

// Crear carpeta si no existe
if (!fs.existsSync(RUTAS_DIR)) fs.mkdirSync(RUTAS_DIR, { recursive: true });

// Carpeta base
const RUTAS_BASE = path.join(process.cwd(), "..", "rutasCreadas");
const RUTAS_JSON = path.join(process.cwd(), "..", "rutasCreadas.json");

// Crear carpeta principal si no existe
if (!fs.existsSync(RUTAS_BASE)) {
    fs.mkdirSync(RUTAS_BASE, { recursive: true });
}

// Crear archivo JSON si no existe
if (!fs.existsSync(RUTAS_JSON)) {
    fs.writeFileSync(RUTAS_JSON, JSON.stringify({ rutas: [] }, null, 2));
}

// Configurar multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const safeName = req.body.nombre.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const uploadPath = path.join(RUTAS_BASE, safeName, "imagen");
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, "segura.jpeg"); // nombre fijo (puedes hacerlo dinámico)
    }
});

const upload = multer({ storage });

// Endpoint para subir imagen
app.post("/subir-imagen", upload.single("imagen"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No se subió ninguna imagen" });

    const filePath = `/rutasCreadas/${req.body.nombre.replace(/[^a-z0-9]/gi, "_").toLowerCase()}/imagen/${req.file.filename}`;
    res.json({ message: "Imagen subida correctamente", path: filePath });
});

// NUEVO ENDPOINT PARA LA PREVISUALIZACIÓN DE LA RUTA
app.post("/preview-route", async (req, res) => {
    // Obtenemos solo las coordenadas del cuerpo de la solicitud
    const { coordinates } = req.body;

    // Validación básica
    if (!coordinates || coordinates.length < 2) {
        return res.status(400).json({ error: "Se requieren al menos 2 puntos para la previsualización." });
    }

    try {
        // Hacemos la llamada a la API de OpenRouteService
        const orsResponse = await fetch(ORS_URL, {
            method: "POST",
            headers: {
                "Authorization": ORS_API_KEY,
                "Content-Type": "application/json; charset=utf-8",
                "Accept": "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
            },
            body: JSON.stringify({ coordinates: coordinates })
        });

        if (!orsResponse.ok) {
            // Si ORS da un error, lo pasamos al cliente
            const errorData = await orsResponse.json();
            console.error("Error de OpenRouteService:", errorData);
            return res.status(orsResponse.status).json({ error: "Error al calcular la ruta con OpenRouteService." });
        }

        const routeData = await orsResponse.json();

        // Extraemos la geometría de la primera ruta encontrada
        const geometry = routeData.features[0].geometry.coordinates;

        // Enviamos solo la geometría de vuelta al frontend
        res.json({ geometry: geometry });

    } catch (error) {
        console.error("Error en el servidor al previsualizar la ruta:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

app.post("/directions", async (req, res) => {
    const { nombre, color, mujerSegura, horario, puntos } = req.body;

    if (!nombre || !puntos || puntos.length < 2) {
        return res.status(400).json({ error: "Se requieren al menos 2 puntos y un nombre" });
    }

    try {
        // Llamada a OpenRouteService
        const response = await fetch(ORS_URL, {
            method: "POST",
            headers: {
                "Authorization": ORS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ coordinates: puntos })
        });

        const data = await response.json();

        // Crear nombre seguro de carpeta
        const safeName = nombre.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const rutaDir = path.join(RUTAS_BASE, safeName);

        // Crear subcarpetas
        const imagenDir = path.join(rutaDir, "imagen");
        const routeDir = path.join(rutaDir, "route");
        const stopsDir = path.join(rutaDir, "stops");

        [rutaDir, imagenDir, routeDir, stopsDir].forEach(dir => {
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });

        // Guardar archivo GeoJSON
        const routeFile = path.join(routeDir, "route.geojson");
        fs.writeFileSync(routeFile, JSON.stringify(data, null, 2));

        // Crear la entrada de la ruta
        const nuevaRuta = {
            nombre,
            color,
            "mujer segura": mujerSegura ? "true" : "false",
            horario: horario || {},
            archivos: {
                imagen: `/rutasCreadas/${safeName}/imagen/segura.jpeg`,
                ruta: `/rutasCreadas/${safeName}/route/route.geojson`,
                paradas: `/rutasCreadas/${safeName}/stops/stops.geojson`
            }
        };

        // Leer rutas existentes
        const jsonData = JSON.parse(fs.readFileSync(RUTAS_JSON, "utf8"));

        // Evitar duplicados
        const yaExiste = jsonData.rutas.some(r => r.nombre === nombre);
        if (!yaExiste) {
            jsonData.rutas.push(nuevaRuta);
            fs.writeFileSync(RUTAS_JSON, JSON.stringify(jsonData, null, 2));
        }

        res.json({
            message: "Ruta creada y registrada correctamente",
            ruta: nuevaRuta
        });

    } catch (err) {
        console.error("Error al generar la ruta:", err);
        res.status(500).json({ error: "Error consultando ORS o guardando archivos" });
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

app.post("/guardar-ruta", (req, res) => {
    const { nombre, color, mujerSegura, horario, archivos } = req.body;

    if (!nombre || !color || !archivos) {
        return res.status(400).json({ error: "Faltan datos obligatorios de la ruta" });
    }

    // Crear carpeta de la ruta si no existe
    const safeName = nombre.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const rutaDir = path.join(RUTAS_BASE, safeName);
    if (!fs.existsSync(rutaDir)) fs.mkdirSync(rutaDir, { recursive: true });

    // Leer JSON existente
    let rutasJson = { rutas: [] };
    if (fs.existsSync(RUTAS_JSON)) {
        rutasJson = JSON.parse(fs.readFileSync(RUTAS_JSON, "utf-8"));
    }

    // Construir objeto de la nueva ruta
    const nuevaRuta = {
        nombre,
        color,
        "mujer segura": mujerSegura ? "true" : "false",
        horario: horario || { lunes: "6:00am - 10:00pm", domingo: "8:00am - 8:00pm" },
        archivos: {
            imagen: archivos.imagen || null,
            ruta: archivos.ruta || null,
            paradas: archivos.paradas || null
        }
    };

    // Agregar al array
    rutasJson.rutas.push(nuevaRuta);

    // Guardar JSON actualizado
    fs.writeFileSync(RUTAS_JSON, JSON.stringify(rutasJson, null, 2), "utf-8");

    res.json({ message: "Ruta guardada correctamente", ruta: nuevaRuta });
});

app.listen(3000, () => console.log("Servidor corriendo en http://localhost:3000"));
