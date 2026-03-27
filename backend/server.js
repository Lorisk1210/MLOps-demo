import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

import { createApp } from './app.js';
import { resolveModel } from './chat-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = createApp();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Using model: ${resolveModel(process.env)}`);
});
