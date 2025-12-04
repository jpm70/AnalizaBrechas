// --- CONSTANTES GLOBALES ---
        
// ¡CAMBIO CLAVE! URL del proxy serverless para evitar el error CORS.
const PROXY_BREACHES_URL = "https://trust-watch.vercel.app/api/breaches?email=";
// ✅ NUEVO: URL del proxy para la comprobación de Navegación Segura
const PROXY_SAFE_URL = "https://trust-watch.vercel.app/api/safebrowsing"; 

const IP_API_URL = "https://ipapi.co/"; 
const GOOGLE_DNS_API_URL = "https://dns.google/resolve";
// --- ESTADO DE LA APLICACIÓN ---
let currentTab = 'email';

// --- FUNCIONES DE UTILIDAD GENERAL ---
/**
 * Función auxiliar para capitalizar la primera letra de una cadena, manejando acrónimos.
 */
function capitalize(s) {
    if (s.toLowerCase() === 'ip') return 'IP';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Cambia la pestaña visible y actualiza el estado de la aplicación.
 * @param {string} tabName - 'email', 'phone', 'domain', 'ip', 'dns', 'password' o 'safe'.
 */
function changeTab(tabName) {
    console.log(`[DEBUG] Intentando cambiar a la pestaña: ${tabName}`);
    currentTab = tabName;
                
    // 1. Ocultar todos los contenidos y desactivar botones
    document.querySelectorAll('[data-tab-content]').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-button').forEach(el => el.classList.remove('active'));
                
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = ''; // Limpiar resultados
    }

    // 2. Mostrar contenido y activar el botón correcto
    // Se debe manejar 'Safe' y 'safe'
    const capitalizedName = (tabName === 'safe') ? 'Safe' : capitalize(tabName); 
    const contentDiv = document.getElementById(`tabContent${capitalizedName}`);
    const buttonEl = document.getElementById(`tab${capitalizedName}`);
    if (contentDiv) {
        contentDiv.classList.remove('hidden');
        console.log(`[DEBUG] Pestaña ${tabName} mostrada. ID del contenido: tabContent${capitalizedName}`);
    } else {
        console.warn(`[DOM Warning] No se encontró el contenido para la pestaña: tabContent${capitalizedName}`);
    }
                
    if (buttonEl) {
        buttonEl.classList.add('active');
    } else {
        console.warn(`[DOM Warning] No se encontró el botón para la pestaña: tab${capitalizedName}`);
    }
}

/**
 * Muestra un mensaje en el área de resultados.
 * @param {string} message - El HTML del mensaje.
 * @param {string} classes - Clases de Tailwind para el estilo del contenedor.
 */
function displayMessage(message, classes) {
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) { // Verificación de nulidad para mayor seguridad
        resultsDiv.innerHTML = `
            <div class="${classes} p-4 rounded-lg border-l-4 shadow-sm" role="alert">
                <p class="font-medium">${message}</p>
            </div>
        `;
    }
}

/**
 * Copia el contenido de un elemento al portapapeles.
 */
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
                
    // Crea un input temporal para la selección
    const tempInput = document.createElement('textarea');
    tempInput.value = element.value || element.textContent; // Puede ser un input o un texto div
    document.body.appendChild(tempInput);
    tempInput.select();
                
    try {
        // Utiliza document.execCommand('copy') como fallback para entornos iFrame
        document.execCommand('copy');
        displayMessage('✅ ¡Copiado al portapapeles!', 'bg-blue-100 border-blue-400 text-blue-700');
    } catch (err) {
        console.error('Error al copiar:', err);
        displayMessage('❌ Error al copiar al portapapeles.', 'bg-red-100 border-red-400 text-red-700');
    }
    document.body.removeChild(tempInput);
}

// ----------------------------------------------------------------------
// --- FUNCIONES DE EMAIL (BRECHAS) ---
// ----------------------------------------------------------------------
        
function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

