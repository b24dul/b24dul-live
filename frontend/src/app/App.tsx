import { Route, Routes } from 'react-router-dom';
import { AppShell } from './AppShell';
import { PreferencesProvider } from '../contexts/PreferencesContext';
import { VideoArchiveProvider } from '../contexts/VideoArchiveContext';
import { ErrorBoundary } from './ErrorBoundary';
import { HomePage } from './HomePage';
import { DestinationPage, ExplorePage, NotFoundPage } from './RoutePages';
import { routes } from './navigation';

export function App() {
  return (
    <ErrorBoundary>
      <PreferencesProvider>
        <VideoArchiveProvider>
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
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AppShell>
        </VideoArchiveProvider>
      </PreferencesProvider>
    </ErrorBoundary>
  );
}
