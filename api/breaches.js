// api/breaches.js (Versión Final Corregida para API Pública y Simple de XposedOrNot)

// ✅ CORRECCIÓN CLAVE: Usamos el endpoint público y simple:
// El API simple devuelve {"breaches": [...]} si encuentra, o {"Error":"No se ha encontrado"} si no.
const XPOSED_API_URL = "https://api.xposedornot.com/v1/check-email/";

export default async (req, res) => {
    
    // --- Configuración CORS ---
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { email } = req.query; 

    if (!email) {
        return res.status(400).json({ error: "Missing email parameter" });
    }

    // ✅ Construcción de la URL: El email se añade al final de la URL base
    const searchUrl = `${XPOSED_API_URL}${encodeURIComponent(email)}`; 

    try {
        // Petición al API externo (desde Vercel)
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: { 
                "Accept": "application/json",
            }
        });
        
        // Leer el cuerpo de la respuesta.
        const data = await response.json(); 
        
        // ❌ Eliminamos el manejo de 404 personalizado. 
        // La API pública devuelve 200 OK con el cuerpo {"Error":"No se ha encontrado"} 
        // si el email no está en brechas.

        if (response.status !== 200) {
            // Si devuelve cualquier otro código (ej. 403, 500, etc.), es un error real de la API externa.
            console.error(`External API returned status ${response.status}`);
            return res.status(502).json({ 
                error: `External API returned status ${response.status}.`,
                external_message: JSON.stringify(data).substring(0, 500)
            });
        }
        
        // ✅ Devolver la respuesta del API tal cual (contendrá {"breaches":...} o {"Error":...})
        // La lógica de tu index.html ya corregida sabrá cómo interpretar esto.
        res.status(200).json(data);

    } catch (error) {
        // Error de red/conexión.
        console.error("Proxy Network/Execution Error:", error);
        res.status(500).json({ error: "Proxy failed to execute the request or network error occurred." });
    }
};
