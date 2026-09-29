import dotenv from 'dotenv';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),
  DEMO_AUTH_ENABLED: z.enum(['true', 'false']).default('false'),

  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  MISTRAL_API_KEY: z.string().optional(),
  MISTRAL_MODEL: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),

  ASSEMBLYAI_API_KEY: z.string().optional(),
  TRANSCRIPTION_API_KEY: z.string().optional(),

});

const parsedEnv = EnvSchema.parse(process.env);
if (parsedEnv.NODE_ENV === 'production') {
  if (!parsedEnv.JWT_SECRET) throw new Error('Missing JWT_SECRET in production');
  if (!parsedEnv.FIREBASE_PROJECT_ID || !parsedEnv.FIREBASE_CLIENT_EMAIL || !parsedEnv.FIREBASE_PRIVATE_KEY) {
    throw new Error('Firebase Admin credentials are required in production');
  }
}

export const env = {
  ...parsedEnv,
  JWT_SECRET: parsedEnv.JWT_SECRET || randomBytes(32).toString('hex'),
};

export default env;
