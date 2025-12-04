// api/safebrowsing.js
// Proxy para la API de Navegación Segura de Google (Safe Browsing API)
// Usa la variable de entorno GOOGLE_SAFEBROWSING_API_KEY configurada en Vercel.

// 🛑 CLAVE NECESARIA: La clave se inyecta automáticamente desde las variables de entorno de Vercel.
const API_KEY = process.env.GOOGLE_SAFEBROWSING_API_KEY;
const SAFE_BROWSING_API_URL = "https://safebrowsing.googleapis.com/v4/threatMatches:find?key=" + API_KEY;

// ℹ️ Info del cliente (necesario para la API de Google)
const CLIENT_ID = "trust-watch-app";
const CLIENT_VERSION = "1.0.0";

export default async (req, res) => {
    
    // --- Configuración CORS ---
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    // Permitimos POST para enviar la URL en el cuerpo y OPTIONS para pre-flight check
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Validar si la clave de API está ausente (error de configuración en Vercel)
    if (!API_KEY) {
        console.error("GOOGLE_SAFEBROWSING_API_KEY no está configurada en Vercel.");
        return res.status(500).json({ error: "Configuration Error: Safe Browsing API Key is missing on Vercel." });
    }

    // El frontend enviará la URL por el cuerpo (Body) de la petición POST
    // Vercel parsea automáticamente el body para peticiones POST con Content-Type: application/json
    const { url } = req.body; 

    if (!url) {
        return res.status(400).json({ error: "Missing url parameter in request body." });
    }

    // 1. Construir el cuerpo de la petición POST para Google Safe Browsing
    const requestBody = {
        client: {
            clientId: CLIENT_ID,
            clientVersion: CLIENT_VERSION,
        },
        threatInfo: {
            // Tipos de amenazas a buscar
            threatTypes: [
                "MALWARE", // Software malicioso
                "SOCIAL_ENGINEERING", // Phishing, engaño
                "UNWANTED_SOFTWARE" // Software no deseado
            ],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            // Formato de URL exigido por la API
            threatEntries: [{ url: url }] 
        }
    };

    try {
        const response = await fetch(SAFE_BROWSING_API_URL, {
            method: 'POST',
            headers: { 
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json(); 
        
        if (response.status === 200) {
            // Si la respuesta es 200 y contiene 'matches', significa que la URL es peligrosa
            if (data.matches) {
                // Devolver los detalles de las amenazas para que el frontend los muestre
                res.status(200).json({ status: "DANGEROUS", matches: data.matches });
            } else {
                // Si no hay matches, la URL es segura (Según Google)
                res.status(200).json({ status: "SAFE" });
            }
        } else {
            // Error en la API de Google (ej. clave inválida, límite excedido, etc.)
            console.error(`Google API returned status ${response.status}. Details: ${JSON.stringify(data)}`);
            res.status(502).json({ 
                error: `External API returned status ${response.status}.`, 
                details: data 
            });
        }

    } catch (error) {
        // Error de red/conexión.
        console.error("Proxy Network/Execution Error:", error);
        res.status(500).json({ error: "Proxy failed to execute the request or network error occurred." });
    }
};