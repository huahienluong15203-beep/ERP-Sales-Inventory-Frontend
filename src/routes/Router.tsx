import React, { createContext, useContext, useState, useEffect, Children, isValidElement } from 'react';
import type { ReactNode } from 'react';

interface RouterContextType {
  pathname: string;
  navigate: (to: string | number, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextType>({
  pathname: window.location.pathname || '/',
  navigate: () => {}
});

export const BrowserRouter: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pathname, setPathname] = useState<string>(() => {
    // Hỗ trợ cả trường hợp hash router nếu dev server không cấu hình rewrite
    if (window.location.hash.startsWith('#/')) {
      return window.location.hash.slice(1);
    }
    return window.location.pathname || '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.hash.startsWith('#/')) {
        setPathname(window.location.hash.slice(1));
      } else {
        setPathname(window.location.pathname || '/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigate = (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === 'number') {
      window.history.go(to);
      return;
    }

    const cleanTo = to.startsWith('/') ? to : '/' + to;
    if (options?.replace) {
      window.history.replaceState({}, '', cleanTo);
    } else {
      window.history.pushState({}, '', cleanTo);
    }
    setPathname(cleanTo);
    window.scrollTo(0, 0);
  };

  return (
    <RouterContext.Provider value={{ pathname, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useLocation = () => {
  const { pathname } = useContext(RouterContext);
  return { pathname };
};

export const useNavigate = () => {
  const { navigate } = useContext(RouterContext);
  return navigate;
};

export interface RouteProps {
  path?: string;
  element: ReactNode;
}

export const Route: React.FC<RouteProps> = () => {
  return null;
};

export interface RoutesProps {
  children: ReactNode;
}

/**
 * Component đối soát đường dẫn URL và render element tương ứng
 */
export const Routes: React.FC<RoutesProps> = ({ children }) => {
  const { pathname } = useContext(RouterContext);

  const cleanCurrentPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';

  let matchElement: ReactNode = null;
  let fallbackElement: ReactNode = null;

  Children.forEach(children, (child) => {
    if (!isValidElement<RouteProps>(child)) return;

    const { path, element } = child.props;

    if (path === '*') {
      fallbackElement = element;
      return;
    }

    if (!path) {
      // Route không path (như Layout Route)
      return;
    }

    const cleanRoutePath = path.replace(/\/+$/, '') || '/';

    // Khớp chính xác
    if (cleanRoutePath === cleanCurrentPath) {
      matchElement = element;
    }
  });

  if (matchElement) {
    return <>{matchElement}</>;
  }

  if (fallbackElement) {
    return <>{fallbackElement}</>;
  }

  return null;
};

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  replace?: boolean;
}

export const Link: React.FC<LinkProps> = ({ to, replace, children, onClick, ...rest }) => {
  const { navigate } = useContext(RouterContext);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onClick) onClick(e);
    navigate(to, { replace });
  };

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
};

export interface NavigateProps {
  to: string;
  replace?: boolean;
}

export const Navigate: React.FC<NavigateProps> = ({ to, replace }) => {
  const { navigate } = useContext(RouterContext);

  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, to, replace]);

  return null;
};
