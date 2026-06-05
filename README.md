# 30X Onboarding Agent

Agente conversacional de onboarding para el equipo de 30X. Responde preguntas sobre la organización basándose exclusivamente en los documentos internos provistos.

## Stack

- **Framework:** Next.js 14 (App Router)
- **LLM:** Google Gemini 2.5 Flash (gratis)
- **Deploy:** Vercel
- **Lenguaje:** TypeScript

## Cómo corre localmente

### 1. Requisitos
- Node.js 18+
- Una API key de Google Gemini (gratis en [aistudio.google.com/apikey](https://aistudio.google.com/apikey))

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` y pega tu API key:

```
GEMINI_API_KEY=tu_api_key_aqui
```

### 4. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Deploy en Vercel

1. Sube el repositorio a GitHub
2. Ve a [vercel.com](https://vercel.com) → "New Project" → importa tu repo
3. En "Environment Variables" agrega:
   - `GEMINI_API_KEY` → tu API key de Gemini
4. Click en "Deploy"

Vercel detecta Next.js automáticamente. El deploy toma ~2 minutos.

## Cómo actualizar la base de conocimiento

La base de conocimiento vive en `src/lib/knowledge.ts`. Para actualizarla cuando cambia un documento:

1. Abre `src/lib/knowledge.ts`
2. Edita el contenido del string `KNOWLEDGE_BASE` con la nueva información
3. Commitea y pushea a GitHub
4. Vercel redeploya automáticamente en ~1 minuto

> **Nota:** La arquitectura usa los documentos como texto en el system prompt de Gemini. Esto es suficiente para 3 documentos de este tamaño. Si la base de conocimiento crece significativamente (10+ documentos largos), la recomendación es migrar a una arquitectura RAG con embeddings y una base de datos vectorial (Pinecone, Supabase pgvector, etc.).

## Arquitectura

```
src/
├── app/
│   ├── api/chat/route.ts   # API endpoint — recibe mensajes, llama a Gemini
│   ├── layout.tsx
│   └── page.tsx            # UI del chat
└── lib/
    └── knowledge.ts        # Base de conocimiento + system prompt
```

**Flujo:**
1. El usuario envía un mensaje desde la UI
2. La UI mantiene el historial completo de la conversación en memoria (estado React)
3. Cada mensaje envía el historial completo al endpoint `/api/chat`
4. El endpoint construye una sesión de Gemini con el historial como contexto
5. Gemini responde basándose en el system prompt (que incluye los 3 documentos)
6. La respuesta se agrega al historial en el cliente

**Memoria de conversación:** El historial se mantiene en el estado del componente React. Dentro de una sesión, el agente recuerda todo lo anterior. Al recargar la página, el historial se resetea (comportamiento esperado para un agente de onboarding).

## Credenciales necesarias

| Variable | Descripción | Dónde conseguirla |
|---|---|---|
| `GEMINI_API_KEY` | API key de Google Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

No se necesitan más credenciales. El proyecto no tiene base de datos ni autenticación.

## Gaps identificados en los documentos

Durante la construcción se identificaron las siguientes ausencias en los documentos de onboarding:

1. **Proceso de acceso a herramientas:** Los docs mencionan que en el Día 1 se obtienen accesos, pero no hay un proceso claro de a quién escribirle para solicitar cada acceso (Notion, Circle, HubSpot, etc.).

2. **Canales de comunicación interna:** No está especificado si el equipo usa grupos de WhatsApp por área, canales en Slack, o cómo está estructurada la comunicación interna día a día.

3. **Horarios y zonas horarias:** El equipo está distribuido en múltiples países. No hay información sobre zonas horarias de referencia ni horarios de disponibilidad esperados.

4. **Proceso de offboarding / fin de voluntariado:** No existe documentación sobre qué pasa cuando termina un contrato o voluntariado (entrega de accesos, documentación de trabajo, etc.).

5. **Links directos a espacios clave:** No hay URLs a los espacios de Notion, Circle o cualquier otra herramienta. Un nuevo miembro no sabe a qué URL acceder.
