import { createApp } from '../server/dist/app.js';
import { createStorageRepository } from '../server/dist/storage/index.js';

let appInstance = null;

export default async function handler(req, res) {
  if (!appInstance) {
    const repository = await createStorageRepository();
    appInstance = createApp(repository);
  }
  return appInstance(req, res);
}
