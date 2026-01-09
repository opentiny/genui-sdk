import { startServer } from '../src/start-server';
import dotenv from 'dotenv';

dotenv.config();

const baseURL = process.env.BASE_URL!;
const apiKey = process.env.API_KEY!;

startServer({
  baseURL,
  apiKey,
  port: 3100,
});