async function checkBreaches() {
    const emailInput = document.getElementById('emailInput');
    const email = emailInput ? emailInput.value.trim() : '';
    const searchButton = document.getElementById('searchButtonEmail');
    const buttonText = document.getElementById('buttonTextEmail');
    const loader = document.getElementById('loaderEmail');
    document.getElementById('results').innerHTML = '';

    if (!isValidEmail(email)) {
        displayMessage("⚠️ Por favor, introduce una dirección de correo electrónico válida.", 'bg-yellow-100 border-yellow-400 text-yellow-700');
        return;
    }
                
    if (searchButton) searchButton.disabled = true;
    if (buttonText) buttonText.textContent = 'Buscando...';
    if (loader) loader.classList.remove('hidden');

    // APUNTA AL PROXY SERVERLESS PARA EVITAR CORS
    const searchUrl = `${PROXY_BREACHES_URL}${encodeURIComponent(email)}`;
    
    try {
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: { "Accept": "application/json" }
        });
        const data = await response.json();

        if (response.status === 200) {
            // Caso 1: Brechas ENCONTRADAS (El proxy debe devolver el formato {"breaches": ["Sitio1", "Sitio2"]})
            if (data.breaches && Array.isArray(data.breaches) && data.breaches.length > 0) {
                displayBreaches(email, data.breaches);
            } 
            // Caso 2: Brechas NO ENCONTRADAS (El proxy debe devolver el formato {"Error":"No se ha encontrado"})
            else if (data.Error === "No se ha encontrado") { 
                displayMessage(`🎉 ¡Buenas noticias! El correo electrónico <span class="font-bold">${email}</span> NO ha sido encontrado en ninguna brecha conocida por XposedOrNot.`, 'bg-green-100 border-green-400 text-green-700');
            }
            // Caso 3: Fallback (El proxy devuelve algo inesperado o un array vacío sin el campo "Error")
            else {
                displayMessage(`🎉 ¡Buenas noticias! El correo electrónico <span class="font-bold">${email}</span> NO ha sido encontrado en ninguna brecha conocida por XposedOrNot.`, 'bg-green-100 border-green-400 text-green-700');
            }
        } else {
            // Si el proxy falla o devuelve otro error (400, 500, etc.)
            const message = data.error || data.message || `Error ${response.status}: Ha ocurrido un error al consultar el proxy de la API.`;
            displayMessage(`❌ Error: ${message}`, 'bg-red-100 border-red-400 text-red-700');
        }
    } catch (error) {
        console.error("Error en la solicitud Fetch (Email/Proxy):", error);
        // Mensaje de error más descriptivo sobre el fallo del proxy
        displayMessage(`❌ Error de Conexión. Fallo al contactar el servicio Proxy. Verifica la URL de PROXY_BREACHES_URL o el despliegue del proxy.`, 'bg-red-100 border-red-400 text-red-700');
    } finally {
        if (searchButton) searchButton.disabled = false;
        if (buttonText) buttonText.textContent = 'Comprobar Brechas';
        if (loader) loader.classList.add('hidden');
    }
}

function displayBreaches(email, breaches) {
    const resultsDiv = document.getElementById('results');
    let html = `
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md mb-6" role="alert">
            <p class="font-bold text-lg">🚨 ¡ATENCIÓN! El correo <span class="font-extrabold">${email}</span> fue encontrado en ${breaches.length} brecha(s).</p>
            <p class="text-sm">Se recomienda encarecidamente cambiar la contraseña de inmediato y revisar si el mismo par de correo/contraseña ha sido utilizado en otros servicios.</p>
        </div>
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Brechas Encontradas (Nombres de Sitios):</h2>
        <div class="bg-white p-4 rounded-xl shadow border border-gray-200">
            <ul class="list-disc list-inside space-y-1 text-gray-800">
                ${breaches.map(name => `<li class="font-medium text-red-700">${name}</li>`).join('')}
            </ul>
        </div>
        <p class="text-sm text-gray-500 mt-4">
            **Nota:** Esta API pública solo devuelve los nombres de los sitios violados, no los detalles (fecha, tipos de datos expuestos).
            Para los detalles completos, se requiere el endpoint de 'breach-analytics', que probablemente necesita una API Key.
        </p>
    `;
    if (resultsDiv) resultsDiv.innerHTML = html;
}

