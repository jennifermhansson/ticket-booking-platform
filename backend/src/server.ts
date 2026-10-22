import { buildApp } from './app'

const port = Number(process.env.PORT ?? 3000)
const host = process.env.HOST ?? '0.0.0.0'

const server = buildApp()

async function start() {
  await server.listen({
    host,
    port,
  });

  console.log(`Server is listening at ${port}`);
}

start();
