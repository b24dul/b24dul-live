// Loaded on demand (dynamic import) by the viewer checklist panel only.
import { getDatabase } from 'firebase/database';
import { firebaseApp } from './firebaseApp';
import { createChecklistViewer } from './checklistService';

export function startChecklistRuntime() {
  return createChecklistViewer(getDatabase(firebaseApp()));
}
