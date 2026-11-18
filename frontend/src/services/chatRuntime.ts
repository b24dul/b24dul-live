// Loaded on demand (dynamic import) so the database client is only fetched where chat is shown.
import { getDatabase } from 'firebase/database';
import { firebaseApp } from './firebaseApp';
import { createChatService } from './chatService';

export function startChatRuntime() {
  return createChatService(getDatabase(firebaseApp()));
}
