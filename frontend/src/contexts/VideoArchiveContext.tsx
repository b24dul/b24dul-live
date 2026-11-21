import { useEffect, useState, type PropsWithChildren } from 'react';
import { archivedVideos, fetchPublishedArchive } from '../services/videoArchive';
import { ArchiveContext, type ArchiveState } from './videoArchiveState';

/** One read-only request per mounted app; keep the bundled archive if it fails. */
export function VideoArchiveProvider({ children }: PropsWithChildren) {
  const [archive, setArchive] = useState<ArchiveState>({
    videos: archivedVideos,
    source: 'checking',
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 7000);
    fetchPublishedArchive(controller.signal)
      .then((videos) => {
        if (active) setArchive({ videos, source: 'published' });
      })
      .catch(() => {
        if (active) setArchive({ videos: archivedVideos, source: 'snapshot' });
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return <ArchiveContext.Provider value={archive}>{children}</ArchiveContext.Provider>;
}