// ----------------------------------------------------------------------
// --- FUNCIONES DE TELÉFONO (VALIDACIÓN Y SPAM CHECK) ---
// ----------------------------------------------------------------------
/**
 * Valida y analiza un número de teléfono usando libphonenumber-js, y añade un enlace a un verificador de spam.
 */
function checkPhone() {
    const phoneInput = document.getElementById('phoneInput');
    const number = phoneInput ? phoneInput.value.trim() : '';
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) resultsDiv.innerHTML = '';
    
    if (number === '') {
        displayMessage("⚠️ Por favor, introduce un número de teléfono.", 'bg-yellow-100 border-yellow-400 text-yellow-700');
        return;
    }

    try {
        // Intenta analizar el número. No se proporciona un país por defecto para forzar el formato E.164 (+CC)
        const phoneNumber = libphonenumber.parsePhoneNumberFromString(number);

        if (phoneNumber && phoneNumber.isValid()) {
            // Usamos el formato E.164 para el enlace de búsqueda (+521234567890), quitando el '+'
            const searchNumber = phoneNumber.format('E.164').replace('+', ''); 
            
            // Enlace a un servicio público (ej. Tellows para reputación de spam)
            const spamCheckUrl = `https://www.tellows.es/num/${searchNumber}`; 

            let html = `
                <div class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-md mb-6" role="alert">
                    <p class="font-bold text-lg">✅ ¡Validación Exitosa!</p>
                    <p class="text-sm">El número de teléfono parece ser estructuralmente válido.</p>
                </div>
                <h2 class="text-xl font-semibold text-gray-700 mb-4">Detalles del Número:</h2>
                <div class="bg-white p-4 rounded-xl shadow border border-gray-200 space-y-2">
                    <p><strong>Formato E.164:</strong> <span class="font-mono text-gray-800">${phoneNumber.format('E.164') || 'N/A'}</span></p>
                    <p><strong>Código de País:</strong> ${phoneNumber.countryCallingCode} (<span class="font-medium">${phoneNumber.country}</span>)</p>
                    <p><strong>Tipo de Número:</strong> <span class="font-medium">${phoneNumber.getType() ? capitalize(phoneNumber.getType()) : 'Desconocido'}</span></p>
                    <p><strong>Formato Nacional:</strong> ${phoneNumber.formatNational() || 'N/A'}</p>
                </div>
                
                <div class="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg shadow-md">
                    <p class="font-bold">🚨 Verificación de Reputación (Spam/Riesgo):</p>
                    <p class="text-sm mt-1">
                        No se puede consultar una API de spam directamente. Haz clic en el siguiente enlace para verificar su reputación en un servicio externo:
                    </p>
                    <a href="${spamCheckUrl}" target="_blank" class="inline-flex items-center mt-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 py-2 px-4 rounded-lg transition duration-300">
                        🔗 Consultar Reputación de Spam (${phoneNumber.format('E.164')})
                    </a>
                </div>
                
                <p class="text-xs text-gray-400 mt-4 italic">Nota: Esta es una validación de formato (sintáctica y geográfica), no comprueba si el número está activo.</p>
            `;
            if (resultsDiv) resultsDiv.innerHTML = html;
        } else {
            displayMessage(`❌ El número <span class="font-bold">${number}</span> no es un número de teléfono válido o no se pudo determinar su país. Asegúrate de incluir el código de país (ej. +34).`, 'bg-red-100 border-red-400 text-red-700');
        }
    } catch (e) {
        console.error("Error al procesar el número:", e);
        displayMessage(`❌ Error al procesar el número. Asegúrate de incluir el código de país (ej. +34).`, 'bg-red-100 border-red-400 text-red-700');
    }
}
// ----------------------------------------------------------------------
// --- FUNCIONES DE DOMINIO (INFORMACIÓN) ---
// ----------------------------------------------------------------------
function isValidDomain(domain) {
    // Regex simple para dominios: no permite protocolos, paths, ni @
    const re = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?$/;
    return re.test(String(domain).toLowerCase());
}

/**
 * Verifica solo la validez del formato del dominio, ya que la disponibilidad
 * en tiempo real falla por CORS/API Key.
 */
