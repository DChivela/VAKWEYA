import { useEffect, useState } from 'react';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { VirtualAssistant } from './components/VirtualAssistant';
import { catalog as localCatalog } from './data/catalog';
import { routePaths } from './data/navigation';
import {
  AboutPage,
  AccountPage,
  AdminPage,
  ContactPage,
  DestinationsPage,
  HomePage,
  HotelsPage,
  ItinerariesPage,
  MapPage,
  NotFoundPage,
  ReservationsPage,
  RestaurantsPage,
  TestimonialsPage,
  ToursPage
} from './pages/PublicPages';
import { getCatalog } from './services/api';
import './styles.css';

function normalizePath(pathname) {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  return routePaths.includes(cleanPath) ? cleanPath : pathname;
}

export default function App() {
  const [data, setData] = useState(localCatalog);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(() => normalizePath(window.location.pathname));
  const [currentSearch, setCurrentSearch] = useState(() => window.location.search);

  async function refreshCatalog() {
    const payload = await getCatalog();
    setData((current) => ({ ...current, ...payload }));
  }

  useEffect(() => {
    let cancelled = false;

    getCatalog().then((payload) => {
      if (!cancelled) {
        setData((current) => ({ ...current, ...payload }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handlePopState() {
      setCurrentPath(normalizePath(window.location.pathname));
      setCurrentSearch(window.location.search);
      setMenuOpen(false);
    }

    function handleDocumentClick(event) {
      const link = event.target.closest('a');

      if (!link || link.target || link.hasAttribute('download')) {
        return;
      }

      const url = new URL(link.href, window.location.origin);

      if (url.origin !== window.location.origin || !routePaths.includes(url.pathname)) {
        return;
      }

      event.preventDefault();
      window.history.pushState({}, '', `${url.pathname}${url.search}`);
      setCurrentPath(url.pathname);
      setCurrentSearch(url.search);
      setMenuOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleDocumentClick);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  function renderPage() {
    switch (currentPath) {
      case '/':
        return <HomePage data={data} />;
      case '/destinos':
        return <DestinationsPage data={data} />;
      case '/hoteis':
        return <HotelsPage data={data} />;
      case '/restaurantes':
        return <RestaurantsPage data={data} />;
      case '/tours':
        return <ToursPage data={data} />;
      case '/roteiros':
        return <ItinerariesPage data={data} />;
      case '/reservas':
        return <ReservationsPage data={data} currentSearch={currentSearch} />;
      case '/depoimentos':
        return <TestimonialsPage data={data} />;
      case '/sobre':
        return <AboutPage />;
      case '/contacto':
        return <ContactPage />;
      case '/conta':
        return <AccountPage />;
      case '/mapa':
        return <MapPage data={data} />;
      case '/admin':
        return <AdminPage data={data} onContentChanged={refreshCatalog} />;
      default:
        return <NotFoundPage />;
    }
  }

  return (
    <>
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} currentPath={currentPath} />
      <main>{renderPage()}</main>
      <Footer />
      <VirtualAssistant />
    </>
  );
}
