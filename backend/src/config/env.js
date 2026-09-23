import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '..', '.env');

// Load .env only if not already provided in process environment (e.g. Render environment variables take precedence)
dotenv.config({ path: envPath });

export const isEnvLoaded = true;
