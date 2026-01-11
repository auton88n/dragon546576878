import { lazy, ComponentType, forwardRef, createElement } from 'react';

type LazyFactory<T extends ComponentType<any>> = () => Promise<{ default: T }>;

interface LazyComponentWithPreload<T extends ComponentType<any>> {
  Component: React.ForwardRefExoticComponent<any>;
  preload: () => Promise<{ default: T }>;
}

/**
 * Creates a lazy-loaded component with a preload function.
 * Wraps the lazy component in forwardRef to avoid React ref warnings.
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  factory: LazyFactory<T>
): LazyComponentWithPreload<T> {
  let modulePromise: Promise<{ default: T }> | null = null;

  const retryImport = async (retries = 3, delay = 1000): Promise<{ default: T }> => {
    for (let i = 0; i < retries; i++) {
      try {
        return await factory();
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error('Module import failed after retries');
  };

  const preload = () => {
    if (!modulePromise) {
      modulePromise = retryImport().catch((err) => {
        // If the import fails (e.g., transient SW/cache/network issue), allow retry.
        modulePromise = null;
        throw err;
      });
    }
    return modulePromise;
  };

  const LazyComponent = lazy(() => preload());

  // Wrap in forwardRef to suppress ref warnings
  const Component = forwardRef<unknown, Record<string, unknown>>(function LazyWrapper(props, _ref) {
    return createElement(LazyComponent as any, props as any);
  });
  Component.displayName = 'LazyWithPreload';

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
