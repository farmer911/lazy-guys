import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const srcEnvPath = path.resolve(import.meta.dirname, '../../../../.env');
const distEnvPath = path.resolve(import.meta.dirname, '../../../../../../../.env');

dotenv.config({
  path: fs.existsSync(srcEnvPath) ? srcEnvPath : distEnvPath,
  quiet: true,
});

export const env = {
  port: Number(process.env.PORT || 4000),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://lazyguy:lazyguy_secret@localhost:5432/lazy_guy_portfolio',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