function checkDomainInfo() {
    const domainInput = document.getElementById('domainInput');
    const domain = domainInput ? domainInput.value.trim() : '';
    // Desactivar el botón y el loader no son necesarios ya que no hay fetch
    // pero lo dejamos por consistencia si se cambiara a un fetch en el futuro.
    const searchButton = document.getElementById('searchButtonDomain');
    if (searchButton) searchButton.disabled = true;
    document.getElementById('results').innerHTML = '';

    if (!isValidDomain(domain)) {
        displayMessage("⚠️ Por favor, introduce un dominio válido (ej: google.com). No incluyas `http://` ni `www`.", 'bg-yellow-100 border-yellow-400 text-yellow-700');
        if (searchButton) searchButton.disabled = false;
        return;
    }
                
    // Simulación de resultado de validación de formato (Client-side)
    const statusText = 'FORMATO VÁLIDO (Client-Side)';
    const statusClass = 'bg-blue-100 border-blue-500 text-blue-700';
    let html = `
        <div class="${statusClass} border-l-4 p-4 rounded-lg shadow-md mb-6" role="alert">
            <p class="font-bold text-lg">🌐 Dominio: <span class="font-extrabold">${domain}</span></p>
            <p class="text-sm">Estado: <span class="font-bold">${statusText}</span></p>
        </div>
        <p class="p-4 bg-gray-50 text-gray-600 rounded-xl shadow-inner">
            ✅ El formato del dominio es estructuralmente correcto.
        </p>
        <div class="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-lg">
            <p class="font-semibold">⚠️ Nota Importante sobre Disponibilidad:</p>
            <p class="text-sm">La comprobación de disponibilidad o WHOIS de dominios en tiempo real fue desactivada debido a que fallaba constantemente por las restricciones de CORS/API Key de los servicios externos.</p>
            <p class="text-sm mt-1">Esta herramienta solo confirma que el *formato* del dominio es correcto. Para disponibilidad real, utiliza un registrador de dominios.</p>
        </div>
    `;
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) resultsDiv.innerHTML = html;
    if (searchButton) searchButton.disabled = false;
}

// ----------------------------------------------------------------------
// --- FUNCIONES DE IP (GEOLOCALIZACIÓN) ---
// ----------------------------------------------------------------------
function isValidIP(ip) {
    // Regex simple para IPv4 y la mayoría de IPv6
    const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6 = /^([0-9a-fA-F]{1,4}:){7}([0-9a-fA-F]{1,4}|:)$/;
    return ip === '' || ipv4.test(ip) || ipv6.test(ip); // Permitir cadena vacía para la propia IP del usuario
}

async function checkIPGeoloc() {
    const ipInput = document.getElementById('ipInput');
    const ip = ipInput ? ipInput.value.trim() : '';
    const searchButton = document.getElementById('searchButtonIP');
    const buttonText = document.getElementById('buttonTextIP');
    const loader = document.getElementById('loaderIP');
    document.getElementById('results').innerHTML = '';
    
    if (!isValidIP(ip)) {
        displayMessage("⚠️ Por favor, introduce una dirección IP válida (ej: 8.8.8.8).", 'bg-yellow-100 border-yellow-400 text-yellow-700');
        return;
    }

    if (searchButton) searchButton.disabled = true;
    if (buttonText) buttonText.textContent = 'Buscando...';
    if (loader) loader.classList.remove('hidden');

    // API: ipapi.co. Si se proporciona una IP, se añade a la URL/json. Si no, usa /json.
    const searchUrl = ip ? `${IP_API_URL}${encodeURIComponent(ip)}/json/` : `${IP_API_URL}json/`; 
     
    try {
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: { "Accept": "application/json" }
        });
        const data = await response.json();

        if (response.ok && data.ip) { // Verifica si la respuesta es exitosa y tiene datos de IP
            displayIPInfo(data);
        } else if (data.error) {
            displayMessage(`❌ Error de API: ${data.reason || 'No se pudo obtener la geolocalización de la IP.'}`, 'bg-red-100 border-red-400 text-red-700');
        } else {
            displayMessage(`❌ Error ${response.status}: No se pudo obtener la geolocalización de la IP.`, 'bg-red-100 border-red-400 text-red-700');
        }
    } catch (error) {
        console.error("Error en la solicitud Fetch (IP):", error);
        displayMessage(`❌ Error de Conexión: Ha ocurrido un problema al conectar con el servicio de geolocalización.`, 'bg-red-100 border-red-400 text-red-700');
    } finally {
        if (searchButton) searchButton.disabled = false;
        if (buttonText) buttonText.textContent = 'Geolocalizar IP';
        if (loader) loader.classList.add('hidden');
    }
}

