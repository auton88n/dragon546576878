import { useState, useRef, useEffect, forwardRef } from 'react';
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
    // Check cache synchronously for initial state to avoid placeholder flash
    const [isLoaded, setIsLoaded] = useState(() => {
      if (typeof window === 'undefined') return false;
      const img = new Image();
      img.src = src;
      return img.complete && img.naturalHeight !== 0;
    });
    
    const [isInView, setIsInView] = useState(priority);
    const internalRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Double-check on mount for images that loaded during render
    useEffect(() => {
      if (imgRef.current?.complete && imgRef.current?.naturalHeight !== 0) {
        setIsLoaded(true);
        onLoad?.();
      }
    }, [src, onLoad]);

    useEffect(() => {
      if (priority) {
        setIsInView(true);
        return;
      }

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
    }, [priority]);

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
        className={cn('relative overflow-hidden bg-secondary/50', className)}
      >
        {/* Subtle heritage-colored placeholder - no animation */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary via-secondary/95 to-accent/5" />
        )}
        
        {/* Actual image with faster transition for cached images */}
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
                ? 'opacity-100 transition-opacity duration-100' 
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
