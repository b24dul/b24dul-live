import { Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { PreferencesProvider } from '../contexts/PreferencesContext';
import { VideoArchiveProvider } from '../contexts/VideoArchiveContext';
import { ErrorBoundary } from './ErrorBoundary';
import { HomePage } from './HomePage';
import { DestinationPage, ExplorePage, NotFoundPage } from './RoutePages';
import { routes } from './navigation';
import { PrivacyNotice } from '../features/privacy/PrivacyNotice';
import { VideoPlayerProvider } from '../features/videos/VideoPlayer';

export function App() {
  return (
    <ErrorBoundary>
      <PreferencesProvider>
        <VideoArchiveProvider>
          <VideoPlayerProvider>
            <AppShell>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                {routes
                  .filter((route) => route.path !== '/' && route.path !== '/explore')
                  .map((route) => (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={<DestinationPage path={route.path} />}
                    />
                  ))}
                <Route path="/privacy" element={<PrivacyNotice />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </AppShell>
          </VideoPlayerProvider>
        </VideoArchiveProvider>
      </PreferencesProvider>
    </ErrorBoundary>
  );
}
