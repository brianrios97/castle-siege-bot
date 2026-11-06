# 🏰 Castle Siege Party Bot — Guía de instalación

## Requisitos previos

### 1. Instalar Node.js
Descargalo de **https://nodejs.org** (versión LTS recomendada).  
Verificá que esté instalado abriendo una terminal y corriendo:
```
node -v
npm -v
```

---

## 2. Crear el Bot en Discord Developer Portal

1. Entrá a **https://discord.com/developers/applications**
2. Click en **"New Application"** → Ponele nombre (ej: `CastleSiegeBot`)
3. En el menú izquierdo → **Bot** → Click **"Add Bot"**
4. En la sección **"Privileged Gateway Intents"** activá:
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
5. Click en **"Reset Token"** → copiá el token (lo vas a necesitar en el `.env`)

---

## 3. Invitar el Bot a tu servidor

1. En el menú izquierdo → **OAuth2 → URL Generator**
2. Scopes: ✅ `bot`
3. Bot Permissions:
   - ✅ View Channels
   - ✅ Send Messages
   - ✅ Read Message History
   - ✅ Embed Links
   - ✅ Manage Messages
4. Copiá la URL generada → pegala en el navegador → elegí tu servidor → **Autorizar**

---

## 4. Obtener los IDs necesarios

Primero activá el **Modo Desarrollador** en Discord:
> Configuración → Apariencia → Modo Desarrollador ✅

Ahora podés hacer click derecho sobre cualquier elemento para copiar su ID:

| Variable | Cómo obtenerla |
|----------|---------------|
| `CLIENT_ID` | Click derecho en el bot → Copiar ID |
| `GUILD_ID` | Click derecho en tu servidor → Copiar ID del servidor |
| `CHANNEL_ID` | Click derecho en el canal `#armado-cs` → Copiar ID |

---

## 5. Configurar el `.env`

Editá el archivo `.env` en esta carpeta:

```
DISCORD_TOKEN=tu_token_aquí
CLIENT_ID=id_del_bot
GUILD_ID=id_del_servidor
CHANNEL_ID=id_del_canal_armado_cs
```

---

## 6. Instalar dependencias y arrancar

Abrí una terminal en la carpeta `c:\MuServer\discord-bot\` y corré:

```bash
npm install
node index.js
```

Deberías ver:
```
✅ Bot conectado como CastleSiegeBot#1234
📋 Mensaje del organizador listo en #armado-cs
```

---

## 7. ¿Cómo funciona?

### Para jugadores
| Botón | Acción |
|-------|--------|
| 📝 Registrar PJ | Registrás tu nombre de personaje y clase |
| ⚔️ Unirme a Party | Te unís a una party disponible |
| 🚪 Salir de Party | Salís de tu party actual |
| 🔄 Cambiar Clase | Cambiás la clase de tu PJ |

### Para admins (requiere permiso Manage Server)
| Botón | Acción |
|-------|--------|
| ➕ Nueva Party | Crea una nueva party vacía |
| 🔄 Desarmar Partys | Vacía las partys no fijadas |
| 🗑️ Resetear Todo | Borra todo (pide confirmación) |
| 📌 Fijar/Desfijar Party | Fija una party para que sobreviva al desarmar |

### Validación de partys
Una party está ✅ cuando tiene al menos:
- **1 Inner (BK 🛡️ o MG ⚡)**
- **1 Elf 🌿**
- **1 DL 👑**

---

## 8. Mantener el bot corriendo (opcional)

Para que el bot siga andando aunque cierres la terminal, podés usar **PM2**:

```bash
npm install -g pm2
pm2 start index.js --name castle-siege-bot
pm2 save
pm2 startup
```

---

## 9. Verificación de la aplicación en Discord Developer Portal

En el portal de desarrolladores de Discord (**General Information**):
- **TERMS OF SERVICE URL:** `https://github.com/brianrios97/castle-siege-bot/blob/main/TERMS_OF_SERVICE.md`
- **PRIVACY POLICY URL:** `https://github.com/brianrios97/castle-siege-bot/blob/main/PRIVACY_POLICY.md`

---

## Archivos del proyecto

```
discord-bot/
├── index.js              ← Código principal del bot
├── package.json          ← Dependencias
├── .env                  ← Token y IDs (¡no compartir, ignorado en git!)
├── .env.example          ← Plantilla de configuración
├── TERMS_OF_SERVICE.md   ← Condiciones del servicio para Discord
├── PRIVACY_POLICY.md     ← Política de privacidad para Discord
├── party-organizer.html  ← Organizador web offline / exportable
├── README.md             ← Esta guía
└── data/
    └── parties.json      ← Estado guardado (se crea automáticamente)
```