/**
 * Muestra los resultados de la geolocalización de la IP.
 * @param {object} data - Objeto de datos de respuesta de ipapi.co.
 */
function displayIPInfo(data) {
    const resultsDiv = document.getElementById('results');
    let html = `
        <div class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-lg shadow-md mb-6" role="alert">
            <p class="font-bold text-lg">📍 Información de Geolocalización (API: ipapi.co)</p>
            <p class="text-sm">IP Verificada: <span class="font-extrabold">${data.ip}</span></p>
        </div>
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Detalles Geográficos y de Red:</h2>
        <div class="bg-white p-4 rounded-xl shadow border border-gray-200 space-y-2">
            <p><strong>País:</strong> ${data.country_name || 'N/A'} (${data.country_code || 'N/A'})</p>
            <p><strong>Ciudad:</strong> ${data.city || 'N/A'}, ${data.region || 'N/A'}</p>
            <p><strong>Lat/Lon:</strong> ${data.latitude || 'N/A'} / ${data.longitude || 'N/A'}</p>
            <p><strong>Zona Horaria:</strong> ${data.timezone || 'N/A'}</p>
            <p><strong>Organización (ISP):</strong> ${data.org || 'N/A'}</p>
            <p><strong>ASN:</strong> ${data.asn || 'N/A'}</p>
            <p><strong>Moneda:</strong> ${data.currency || 'N/A'}</p>
        </div>
        <p class="text-xs text-gray-400 mt-4 italic">
            Para la IP del usuario, el resultado es la IP pública con la que navegas. 
            Si es un VPN/Proxy, mostrará la ubicación de ese servicio.
        </p>
    `;
    if (resultsDiv) resultsDiv.innerHTML = html;
}

// ----------------------------------------------------------------------
// --- FUNCIONES DE DNS LOOKUP ---
// ----------------------------------------------------------------------

async function checkDnsRecords() {
    const dnsInput = document.getElementById('dnsInput');
    const dnsTypeSelect = document.getElementById('dnsTypeSelect');
    const domain = dnsInput ? dnsInput.value.trim() : '';
    const recordType = dnsTypeSelect ? dnsTypeSelect.value : 'A';
    
    const searchButton = document.getElementById('searchButtonDns');
    const buttonText = document.getElementById('buttonTextDns');
    const loader = document.getElementById('loaderDns');
    
    document.getElementById('results').innerHTML = '';

    if (!isValidDomain(domain)) {
        displayMessage("⚠️ Por favor, introduce un dominio válido (ej: ejemplo.com).", 'bg-yellow-100 border-yellow-400 text-yellow-700');
        return;
    }

    if (searchButton) searchButton.disabled = true;
    if (buttonText) buttonText.textContent = 'Buscando...';
    if (loader) loader.classList.remove('hidden');

    // API de Google Public DNS: /resolve?name=domain&type=type
    const searchUrl = `${GOOGLE_DNS_API_URL}?name=${encodeURIComponent(domain)}&type=${recordType}`; 

    try {
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: { "Accept": "application/json" }
        });
        const data = await response.json();

        if (response.ok && data.Status === 0) { // Status 0 significa éxito
            displayDnsRecords(domain, recordType, data);
        } else if (data.Status === 3) { // NXDOMAIN
            displayMessage(`⚠️ El dominio <span class="font-bold">${domain}</span> existe, pero no se encontró un registro DNS de tipo **${recordType}** (Status 3: NXDOMAIN).`, 'bg-yellow-100 border-yellow-400 text-yellow-700');
        } else {
            const errorReason = data.Comment || `Status ${data.Status}`;
            displayMessage(`❌ Error al consultar DNS para ${domain} (${recordType}). Razón: ${errorReason}`, 'bg-red-100 border-red-400 text-red-700');
        }
    } catch (error) {
        console.error("Error en la solicitud Fetch (DNS):", error);
        displayMessage(`❌ Error de Conexión: Ha ocurrido un problema al conectar con el servicio de DNS Lookup.`, 'bg-red-100 border-red-400 text-red-700');
    } finally {
        if (searchButton) searchButton.disabled = false;
        if (buttonText) buttonText.textContent = 'Buscar Registros DNS';
        if (loader) loader.classList.add('hidden');
    }
}

