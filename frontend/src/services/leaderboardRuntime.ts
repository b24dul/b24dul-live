// Loaded on demand (dynamic import) where leaderboards are shown or scores are saved.
import { getDatabase } from 'firebase/database';
import { firebaseApp } from './firebaseApp';
import { createLeaderboardService } from './leaderboardService';

export function startLeaderboardRuntime() {
  return createLeaderboardService(getDatabase(firebaseApp()));
}
