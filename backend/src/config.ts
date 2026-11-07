import 'dotenv/config';
import { z } from 'zod';
const schema = z.object({
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url().refine(value => /^postgres(ql)?:\/\//.test(value)),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
});
const result = schema.safeParse(process.env);
if (!result.success) {
  console.error('Configuración inválida. Revisa estas variables:', result.error.issues.map(issue => issue.path.join('.')).join(', '));
  process.exit(1);
}
export const config = result.data;
