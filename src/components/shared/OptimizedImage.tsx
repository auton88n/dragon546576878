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
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(priority);
    const internalRef = useRef<HTMLDivElement>(null);

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
        className={cn('relative overflow-hidden bg-muted', className)}
      >
        {/* Skeleton placeholder */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/80 to-muted animate-pulse" />
        )}
        
        {/* Actual image */}
        {isInView && (
          <img
            src={src}
            alt={alt}
            onLoad={handleLoad}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            fetchPriority={priority ? 'high' : 'auto'}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-500',
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
