// api/breaches.js (Versión para HackCheck)

// La URL de la API de HackCheck (endpoint anónimo)
const HACKCHECK_API_URL = "https://haveibeenhacked.com/api/v1/search";

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

    // 🛑 Construcción de la URL de HackCheck: utiliza el email como parámetro de consulta
    const searchUrl = `${HACKCHECK_API_URL}?q=${encodeURIComponent(email)}`; 

    try {
        // Petición al API de HackCheck (desde Vercel)
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: { 
                "Accept": "application/json",
            }
        });
        
        const responseBody = await response.text(); 
        
        // La API de HackCheck devuelve 200 si tiene datos o 404 si no encuentra nada.

        if (response.status === 404) {
             // 404 en esta API es un éxito, significa que no se encontraron brechas.
             return res.status(200).json({ status: 404, message: "Email not found in breaches." });
        }
        
        if (response.status !== 200) {
            // Si devuelve cualquier otro código (ej. 403, 500, etc.), es un error real.
            console.error(`HackCheck API returned status ${response.status}`);
            return res.status(502).json({ 
                error: `HackCheck API returned status ${response.status}.`,
                external_message: responseBody.substring(0, 500)
            });
        }
        
        // Intentar parsear el JSON (solo si el status es 200)
        let data = JSON.parse(responseBody);
        
        // Devolver la respuesta exitosa al frontend
        res.status(200).json(data);

    } catch (error) {
        console.error("Proxy Network/Execution Error:", error);
        res.status(500).json({ error: "Proxy failed to execute the request or network error occurred." });
    }
};
