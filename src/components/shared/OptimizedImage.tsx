import { useState, useRef, useEffect, useLayoutEffect, forwardRef } from 'react';
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

    // Synchronously check if element is in viewport before first paint
    useLayoutEffect(() => {
      if (priority) {
        setIsInView(true);
        return;
      }

      // Synchronous check for above-the-fold images
      if (internalRef.current) {
        const rect = internalRef.current.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight + 200;
        if (isVisible) {
          setIsInView(true);
          return;
        }
      }
    }, [priority]);

    // Check if image is already cached
    useLayoutEffect(() => {
      if (!isInView) return;
      
      // Check if image is already in browser cache
      const img = new Image();
      img.src = src;
      if (img.complete && img.naturalHeight !== 0) {
        setIsLoaded(true);
        onLoad?.();
      }
    }, [src, isInView, onLoad]);

    // Double-check on mount for images that loaded during render
    useEffect(() => {
      if (imgRef.current?.complete && imgRef.current?.naturalHeight !== 0) {
        setIsLoaded(true);
        onLoad?.();
      }
    }, [src, onLoad]);

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
          !isLoaded && 'bg-secondary/50',
          className
        )}
      >
        {/* Placeholder - only show when actively loading (in view but not loaded) */}
        {isInView && !isLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary/95 to-accent/5" />
        )}
        
        {/* Actual image */}
        {isInView && (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            onLoad={handleLoad}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            fetchPriority={priority ? 'high' : 'auto'}
            className={cn(
              'w-full h-full object-cover',
              isLoaded 
                ? 'opacity-100' 
                : 'opacity-0'
            )}
          />
        )}
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;