/**
 * Muestra los registros DNS en la sección de resultados.
 * @param {string} domain - Dominio consultado.
 * @param {string} recordType - Tipo de registro.
 * @param {object} data - Objeto de datos de respuesta de la API de Google DNS.
 */
function displayDnsRecords(domain, recordType, data) {
    const resultsDiv = document.getElementById('results');
    const answer = data.Answer;

    let html = `
        <div class="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg shadow-md mb-6" role="alert">
            <p class="font-bold text-lg">📡 Registros DNS Encontrados</p>
            <p class="text-sm">Dominio: <span class="font-extrabold">${domain}</span> | Tipo de Registro: <span class="font-extrabold">${recordType}</span></p>
        </div>
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Resultados:</h2>
    `;

    if (answer && answer.length > 0) {
        html += `
            <div class="overflow-x-auto">
            <table class="min-w-full bg-white rounded-xl shadow border border-gray-200">
                <thead class="bg-gray-100">
                    <tr>
                        <th class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Nombre</th>
                        <th class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Tipo</th>
                        <th class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">TTL (seg)</th>
                        <th class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Datos</th>
                    </tr>
                </thead>
                <tbody>
        `;
        answer.forEach(record => {
            // Formato especial para registros MX (Priority + Target)
            const recordData = (recordType === 'MX') 
                ? (record.data.includes(' ') ? record.data.replace(' ', ' (Prioridad: ') + ')' : record.data)
                : record.data;

            html += `
                <tr class="hover:bg-gray-50 transition duration-150">
                    <td class="py-2 px-4 border-b text-sm text-gray-800 font-mono">${record.name}</td>
                    <td class="py-2 px-4 border-b text-sm text-gray-600">${record.type}</td>
                    <td class="py-2 px-4 border-b text-sm text-gray-600">${record.TTL}</td>
                    <td class="py-2 px-4 border-b text-sm text-gray-800 font-mono break-all">${recordData}</td>
                </tr>
            `;
        });
        html += `
                </tbody>
            </table>
            </div>
        `;
    } else {
        html += `
            <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg">
                <p class="font-semibold">⚠️ No se encontraron registros de tipo ${recordType} para el dominio ${domain}.</p>
            </div>
        `;
    }
    if (resultsDiv) resultsDiv.innerHTML = html;
}


// ----------------------------------------------------------------------
// --- FUNCIONES DE CONTRASEÑA (GENERADOR/FUERZA) ---
// ----------------------------------------------------------------------

/**
 * Genera una contraseña basada en los parámetros seleccionados por el usuario.
 */
function generatePassword() {
    const length = parseInt(document.getElementById('passLength').value);
    const includeUpper = document.getElementById('passUppercase').checked;
    const includeLower = document.getElementById('passLowercase').checked;
    const includeNumbers = document.getElementById('passNumbers').checked;
    const includeSymbols = document.getElementById('passSymbols').checked;

    let charset = "";
    let generatedPassword = "";

    // Definición de caracteres
    const CHARS = {
        UPPER: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        LOWER: "abcdefghijklmnopqrstuvwxyz",
        NUMBERS: "0123456789",
        SYMBOLS: "!@#$%^&*()_+~`|}{[]:;?><,./-="
    };

    if (includeUpper) charset += CHARS.UPPER;
    if (includeLower) charset += CHARS.LOWER;
    if (includeNumbers) charset += CHARS.NUMBERS;
    if (includeSymbols) charset += CHARS.SYMBOLS;

    // Asegurar al menos una opción esté seleccionada
    if (charset === "") {
        displayMessage('⚠️ Debes seleccionar al menos un tipo de carácter para generar la contraseña.', 'bg-yellow-100 border-yellow-400 text-yellow-700');
        document.getElementById('generatedPassword').value = '';
        return;
    }

    // Generar la contraseña
    for (let i = 0, n = charset.length; i < length; ++i) {
        generatedPassword += charset.charAt(Math.floor(Math.random() * n));
    }

    document.getElementById('generatedPassword').value = generatedPassword;
    document.getElementById('results').innerHTML = ''; // Limpiar resultados de la pestaña de fuerza si los hubiera
    displayMessage('✅ Contraseña generada con éxito. ¡No la olvides!', 'bg-blue-100 border-blue-400 text-blue-700');
}

