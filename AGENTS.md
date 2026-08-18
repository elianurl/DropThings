# AGENTS.md

## Producto y marca

Este repositorio contiene **DropThing**, una aplicación para compartir archivos y mensajes entre dispositivos.

- Nombre exacto: `DropThing`.
- Lema exacto: `Share whatever you want, wherever you want.`
- URL canónica: `https://dropthings.vercel.app`.
- La interfaz está escrita en español; el lema oficial permanece en inglés.
- No introducir variantes públicas del nombre ni recuperar denominaciones históricas o nombres genéricos de plantillas.
- No añadir dependencias, metadatos, instrucciones ni archivos específicos de generadores de código o entornos de prototipado.

Las cadenas antiguas `qrdrop_*` solo pueden existir en rutinas explícitas de migración de `localStorage`. Nunca deben aparecer en la interfaz, metadatos, nombres de descarga nuevos ni documentación de producto.

## Stack y comandos

- React 19 + TypeScript estricto.
- Vite 6 + Tailwind CSS 4.
- Express + Socket.IO para señalización y respaldo.
- WebRTC Data Channels para el transporte P2P principal.
- npm y `package-lock.json` son el gestor y lockfile canónicos.

Antes de entregar un cambio:

```bash
npm install
npm run check
```

Para desarrollo:

```bash
npm run dev
```

La aplicación completa se abre en `http://localhost:3000`.

## Mapa del repositorio

- `src/App.tsx`: composición y coordinación de la sesión activa.
- `src/components/`: componentes visuales por responsabilidad.
- `src/config/brand.ts`: fuente única para nombre, lema y URL.
- `src/types.ts`: tipos de dominio compartidos por la aplicación cliente.
- `src/utils/webrtcManager.ts`: conexión Socket.IO, WebRTC y transferencias.
- `src/utils/roomsStorage.ts`: salas, mensajes y credenciales locales con migración.
- `src/utils/storage.ts`: historial local de transferencias.
- `shared/protocol.ts`: normalización, validación y límites usados por cliente y servidor.
- `server.ts`: autoridad de salas, señalización y relé temporal.
- `public/`: activos de marca.

Si `App.tsx` o un componente supera una responsabilidad clara, extrae lógica a un hook, utilidad o componente antes de añadir otra sección grande.

## Invariantes de seguridad

No debilitar estas reglas:

1. El servidor es la autoridad sobre pertenencia a sala y permisos.
2. Ningún evento dirigido puede alcanzar un socket que no pertenezca a la misma sala.
3. La condición de creador o administrador no se acepta desde una bandera del navegador; requiere un token emitido por el servidor.
4. Los PIN no se guardan en texto plano en el servidor ni se retransmiten a la sala.
5. La revocación administrativa invalida el token correspondiente.
6. Los nombres, textos, identificadores y metadatos de archivos se validan y limitan antes de retransmitirse.
7. Una solicitud de archivo se envía exclusivamente al par que la realizó.
8. CORS debe limitarse mediante `ALLOWED_ORIGINS` en producción.
9. No afirmar que el respaldo Socket.IO es P2P o cifrado de extremo a extremo.

Cuando se modifique el protocolo, actualiza de forma coordinada `server.ts`, `src/utils/webrtcManager.ts`, `src/types.ts` y `shared/protocol.ts`.

## Persistencia y compatibilidad

- Las salas del servidor son efímeras y viven en memoria.
- El cliente conserva como máximo 50 salas, 100 mensajes por sala y 100 entradas de historial.
- Los `blob:` URLs no se persisten: dejan de ser válidos al reiniciar el navegador.
- Las migraciones desde claves antiguas deben ser de lectura única, copiar al nombre vigente y borrar la clave antigua.
- No renombres claves de almacenamiento sin añadir una migración no destructiva.

## Transferencias y escalabilidad

- WebRTC es el transporte preferente; Socket.IO es solo respaldo.
- Mantén backpressure antes de enviar el siguiente chunk.
- No dupliques el mismo mensaje o encabezado por WebRTC y Socket.IO simultáneamente.
- No vuelvas a emitir un archivo solicitado a todos los pares.
- El receptor ensambla hoy el archivo en memoria. Una evolución para archivos grandes debe usar streaming y escritura progresiva, conservando las métricas de progreso.
- Para escalar el servidor a varias instancias se necesitará un adaptador compartido de Socket.IO y un almacén distribuido de salas/tokens; no presentes el `Map` en memoria actual como horizontalmente escalable.

## Diseño y accesibilidad

- Conserva el sistema visual oscuro, con cian/azul como acento principal.
- Los controles interactivos deben mantener nombre accesible, foco visible y área táctil suficiente.
- No comuniques “sin límites” mientras el receptor ensamble archivos completos en memoria.
- Mantén metadatos HTML, favicon, textos visibles y descargas alineados con la marca.

## Despliegue

- Frontend canónico: Vercel en `dropthings.vercel.app`.
- `server.ts` funciona como proceso Node persistente y sirve también el cliente compilado.
- Un frontend estático necesita `VITE_SIGNALING_URL` apuntando al servidor Socket.IO.
- Las conexiones en Vercel Functions deben diseñarse según sus límites vigentes; no asumas que `server.listen()` se convierte automáticamente en una Function.
- Nunca subas secretos. Mantén `.env.example` con valores de ejemplo no sensibles.

## Definición de terminado

Un cambio está terminado cuando:

- `npm run check` finaliza correctamente.
- No aparecen nuevas coincidencias de marca obsoleta fuera de migraciones documentadas.
- Los flujos crear/unirse, PIN, QR, chat y transferencia dirigida se han comprobado.
- `README.md` y este archivo reflejan cualquier cambio de arquitectura o despliegue.
- No se han añadido artefactos generados, dependencias sin uso ni credenciales.
