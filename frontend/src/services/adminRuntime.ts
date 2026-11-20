// Loaded on demand (dynamic import) by the admin workspace only.
import { getDatabase } from 'firebase/database';
import { firebaseApp } from './firebaseApp';
import { createAdminService } from './adminService';
import { createChatService } from './chatService';
import { createChecklistAdmin } from './checklistService';
import { createLeaderboardService } from './leaderboardService';

export function startAdminRuntime() {
  const database = getDatabase(firebaseApp());
  return {
    chat: createChatService(database),
    admin: createAdminService(database),
    leaderboards: createLeaderboardService(database),
    checklists: createChecklistAdmin(database),
  };
}

export type AdminRuntime = ReturnType<typeof startAdminRuntime>;