/**
 * Evalúa la fuerza de la contraseña y actualiza la barra de progreso.
 * (Implementación básica de evaluación)
 */
function checkPasswordStrength() {
    const password = document.getElementById('passwordStrengthInput').value;
    const strengthIndicator = document.getElementById('strengthIndicator');
    const strengthText = document.getElementById('strengthText');
    
    let score = 0;
    let percent = 0;
    let text = 'Muy Débil 😟';
    let color = 'bg-red-500';

    const len = password.length;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    const requirements = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;

    if (len >= 8) score += 20;
    if (len >= 12) score += 20;
    
    // Puntuación por cumplir requisitos de caracteres
    if (requirements === 2) score += 10;
    if (requirements === 3) score += 20;
    if (requirements === 4) score += 40;

    // Ajustar el puntaje máximo a 100
    percent = Math.min(score, 100);

    // Determinar texto y color
    if (percent < 30) {
        text = 'Muy Débil 😟';
        color = 'bg-red-500';
    } else if (percent < 60) {
        text = 'Débil 😕';
        color = 'bg-orange-500';
    } else if (percent < 80) {
        text = 'Mediana 😐';
        color = 'bg-yellow-500';
    } else if (percent < 100) {
        text = 'Fuerte 😊';
        color = 'bg-green-500';
    } else {
        text = '¡Muy Fuerte! 😎';
        color = 'bg-green-700';
    }
    
    if (len === 0) {
        percent = 0;
        text = '';
    }

    // Actualizar la interfaz
    strengthIndicator.style.width = `${percent}%`;
    strengthIndicator.className = `h-2 rounded-full transition-all duration-500 ${color}`;
    strengthText.textContent = text;
    document.getElementById('results').innerHTML = ''; // Limpiar resultados

    if (len > 0) {
         displayStrengthMessage(percent, text);
    }
}

function displayStrengthMessage(percent, text) {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;

    let messageClass = '';
    let messageHtml = '';

    if (percent < 60) {
        messageClass = 'bg-red-100 border-red-500 text-red-700';
        messageHtml = `
            <p class="font-bold text-lg">🚨 ¡Contraseña ${text}!</p>
            <p class="text-sm">Se recomienda que la longitud sea de al menos 12 caracteres y que incluya una combinación de mayúsculas, minúsculas, números y símbolos.</p>
        `;
    } else if (percent < 80) {
         messageClass = 'bg-yellow-100 border-yellow-500 text-yellow-700';
        messageHtml = `
            <p class="font-bold text-lg">⚠️ Contraseña ${text}.</p>
            <p class="text-sm">Considera aumentar la longitud a 16 o más caracteres para mayor seguridad.</p>
        `;
    } else {
         messageClass = 'bg-green-100 border-green-500 text-green-700';
        messageHtml = `
            <p class="font-bold text-lg">✅ ¡Contraseña ${text}!</p>
            <p class="text-sm">Excelente seguridad. Recuerda usar esta contraseña solo en un lugar.</p>
        `;
    }
    
    // Reutiliza la función displayMessage, pero con el HTML personalizado
    resultsDiv.innerHTML = `
        <div class="${messageClass} p-4 rounded-lg border-l-4 shadow-sm" role="alert">
            ${messageHtml}
        </div>
    `;
}


// ----------------------------------------------------------------------
// --- FUNCIONES DE SEGURIDAD WEB (GOOGLE SAFE BROWSING) ---
// ----------------------------------------------------------------------

