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

  const preload = () => {
    if (!modulePromise) {
      modulePromise = factory();
    }
    return modulePromise;
  };

  const LazyComponent = lazy(() => preload());

  // Wrap in forwardRef to suppress ref warnings
  const Component = forwardRef(function LazyWrapper(props, _ref) {
    return createElement(LazyComponent, props);
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
