import { useState, useRef, useEffect, forwardRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  onLoad?: () => void;
}

const OptimizedImage = forwardRef<HTMLDivElement, OptimizedImageProps>(
  ({ src, alt, className = '', priority = false, onLoad }, forwardedRef) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(priority);
    const containerRef = useRef<HTMLDivElement>(null);

    // Single effect for viewport detection and lazy loading
    useEffect(() => {
      if (priority || isInView) return;

      const el = containerRef.current;
      if (!el) return;

      // Check if already in viewport
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight + 200) {
        setIsInView(true);
        return;
      }

      // Set up IntersectionObserver for below-fold images
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        { rootMargin: '200px' }
      );

      observer.observe(el);
      return () => observer.disconnect();
    }, [priority, isInView]);

    const handleLoad = useCallback(() => {
      setIsLoaded(true);
      onLoad?.();
    }, [onLoad]);

    // Callback ref to check if image is already loaded when mounted
    const imgCallbackRef = useCallback((node: HTMLImageElement | null) => {
      if (node?.complete && node?.naturalHeight !== 0) {
        setIsLoaded(true);
        onLoad?.();
      }
    }, [onLoad]);

    return (
      <div 
        ref={(node) => {
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          if (typeof forwardedRef === 'function') {
            forwardedRef(node);
          } else if (forwardedRef) {
            forwardedRef.current = node;
          }
        }} 
        className={cn(
          'relative overflow-hidden',
          className
        )}
      >
        {/* Placeholder - only show for non-priority images not yet loaded */}
        {isInView && !isLoaded && !priority && (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary/95 to-accent/5" />
        )}
        
        {/* Actual image */}
        {isInView && (
          <img
            ref={imgCallbackRef}
            src={src}
            alt={alt}
            onLoad={handleLoad}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            {...{ fetchpriority: priority ? 'high' : 'auto' } as React.ImgHTMLAttributes<HTMLImageElement>}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