function isValidUrl(url) {
    try {
        // Utiliza la API nativa de URL para una verificación estricta
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}

async function checkSafeUrl() {
    const urlInput = document.getElementById('urlInput');
    const url = urlInput ? urlInput.value.trim() : '';
    const searchButton = document.getElementById('searchButtonSafe');
    const buttonText = document.getElementById('buttonTextSafe');
    const loader = document.getElementById('loaderSafe');
    document.getElementById('results').innerHTML = '';

    if (!isValidUrl(url)) {
        displayMessage("⚠️ Por favor, introduce una URL válida (ej: https://www.tienda.com).", 'bg-yellow-100 border-yellow-400 text-yellow-700');
        return;
    }
    
    if (searchButton) searchButton.disabled = true;
    if (buttonText) buttonText.textContent = 'Verificando...';
    if (loader) loader.classList.remove('hidden');

    try {
        // APUNTA AL PROXY SERVERLESS (api/safebrowsing.js)
        const response = await fetch(PROXY_SAFE_URL, {
            method: 'POST', // Usamos POST para enviar la URL en el cuerpo
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json" 
            },
            body: JSON.stringify({ url: url }) // Enviamos la URL en el cuerpo de la petición
        });
        const data = await response.json();

        if (response.ok && data.status === "SAFE") {
            // CASO 1: URL Segura
            displayMessage(`✅ ¡URL Segura! La URL <span class="font-bold">${url}</span> NO fue clasificada como maliciosa por Google Safe Browsing.`, 'bg-green-100 border-green-400 text-green-700');
        } else if (response.ok && data.status === "DANGEROUS") {
            // CASO 2: URL Peligrosa
            displayDangerousUrl(url, data.matches);
        } else {
            // CASO 3: Error del Proxy o de la API de Google
            const message = data.error || `Error ${response.status}: Error en la verificación de seguridad.`;
            displayMessage(`❌ Error: ${message}`, 'bg-red-100 border-red-400 text-red-700');
        }
    } catch (error) {
        console.error("Error en la solicitud Fetch (SafeBrowsing/Proxy):", error);
        displayMessage(`❌ Error de Conexión. Fallo al contactar el servicio Proxy para seguridad web.`, 'bg-red-100 border-red-400 text-red-700');
    } finally {
        if (searchButton) searchButton.disabled = false;
        if (buttonText) buttonText.textContent = 'Verificar URL';
        if (loader) loader.classList.add('hidden');
    }
}

function displayDangerousUrl(url, matches) {
    const resultsDiv = document.getElementById('results');
    let threats = matches.map(match => `
        <li class="font-medium text-red-700">
            Tipo de Amenaza: <strong>${capitalize(match.threatType.replace(/_/g, ' ').toLowerCase())}</strong> 
            (Plataforma: ${match.platformType.replace(/_/g, ' ')})
        </li>
    `).join('');

    let html = `
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md mb-6" role="alert">
            <p class="font-bold text-lg">🚨 ¡ATENCIÓN! La URL <span class="font-extrabold">${url}</span> es PELIGROSA.</p>
            <p class="text-sm">Google Safe Browsing ha clasificado este sitio como malicioso o de ingeniería social (phishing). **NO accedas ni introduzcas credenciales.**</p>
        </div>
        <h2 class="text-xl font-semibold text-gray-700 mb-4">Detalles de la Amenaza:</h2>
        <div class="bg-white p-4 rounded-xl shadow border border-gray-200">
            <ul class="list-disc list-inside space-y-2 text-gray-800">
                ${threats}
            </ul>
        </div>
        <p class="text-sm text-gray-500 mt-4">
            **Clasificaciones:** MALWARE (Software malicioso), SOCIAL_ENGINEERING (Phishing/Engaño), UNWANTED_SOFTWARE (Software no deseado).
        </p>
    `;
    if (resultsDiv) resultsDiv.innerHTML = html;
}


// ----------------------------------------------------------------------
// --- INICIALIZACIÓN ---
// ----------------------------------------------------------------------
// Función para asegurar que al cargar la página se activa la primera pestaña
document.addEventListener('DOMContentLoaded', () => {
    changeTab('email');
    // Inicializa la fuerza de la contraseña en 0 al cargar
    document.getElementById('strengthIndicator').style.width = '0%';
    document.getElementById('strengthText').textContent = '';
});