# Monster_AGL — Torneo 1 vs 1

Landing, inscripción y bracket del torneo 1 vs 1 de **Mobile Legends: Bang Bang**
del canal [@monster_agl](https://www.tiktok.com/@monster_agl).
**Domingo 27 de septiembre de 2026 · 4:00 PM CDMX** (inscripciones hasta las 3:00 PM).

Un solo proyecto Next.js: la landing, el panel `/admin` y las APIs viven en el
mismo monolito. PostgreSQL es la única fuente de verdad; Redis es caché y rate
limiting, y si se cae la app sigue funcionando contra PostgreSQL.

| Pieza | Versión |
|---|---|
| Next.js (App Router, Turbopack) | 16.3.6 |
| React | 19.3 |
| TypeScript (`strict: true`) | 6.0 |
| Tailwind CSS + shadcn/ui (tema propio) | 4.3 |
| PostgreSQL | 18 |
| Redis Open Source | 8.10 |
| Zod | 4 |

---

## 1. Requisitos

- Node.js **22.12 o superior**
- Docker con Docker Compose (para PostgreSQL y Redis en local)

## 2. Instalación

```bash
git clone <repo> monster-agl-torneo
cd monster-agl-torneo
cp .env.example .env
```

## 3. Variables de entorno

| Variable | Obligatoria | Qué es |
|---|---|---|
| `DATABASE_URL` | sí | Conexión a PostgreSQL. En producción, con `?sslmode=verify-full`. |
| `REDIS_URL` | no* | Conexión a Redis. En producción, `rediss://` (TLS) con contraseña. |
| `ADMIN_PASSWORD` | sí | Contraseña del panel. Mínimo 12 caracteres. Nunca llega al navegador. |
| `ADMIN_SESSION_SECRET` | sí | Clave HMAC de la cookie de sesión. Mínimo 32 caracteres, distinta de la contraseña. |
| `NEXT_PUBLIC_TIKTOK_URL` | sí | Enlace al directo de TikTok de los CTA. |
| `NEXT_PUBLIC_SITE_URL` | recomendado | URL pública del sitio, para las imágenes de Open Graph. |
| `TOURNAMENT_SLUG` | no | Torneo que muestra la landing. Por defecto `monster-agl-1v1-2026-09`. |
| `TRUSTED_PROXY_HOPS` | no | Proxies de confianza que agregan su salto a `X-Forwarded-For` (por defecto 1). Mal configurado, el rate limit se puede burlar o agrupar a todos en una sola IP. |
| `SMTP_HOST` / `SMTP_PORT` | no | Servidor SMTP. Por defecto Brevo: `smtp-relay.brevo.com:587` (STARTTLS). |
| `SMTP_USER` | para correos | El **Login** SMTP de Brevo (`xxxxxx@smtp-brevo.com`), no el correo de la cuenta. |
| `SMTP_PASS` | para correos | La clave SMTP de Brevo (`xsmtpsib-…`). |
| `MAIL_FROM` | para correos | Remitente, p. ej. `Monster_AGL <torneos@tudominio.com>`. Tiene que estar verificado en Brevo. |
| `ADMIN_NOTIFY_EMAIL` | no | Quién recibe el aviso de cada inscripción. |
| `POSTGRES_PORT` / `REDIS_PORT` | no | Puertos del host para Docker Compose, si 5432/6379 ya están ocupados. |

\* Sin `REDIS_URL` la app funciona, pero sin caché ni rate limiting. Sin `SMTP_USER`, `SMTP_PASS` y `MAIL_FROM` la inscripción funciona igual, solo que no sale ningún correo.

Generar un secreto de sesión:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Las variables se validan con Zod la primera vez que se usan. Si falta alguna, el
error nombra la variable pero **nunca imprime su valor**.

## 4. Levantar Docker

```bash
docker compose up -d
docker compose ps        # los dos servicios en "healthy"
```

Levanta `postgres:18-alpine` y `redis:8.10-alpine`, con volúmenes persistentes
(`postgres-data`, `redis-data`) y puertos publicados solo en `127.0.0.1`.

Si otro proyecto ya ocupa 5432 o 6379, define en `.env` por ejemplo
`POSTGRES_PORT=55432` y `REDIS_PORT=56379`, y ajusta los puertos de
`DATABASE_URL` y `REDIS_URL`.

## 5. Ejecutar migraciones

```bash
npm run db:migrate
```

- `001_init.sql` crea `tournaments`, `participants` y `matches` con sus claves
  foráneas y constraints.
- `002_seed_tournament.sql` crea el torneo del 26 de septiembre; `005_move_to_sunday.sql` lo pasa al domingo 27; `006_unique_mobile_legends_id.sql` impide inscribir dos veces el mismo ID.

Cada migración corre en su propia transacción, queda registrada con su checksum
en `schema_migrations` (editar una ya aplicada hace fallar el comando) y se toma
un advisory lock para que dos despliegues no migren a la vez. Correrlo de nuevo
es seguro: dice «Base de datos al día».

## 6. Instalar dependencias

```bash
npm install
```

## 7. Ejecutar Next.js

```bash
npm run dev                  # desarrollo, http://localhost:3000
npm run build && npm start   # producción
npm run check                # typecheck + lint + tests
```

## 8. Acceso a `/admin`

Entra a `http://localhost:3000/admin` con el valor de `ADMIN_PASSWORD`.

| Acción | Qué hace |
|---|---|
| **Sortear bracket** | Baraja a los inscritos en el servidor y publica las llaves. Cierra las inscripciones. |
| **Regenerar bracket** | Vuelve a sortear. Pide confirmación porque borra los resultados cargados. |
| **Reabrir inscripciones** | Borra el cuadro y vuelve al estado de inscripción. Pide confirmación. |
| **Elegir ganador** | Se toca al jugador que ganó; avanza solo a su casilla del siguiente encuentro. Tocar al otro corrige el resultado mientras el encuentro siguiente no se haya jugado. |

El panel muestra inscritos, estado, partidas jugadas, ronda actual, las llaves y
la lista de inscritos con su correo (lo único que ve el correo es este panel).
Al decidirse la final, el campeón aparece en el panel, en el bracket público y
en la landing.

La sesión es una cookie `HttpOnly`, `SameSite=Strict`, `Secure` en producción,
firmada con HMAC-SHA256 y con expiración de 8 horas. La contraseña se compara en
tiempo constante, el login tiene rate limit (10 intentos cada 5 minutos) y las
rutas de administración además comprueban que el `Origin` sea el propio sitio.

---

## 9. Arquitectura

```
src/
├── core/                         ← no importa Next, pg, ioredis ni React
│   ├── domain/                   entidades y reglas puras
│   │   ├── bracket.ts            potencia de 2, BYE, rondas, enlaces, avance
│   │   ├── shuffle.ts            Fisher-Yates con fuente de azar inyectada
│   │   ├── participant.ts        normalización y reglas del registro
│   │   ├── match.ts, tournament.ts, errors.ts
│   ├── application/              casos de uso
│   │   ├── use-cases/            register-participant, manage-bracket,
│   │   │                         select-winner, get-public-tournament,
│   │   │                         get-admin-dashboard, admin-login
│   │   ├── schemas.ts            contratos Zod (servidor y cliente)
│   │   ├── views.ts              vista pública: solo id y Gamer Tag
│   │   └── tournament-cache.ts   clave tournament:{slug}, TTL e invalidación
│   └── ports/                    interfaces: repositorios, UnitOfWork, Cache,
│                                 RateLimiter, RandomSource, SessionService…
├── infrastructure/               adaptadores
│   ├── postgres/                 pool, repositorios y UnitOfWork transaccional
│   ├── redis/                    caché y rate limiter (fail-open)
│   ├── security/                 crypto.randomInt, sesión HMAC, CAPTCHA
│   ├── config/env.ts             variables validadas con Zod
│   └── container.ts              composición: aquí se conectan puertos y adaptadores
├── app/                          delivery (Next.js)
│   ├── page.tsx                  landing (Server Component)
│   ├── admin/page.tsx            panel
│   └── api/…/route.ts            Route Handlers: solo validan, llaman al caso de uso y traducen a HTTP
├── components/                   UI: landing, bracket, admin, ui (shadcn con tema propio)
└── lib/                          utilidades de delivery (http, sesión admin, datos del sitio)
```

**La regla de dependencias** va hacia adentro: `app` → `infrastructure` →
`core/application` → `core/domain`. El dominio no sabe que existe PostgreSQL;
los casos de uso reciben sus dependencias por constructor (inversión de
dependencias), y los tests las reemplazan por versiones en memoria.

### El sorteo

Solo en el servidor (`ManageBracket`):

1. Lee los inscritos de PostgreSQL con el torneo bloqueado (`SELECT … FOR UPDATE`).
2. Copia la lista.
3. La baraja con **Fisher-Yates** usando **`crypto.randomInt()`**, nunca `Math.random()`.
4. Calcula la siguiente potencia de 2.
5. Crea los BYE y los reparte a lo largo del cuadro (si se agruparan, los que
   pasan por BYE se cruzarían siempre entre ellos). Nunca hay dos BYE juntos.
6. Crea todas las rondas.
7. Enlaza cada encuentro con el siguiente (`next_match_id` + `next_slot`).
8. Lo persiste todo en una transacción e invalida la caché después del commit.

Ejemplo: 6 inscritos → cuadro de 8 → 2 BYE → 3 rondas (Ronda 1, Semifinales, Final).
Admite de 2 a 512 jugadores.

### Elegir ganador

`SelectWinner`, en una transacción: valida que el ganador sea uno de los dos
jugadores → guarda `winner_id` → busca el siguiente encuentro → mete al ganador
en su `next_slot` → actualiza el estado del torneo (`live`, o `finished` en la
final) → invalida `tournament:{slug}`.

### Integridad en la base

- Correo y Gamer Tag únicos **por torneo e insensibles a mayúsculas**
  (índices únicos sobre `lower(...)`). La app los traduce a un 409 con el
  mensaje del campo, pero aunque alguien se saltara la app la base los rechaza.
- `CHECK` de longitudes, de `accepted_rules = true`, de estados válidos, de que
  el ganador sea uno de los dos jugadores, de que los dos jugadores sean
  distintos y de que `next_match_id` y `next_slot` vayan juntos.
- Todas las consultas son parametrizadas y pasan por un pool de conexiones.

### Redis

| Uso | Clave | Detalle |
|---|---|---|
| Vista pública | `tournament:{slug}` | TTL 30 s. Se invalida tras registrar, sortear, regenerar, reabrir y elegir ganador. |
| Rate limit del registro | `ratelimit:register:{hmac(ip)}` | 5 intentos por IP cada 60 s. Cuenta también los intentos inválidos. |
| Rate limit del login | `ratelimit:admin-login:{hmac(ip)}` | 10 intentos cada 5 minutos. |

La IP nunca se guarda en claro. Si Redis no responde, la caché se salta y el
rate limit deja pasar (y lo registra): la inscripción no depende de Redis, y las
constraints de PostgreSQL siguen impidiendo duplicados.

### Correos de inscripción

Cada inscripción manda **dos correos** por SMTP (Brevo):

1. **Al participante**: confirmación con su Gamer Tag, fecha, premios y el enlace al live.
2. **Al organizador** (`ADMIN_NOTIFY_EMAIL`): Gamer Tag, correo, ID de MLBB y número de inscrito. Su `Reply-To` es el participante, así que responder le escribe directo.

Salen **después** del commit en PostgreSQL y en paralelo. Si el SMTP falla o tarda (hay timeouts de 10-15 s), la inscripción queda guardada igual y el formulario solo omite el aviso de "te enviamos un correo". Los logs registran `email.sent` / `email.failed` con el tipo de correo y el código SMTP, nunca direcciones. Las plantillas (`src/infrastructure/email/templates.ts`) escapan todo lo que escribió el participante.

**Remitente @gmail.com**: Brevo lo acepta verificado, pero reescribe la dirección a `…@<cuenta>.brevosend.com` (el nombre "Monster_AGL" se mantiene). Por eso el correo del participante lleva `Reply-To` con la dirección real de `MAIL_FROM`: responder le llega al canal.

Para que Brevo entregue bien: verifica el remitente en *Senders, domains & dedicated IPs*, y en producción usa un dominio propio con SPF y DKIM configurados. Un remitente `@gmail.com` enviado desde Brevo suele caer en spam.

### Arte de los héroes

```bash
npm run heroes            # descarga lo que falte
npm run heroes -- --force # vuelve a bajar todo
```

`scripts/heroes.ts` pide a la API de MediaWiki de la wiki de Mobile Legends (sin clave) el retrato oficial de cada héroe, lo guarda en `public/heroes/` y escribe `src/content/heroes.json`, que alimenta la sección *Elige a tu main*. Para añadir o quitar héroes se edita la lista `HEROES` del script. El formato se decide por los bytes y no por la URL, porque Fandom sirve WebP aunque el enlace diga `.png`. El arte es © Moonton; la landing lo indica debajo de la galería.

### Privacidad

El correo solo sale de PostgreSQL hacia el panel de administración. La vista
pública (`views.ts`) se construye con id y Gamer Tag, así que el correo no llega
a la respuesta de `/api/tournament`, a la caché, al bracket ni a los componentes
públicos. Los logs son JSON con eventos y contadores, sin correos, sin IPs y sin
mensajes de error de `pg` (que pueden incluir valores de la fila).

### CAPTCHA (preparado, apagado)

El caso de uso de registro ya recibe un `HumanVerifier` y el formulario ya envía
`captchaToken`. Para activar Cloudflare Turnstile o hCaptcha:

1. Escribir un adaptador de `HumanVerifier` en `src/infrastructure/security/`
   que llame al endpoint de verificación del proveedor.
2. Cambiar `DisabledHumanVerifier` por ese adaptador en `container.ts`.
3. Añadir el widget al formulario de registro.

El caso de uso no cambia.

### APIs

| Método | Ruta | Acceso |
|---|---|---|
| `POST` | `/api/register` | pública, con rate limit |
| `GET` | `/api/tournament` | pública, cacheada |
| `POST` | `/api/admin/login` | pública, con rate limit |
| `POST` | `/api/admin/logout` | admin |
| `POST` | `/api/admin/bracket` | admin — `{ "action": "generate" }`, `{ "action": "regenerate", "confirm": true }`, `{ "action": "reset", "confirm": true }` |
| `POST` | `/api/admin/match` | admin — `{ "matchId": "…", "winnerId": "…" }` |

Todas las entradas se validan con Zod en el servidor, aunque el formulario
también valide en el cliente.

### Tests

`npm test` cubre el cuadro (potencias de 2, BYE, enlaces, avance y correcciones),
Fisher-Yates, la sesión HMAC, la comparación de contraseñas, el esquema de
registro, que la vista pública no lleve correos y que el rate limit cuente los
intentos inválidos.

---

## 10. Checklist de producción

- [ ] **Secretos fuertes**: `ADMIN_PASSWORD` larga y única; `ADMIN_SESSION_SECRET`
      aleatorio de 48 bytes. Cambiar el secreto invalida todas las sesiones.
- [ ] **Redis con autenticación y TLS** (`rediss://`), no expuesto a internet.
- [ ] **PostgreSQL con TLS** (`sslmode=verify-full`) y un usuario de la app sin
      permisos de superusuario.
- [ ] **Backups** automáticos de PostgreSQL y una restauración probada antes del evento.
- [ ] **Rate limiting** activo: `REDIS_URL` configurada y `TRUSTED_PROXY_HOPS`
      igual al número real de proxies delante de la app.
- [ ] **Política de privacidad** publicada: qué se guarda (correo, Gamer Tag, ID
      de MLBB), para qué y cuándo se borra.
- [ ] **Reglas oficiales del torneo** publicadas (formato de cada partida,
      desempates, qué pasa si alguien no se presenta, entrega de premios).
- [ ] **CAPTCHA** (opcional): activarlo si aparecen registros automatizados.
- [ ] **Logging sin PII**: revisar que ninguna integración nueva registre correos o IPs.
- [ ] **HTTPS** en todo el sitio, con redirección desde HTTP.
- [ ] **Cookies**: `NODE_ENV=production` para que la sesión salga con `Secure`.
- [ ] `NEXT_PUBLIC_SITE_URL` con el dominio real.
- [ ] `npm run db:migrate` como paso del despliegue, antes de arrancar la app.
- [ ] `npm run check` y `npm run build` en verde.
