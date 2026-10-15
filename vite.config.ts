import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Dev only: serve api/*.ts the way Vercel does, so `npm run dev` works without `vercel dev`.
function apiRoutes(): Plugin {
  return {
    name: 'api-routes',
    configureServer(server) {
      Object.assign(process.env, loadEnv('development', process.cwd(), 'N8N_'))
      server.middlewares.use(async (req, res, next) => {
        const route = req.url?.match(/^\/api\/(\w+)/)?.[1]
        if (!route) return next()
        try {
          const handler = (await server.ssrLoadModule(`/api/${route}.ts`))[req.method ?? 'GET']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            return res.end()
          }
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk)
          const response: Response = await handler(
            new Request(`http://localhost${req.url}`, { method: req.method, body: chunks.length ? Buffer.concat(chunks) : undefined }),
          )
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apiRoutes()],
})
