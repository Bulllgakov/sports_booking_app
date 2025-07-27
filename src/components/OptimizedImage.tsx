import React, { useState, useEffect, useRef } from 'react'

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  loading?: 'lazy' | 'eager'
  onMouseOver?: (e: React.MouseEvent<HTMLImageElement>) => void
  onMouseOut?: (e: React.MouseEvent<HTMLImageElement>) => void
}

export default function OptimizedImage({
  src,
  alt,
  className,
  style,
  onClick,
  loading = 'lazy',
  onMouseOver,
  onMouseOut
}: OptimizedImageProps) {
  const [isInView, setIsInView] = useState(loading === 'eager')
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (loading === 'eager' || !imgRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '50px' // Load images 50px before they enter viewport
      }
    )

    observer.observe(imgRef.current)

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current)
      }
    }
  }, [loading])

  if (hasError) {
    return (
      <div 
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--extra-light-gray)',
          color: 'var(--gray)'
        }}
        className={className}
      >
        <span>📷</span>
      </div>
    )
  }

  return (
    <img
      ref={imgRef}
      src={isInView ? src : undefined}
      alt={alt}
      className={className}
      style={style}
      onClick={onClick}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
      onError={() => setHasError(true)}
      loading={loading}
    />
  )
}