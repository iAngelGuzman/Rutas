import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import multer from "multer";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const SUPABASE_URL = "https://rxfqkbhymotlapterzpk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4ZnFrYmh5bW90bGFwdGVyenBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjU4MDgsImV4cCI6MjA3NDMwMTgwOH0.hymErnZfJFdGEpa9sn43Q_TOsj3rOmue6RRI6DrLv0A";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// --- NUEVO ENDPOINT PARA OBTENER LAS RUTAS ---
app.get("/api/rutas", async (req, res) => {
    try {
        // Hacemos la consulta a la tabla 'rutas'
        // .select('*') trae todas las columnas
        const { data, error } = await supabase
            .from('rutas')
            .select('*')
            .order('nombre', { ascending: true }); // Opcional: ordenar por nombre

        // Si Supabase devuelve un error, lo enviamos al cliente
        if (error) {
            console.error("Error de Supabase:", error.message);
            // Lanzamos el error para que sea capturado por el bloque catch
            throw error; 
        }

        // Si todo sale bien, enviamos los datos
        res.status(200).json(data);

    } catch (error) {
        // Manejamos cualquier error que ocurra durante el proceso
        res.status(500).json({ error: "Error al obtener las rutas desde la base de datos.", details: error.message });
    }
});

// --- ENDPOINT PARA INSERTAR UNA NUEVA RUTA ---
app.post("/api/agregar-ruta", async (req, res) => {
    try {
        // 1. Recibir los datos del cuerpo de la petición (desde el frontend)
        const datosRuta = req.body;

        // 2. Validación básica (puedes hacerla más robusta)
        if (!datosRuta.nombre || !datosRuta['ruta']) {
            return res.status(400).json({ 
                error: "Faltan datos obligatorios.",
                details: "Se requiere al menos un nombre y una ruta."
            });
        }

        // 3. Construir el objeto para la inserción.
        // Las claves deben coincidir EXACTAMENTE con las columnas de tu tabla.
        const nuevaRuta = {
            nombre: datosRuta.nombre,
            horario: datosRuta.horario, // Espera un objeto JSON
            paradas: datosRuta.paradas, // Espera un array de objetos JSON
            imagen: datosRuta.imagen,
            activo: datosRuta.activo,
            "mujer-segura": datosRuta["mujer-segura"], // Espera un booleano

            // Columnas con guiones, OBLIGATORIAMENTE entre comillas
            "ruta": datosRuta["ruta"],
            "ruta-color": datosRuta["ruta-color"],
            "ruta-puntos": datosRuta["ruta-puntos"],

            "ruta-ida": datosRuta["ruta-ida"],
            "ruta-ida-color": datosRuta["ruta-ida-color"],
            "ruta-ida-puntos": datosRuta["ruta-ida-puntos"],
            "ruta-vuelta": datosRuta["ruta-vuelta"], // Será null si no se envía
            "ruta-vuelta-color": datosRuta["ruta-vuelta-color"],
            "ruta-vuelta-puntos": datosRuta["ruta-vuelta-puntos"]
        };

        // 4. Ejecutar la inserción en Supabase
        const { data, error } = await supabase
            .from('rutas') // El nombre de tu tabla
            .insert([nuevaRuta]) // .insert() espera un array de objetos
            .select() // .select() devuelve el registro que acabas de insertar

        // 5. Manejar la respuesta de Supabase
        if (error) {
            // Si Supabase devuelve un error, lo lanzamos para que lo capture el 'catch'
            throw error;
        }

        // Si la inserción fue exitosa, enviamos una respuesta 201 (Created)
        res.status(201).json({
            message: "Ruta guardada exitosamente en la base de datos.",
            data: data // Contiene la nueva ruta insertada, incluyendo su 'id'
        });

    } catch (error) {
        // Manejo de errores generales
        console.error("Error al insertar la ruta:", error.message);
        res.status(500).json({
            error: "Ocurrió un error en el servidor al intentar guardar la ruta.",
            details: error.message
        });
    }
});

app.put("/api/actualizar-ruta/:id", async (req, res) => {
    const { id } = req.params;
    const datosActualizados = req.body;

    const { data, error } = await supabase
        .from('rutas')
        .update(datosActualizados)
        .eq('id', id)
        .select();

    if (error) {
        return res.status(500).json({ error: "Error al actualizar la ruta.", details: error.message });
    }
    res.status(200).json({ message: "Ruta actualizada.", data: data });
});

// --- ENDPOINT PARA ELIMINAR UNA RUTA POR SU ID ---
app.delete("/api/eliminar-ruta/:id", async (req, res) => {
    try {
        // 1. Obtener el ID de los parámetros de la URL
        const { id } = req.params;

        // 2. Ejecutar la eliminación en Supabase
        const { error } = await supabase
            .from('rutas')
            .delete()
            .eq('id', id); // Condición: donde el id coincida

        // 3. Manejar la respuesta de Supabase
        if (error) {
            throw error;
        }

        // Si todo sale bien, envía una respuesta de éxito
        res.status(200).json({
            message: "La ruta ha sido eliminada correctamente."
        });

    } catch (error) {
        console.error("Error al eliminar la ruta:", error.message);
        res.status(500).json({
            error: "Ocurrió un error en el servidor al intentar eliminar la ruta.",
            details: error.message
        });
    }
});

app.listen(3000, () => console.log("Servidor corriendo en http://localhost:3000"));
