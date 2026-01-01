import { lazy, ComponentType } from 'react';

type LazyFactory<T extends ComponentType<unknown>> = () => Promise<{ default: T }>;

interface LazyComponentWithPreload<T extends ComponentType<unknown>> {
  Component: React.LazyExoticComponent<T>;
  preload: () => Promise<{ default: T }>;
}

/**
 * Creates a lazy-loaded component with a preload function.
 * Usage:
 *   const { Component: AboutPage, preload: preloadAbout } = lazyWithPreload(() => import('./pages/AboutPage'));
 *   // In JSX: <AboutPage />
 *   // On hover: preloadAbout()
 */
export function lazyWithPreload<T extends ComponentType<unknown>>(
  factory: LazyFactory<T>
): LazyComponentWithPreload<T> {
  let modulePromise: Promise<{ default: T }> | null = null;

  const preload = () => {
    if (!modulePromise) {
      modulePromise = factory();
    }
    return modulePromise;
  };

  const Component = lazy(() => preload());

  return { Component, preload };
}

// Export preload functions for route preloading
export const routePreloaders: Record<string, () => Promise<unknown>> = {};

export function registerPreloader(path: string, preload: () => Promise<unknown>) {
  routePreloaders[path] = preload;
}

export function preloadRoute(path: string) {
  const preloader = routePreloaders[path];
  if (preloader) {
    preloader();
  }
}
