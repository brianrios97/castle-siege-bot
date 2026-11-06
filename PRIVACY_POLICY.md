# Política de Privacidad / Privacy Policy

*Última actualización: Noviembre de 2026 / Last updated: November 2026*

Esta Política de Privacidad describe cómo el bot de Discord **Castle Siege Party Bot** ("el Bot", "nosotros") recopila, utiliza y protege la información que interactúa con la aplicación.

---

## 1. Información que recopilamos
Para cumplir su función de organización de partys, el Bot únicamente almacena la información estrictamente necesaria cuando un usuario decide interactuar voluntariamente:

- **ID de usuario de Discord (`User ID`):** Identificador numérico público proporcionado por Discord para asociar a cada usuario con su personaje registrado.
- **Nombre de usuario de Discord (`Username` / Tag):** Utilizado para identificar visualmente al jugador en la interfaz y asignación de partys.
- **Datos de juego provistos por el usuario:**
  - Nombre del personaje dentro del juego (*character name*).
  - Clase seleccionada (ej. Inner BK, Inner MG, Elf, Dark Lord, Soul Master).
  - Asignación de party actual.

> **Importante:** El Bot **NO** recopila, almacena ni tiene acceso a contraseñas, correos electrónicos, datos de pago, mensajes privados (DMs), direcciones IP ni ninguna información sensible del usuario.

## 2. Uso de la Información
La información recopilada se utiliza exclusivamente para:
- Mostrar los listados de partys actualizados en tiempo real dentro del canal configurado del servidor de Discord.
- Permitir a los jugadores registrarse, unirse, cambiar de clase o abandonar una party.
- Validar las combinaciones de clases requeridas para el evento de Castle Siege (Inner, Elf, DL).

Bajo ninguna circunstancia vendemos, alquilamos ni compartimos los datos de los usuarios con terceros ni con redes publicitarias.

## 3. Almacenamiento y Seguridad de los Datos
- Los datos se guardan en un archivo de configuración local (`data/parties.json`) en el servidor donde se ejecuta la instancia del Bot.
- No se utilizan bases de datos externas de terceros para almacenar tu información personal.
- Se implementan medidas razonables de seguridad para proteger los archivos locales contra accesos no autorizados.

## 4. Retención y Eliminación de Datos
- **Eliminación voluntaria:** Cualquier jugador puede desvincularse de una party en cualquier momento utilizando el botón **"🚪 Salir de Party"**.
- **Limpieza administrativa:** Los administradores del servidor pueden restablecer o vaciar las partys utilizando las opciones de reinicio provistas por el Bot.
- **Solicitud de borrado total:** Si deseas que todos tus datos registrados (ID, nombre de personaje y clase) sean eliminados por completo del almacenamiento del Bot, puedes solicitarlo abriendo un ticket o issue en nuestro repositorio de GitHub o comunicándote con el administrador de tu servidor de Discord.

## 5. Servicios de Terceros
El Bot opera dentro de la plataforma Discord y utiliza la API oficial de Discord. El uso de Discord por parte de los usuarios está sujeto a la [Política de Privacidad de Discord](https://discord.com/privacy).

## 6. Cambios en esta Política
Podemos actualizar esta Política de Privacidad periódicamente. Cualquier actualización se publicará en este repositorio con la fecha de revisión correspondiente.

## 7. Contacto
Para cualquier consulta sobre privacidad o para solicitar la eliminación de datos, puedes contactarnos a través de:  
[https://github.com/brianrios97/castle-siege-bot/issues](https://github.com/brianrios97/castle-siege-bot/issues)
