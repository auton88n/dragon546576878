import { useState, useRef, useEffect, useLayoutEffect, forwardRef, useCallback } from 'react';
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
    const [isInView, setIsInView] = useState(false);
    const internalRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Callback ref to check if image is already loaded when mounted
    const imgCallbackRef = useCallback((node: HTMLImageElement | null) => {
      imgRef.current = node;
      if (node?.complete && node?.naturalHeight !== 0) {
        setIsLoaded(true);
        onLoad?.();
      }
    }, [onLoad]);

    // Synchronously check if element is in viewport before first paint
    useLayoutEffect(() => {
      if (priority) {
        setIsInView(true);
        return;
      }

      if (internalRef.current) {
        const rect = internalRef.current.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight + 200;
        if (isVisible) {
          setIsInView(true);
        }
      }
    }, [priority]);

    // Backup: check if image loaded and add event listener
    useEffect(() => {
      const img = imgRef.current;
      if (!img || isLoaded || !isInView) return;

      // Check if already loaded
      if (img.complete && img.naturalHeight !== 0) {
        setIsLoaded(true);
        onLoad?.();
        return;
      }

      // Add load event listener as backup
      const handleLoad = () => {
        setIsLoaded(true);
        onLoad?.();
      };
      
      img.addEventListener('load', handleLoad);
      return () => img.removeEventListener('load', handleLoad);
    }, [isInView, isLoaded, onLoad]);

    // Fallback timeout - if image is in view but not marked loaded after 500ms, check again
    useEffect(() => {
      if (!isInView || isLoaded) return;
      
      const timeout = setTimeout(() => {
        if (imgRef.current?.complete && imgRef.current?.naturalHeight !== 0) {
          setIsLoaded(true);
          onLoad?.();
        }
      }, 500);
      
      return () => clearTimeout(timeout);
    }, [isInView, isLoaded, onLoad]);

    // IntersectionObserver for lazy loading (below-the-fold images)
    useEffect(() => {
      if (priority || isInView) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        },
        { rootMargin: '200px' }
      );

      if (internalRef.current) {
        observer.observe(internalRef.current);
      }

      return () => observer.disconnect();
    }, [priority, isInView]);

    const handleLoad = () => {
      setIsLoaded(true);
      onLoad?.();
    };

    return (
      <div 
        ref={(node) => {
          (internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
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
        {/* Placeholder - only show for non-priority images */}
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
