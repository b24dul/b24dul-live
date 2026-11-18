import { createContext, useContext } from 'react';
import { archivedVideos, type ArchivedVideo } from '../services/videoArchive';

export type ArchiveState = {
  videos: ArchivedVideo[];
  source: 'checking' | 'published' | 'snapshot';
};
export const ArchiveContext = createContext<ArchiveState>({
  videos: archivedVideos,
  source: 'snapshot',
});
export function useVideoArchive() {
  return useContext(ArchiveContext);
}
