// Loaded on demand (dynamic import) by the admin workspace only.
import { getDatabase } from 'firebase/database';
import { firebaseApp } from './firebaseApp';
import { createAdminService } from './adminService';
import { createChatService } from './chatService';

export function startAdminRuntime() {
  const database = getDatabase(firebaseApp());
  return { chat: createChatService(database), admin: createAdminService(database) };
}

export type AdminRuntime = ReturnType<typeof startAdminRuntime>;
