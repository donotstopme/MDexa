# Lanzamiento Portal de Clientes

- Proyecto: Lanzamiento Portal de Clientes
- Meta inicio: 2026-10-05
- Meta fin: 2026-12-18
- Versión de MDexa: 18 (v1.34.1)

| ID | Negocio | Actividad | Tamaño | Prioridad | Responsable | Inicio | Fin | Estado | Terminada | Etiquetas | Depende de | Repite |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Producto | Definir alcance del portal | M | Alta | Ana | 2026-10-05 | 2026-10-09 | Terminado | 2026-10-08 | planeación | |  |
| 2 | Producto | Priorizar funcionalidades con ventas | S | Alta | Ana | 2026-10-12 | 2026-10-14 | Terminado | 2026-10-14 | planeación, ventas | #1 |  |
| 3 | Diseño | Wireframes de inicio de sesión y panel | L | Alta | Luis | 2026-10-15 | 2026-10-28 | Terminado | 2026-10-30 | diseño | #2 |  |
| 4 | Diseño | Sistema de diseño y componentes | L | Media | Luis | 2026-10-29 | 2026-11-13 | En progreso |  | diseño | #3 |  |
| 5 | Desarrollo | Autenticación y roles | XL | Alta | Marta | 2026-10-20 | 2026-11-04 | En progreso |  | backend, seguridad | #2 |  |
| 6 | Desarrollo | API de facturas y estados de cuenta | L | Alta | Marta | 2026-11-05 | 2026-11-20 | Planeado |  | backend | #5 |  |
| 7 | Desarrollo | Pantallas del panel de cliente | XL | Alta | Pedro | 2026-11-16 | 2026-12-04 | Planeado |  | frontend | #4, #6 |  |
| 8 | Calidad | Plan de pruebas y casos de aceptación | M | Media | Sofía | 2026-11-09 | 2026-11-13 | Planeado |  | calidad |  |  |
| 9 | Calidad | Pruebas de carga | M | Media | Sofía | 2026-12-07 | 2026-12-11 | Planeado |  | calidad, seguridad | #7 |  |
| 10 | Seguridad | Revisión de seguridad con terceros | M | Alta |  |  | 2026-12-09 | Backlog |  | seguridad | #5 |  |
| 11 | Operaciones | Preparar entorno de producción | L | Media | Pedro | 2026-11-23 | 2026-12-02 | Planeado |  | infraestructura |  |  |
| 12 | Capacitación | Manual y capacitación para soporte | M | Baja | Sofía | 2026-12-07 | 2026-12-16 | Backlog |  | soporte | #7 |  |
| 13 | Lanzamiento | Comunicado a clientes y lanzamiento | S | Alta | Ana |  | 2026-12-18 | Backlog |  | ventas | #9, #12 |  |
| 14 | Producto | Integración con CRM (descartada para v1) | XL | Baja | Ana |  |  | Cancelado |  | integración |  |  |
| 15 | Gestión | Junta semanal de seguimiento | XS | Media | Ana | 2026-11-06 | 2026-11-06 | Planeado |  | gestión |  | Cada semana |
| 16 | Desarrollo | Corregir errores de la revisión de código | S | Media | Marta | 2026-10-26 | 2026-10-30 | En progreso |  | backend | #5 |  |

## Etiquetas

- seguridad | rojo
- ventas | verde
- diseño | morado
- gestión | gris

## Notas

- #3 | 2026-10-30T16:20:00.000Z | Luis | Se terminó dos días tarde: faltaban los textos legales.
- #5 | 2026-11-02T14:10:00.000Z | Marta | Falta integrar el inicio de sesión único. @Pedro ¿puedes revisar el flujo de recuperación de contraseña?
- #5 | 2026-11-03T09:45:00.000Z | Pedro | Revisado, solo falta ajustar el correo de recuperación.
- #10 | 2026-11-04T11:00:00.000Z | Ana | Sin responsable todavía. @Sofía ¿conoces algún proveedor de pruebas de penetración?
- #14 | 2026-10-14T10:00:00.000Z | Ana | Se decidió dejar el CRM para la versión 2.

## Subtareas

- #4 [x] Paleta de colores y tipografía
- #4 [x] Botones y formularios
- #4 [ ] Tablas y tarjetas
- #4 [ ] Documentar en el catálogo
- #5 [x] Registro y login con correo
- #5 [x] Roles de administrador y cliente
- #5 [ ] Inicio de sesión único
- #5 [ ] Recuperación de contraseña
- #8 [ ] Casos de aceptación por pantalla
- #8 [ ] Datos de prueba

## Bitácora

- 2026-10-05T09:00:00.000Z | Ana | #1 | creó | Producto · Definir alcance del portal
- 2026-10-08T17:00:00.000Z | Ana | #1 | cambió | Estado: En progreso → Terminado
- 2026-10-14T17:30:00.000Z | Ana | #2 | cambió | Estado: En progreso → Terminado
- 2026-10-20T09:15:00.000Z | Marta | #5 | cambió | Estado: Planeado → En progreso
- 2026-10-30T16:25:00.000Z | Luis | #3 | cambió | Estado: En progreso → Terminado; Fin: 2026-10-26 → 2026-10-28
- 2026-11-02T14:00:00.000Z | Ana | #14 | cambió | Estado: Backlog → Cancelado
