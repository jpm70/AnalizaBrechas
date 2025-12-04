// api/breaches.js (Función Serverless para Vercel/Netlify)

import fetch from 'node-fetch'; 

// La API real de brechas. Esta URL solo se usa en el backend, no en el navegador.
const XPOSED_API_URL = "https://exposedornot.com/api/v1/search";

export default async (req, res) => {
    // 1. Obtener el email del parámetro de la URL
    const { email } = req.query; 

    // =======================================================
    // 🛑 AÑADIDO CLAVE: Encabezados CORS y manejo de OPTIONS
    // =======================================================
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permite que cualquier dominio acceda (incluyendo GitHub Pages)
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        // Responder a la petición "preflight" del navegador
        return res.status(200).end();
    }
    // =======================================================

    if (!email) {
        // Devolver un error si falta el email
        return res.status(400).json({ error: "Missing email parameter" });
    }

    // ... (el resto del código se mantiene igual)

    const searchUrl = `${XPOSED_API_URL}/${encodeURIComponent(email)}`;

    try {
        // 2. Hacer la petición a la API de Brechas desde el servidor (Proxy)
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: { 
                "Accept": "application/json",
                // Si la API requiriera una API KEY de servidor, iría aquí
            }
        });
        
        // 3. Devolver el JSON (o el error) al cliente
        const data = await response.json();
        res.status(response.status).json(data);

    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(500).json({ error: "Internal Proxy Error while fetching data" });
    }
};
