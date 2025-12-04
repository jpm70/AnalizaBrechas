// api/breaches.js (Código de Diagnóstico Final)

const XPOSED_API_URL = "https://exposedornot.com/api/v1/search";

export default async (req, res) => {
    
    // Configuración CORS
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

    const searchUrl = `${XPOSED_API_URL}/${encodeURIComponent(email)}`;

    try {
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: { 
                "Accept": "application/json",
            }
        });
        
        // 🛑 PASO 1: Capturar la respuesta como texto para diagnóstico
        const responseBody = await response.text(); 
        
        // 🛑 PASO 2: Verificar si la respuesta fue exitosa (código 200)
        if (!response.ok) {
            // Si la API externa devuelve un código de error (40x, 50x)
            console.error(`External API returned status ${response.status}: ${responseBody.substring(0, 100)}`);
            
            // Devolver un error específico para diagnóstico en el frontend
            return res.status(502).json({ 
                error: `External API returned status ${response.status}.`,
                external_message: responseBody.substring(0, 500) // Mostrar el mensaje de error que da la API externa
            });
        }
        
        // 🛑 PASO 3: Intentar parsear el JSON solo si response.ok es true
        let data;
        try {
            data = JSON.parse(responseBody);
        } catch (jsonError) {
             // Fallo en el parseo JSON, aunque la respuesta fue 200
             console.error("JSON Parsing Error:", jsonError);
             return res.status(500).json({ 
                error: "Proxy received valid status but invalid JSON response.",
                raw_response_start: responseBody.substring(0, 500)
            });
        }
        
        res.status(response.status).json(data);

    } catch (error) {
        // Fallo de red (timeout, DNS, SSL, etc.)
        console.error("Proxy Network/Execution Error:", error);
        res.status(500).json({ error: "Proxy failed to execute the request or network error occurred." });
    }
};
