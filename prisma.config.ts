import {defineConfig} from 'prisma/config';

try { process.loadEnvFile(); } catch {} // .env opsional (mis. di CI env sudah di-set)

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {path: 'prisma/migrations', seed: 'tsx prisma/seed.ts'},
  datasource: {url: process.env.DATABASE_URL!},
});
