// api/breaches.js (Versión Final Corregida y Robustecida)

// La URL base de la API externa.
const XPOSED_API_URL = "https://exposedornot.com/api/v1/search";

export default async (req, res) => {
    
    // =======================================================
    // 1. Configuración CORS y manejo de peticiones OPTIONS
    // =======================================================
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // 2. Obtener el email del parámetro de consulta
    const { email } = req.query; 

    if (!email) {
        return res.status(400).json({ error: "Missing email parameter" });
    }

    // 🛑 CORRECCIÓN CLAVE: Usamos el parámetro de consulta '?email='
    // para resolver el error 404.
    const searchUrl = `${XPOSED_API_URL}?email=${encodeURIComponent(email)}`; 

    try {
        // 3. Petición al API externo (desde Vercel)
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: { 
                "Accept": "application/json",
            }
        });
        
        const responseBody = await response.text(); 
        
        // 4. Verificación de respuesta exitosa (response.ok = código 200-299)
        if (!response.ok) {
            // Si la API externa devuelve un error HTTP (4xx, 5xx),
            // lo devolvemos al frontend con un código 502 (Bad Gateway)
            console.error(`External API returned status ${response.status}: ${responseBody.substring(0, 100)}`);
            
            return res.status(502).json({ 
                error: `External API returned status ${response.status}.`,
                external_message: responseBody.substring(0, 500)
            });
        }
        
        // 5. Intentar parsear el JSON
        let data;
        try {
            data = JSON.parse(responseBody);
        } catch (jsonError) {
             // Fallo en el parseo JSON
             console.error("JSON Parsing Error:", jsonError);
             return res.status(500).json({ 
                error: "Proxy received valid status but invalid JSON response.",
                raw_response_start: responseBody.substring(0, 500)
            });
        }
        
        // 6. Devolver la respuesta exitosa al frontend
        res.status(response.status).json(data);

    } catch (error) {
        // Fallo de red (timeout, DNS, SSL)
        console.error("Proxy Network/Execution Error:", error);
        res.status(500).json({ error: "Proxy failed to execute the request or network error occurred." });
    }
};
