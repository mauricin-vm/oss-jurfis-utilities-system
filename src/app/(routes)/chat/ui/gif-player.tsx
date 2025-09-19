'use client'

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface GifPlayerProps {
  src: string;
  alt?: string;
  className?: string;
  onModalOpen: () => void;
}

export function GifPlayer({ src, alt = 'GIF', className, onModalOpen }: GifPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play();

      // Assumir que um GIF típico dura cerca de 2-3 segundos
      // 5 loops = 5 * 2.5 segundos = 12.5 segundos
      const loopDuration = 12500; // 12.5 segundos em milliseconds

      timeoutRef.current = setTimeout(() => {
        video.pause();
        setIsPlaying(false);
        setShowPlayButton(true);
      }, loopDuration);
    } else {
      video.pause();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isPlaying]);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(true);
    setShowPlayButton(false);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Se clicou no círculo GIF, não fazer nada (deixar o handlePlayClick lidar)
    if (target.closest('.gif-play-button')) {
      return;
    }

    // Se está tocando ou se clicou fora do círculo, abrir modal
    onModalOpen();
  };

  return (
    <div
      className={cn('relative', className)}
      onClick={handleContainerClick}
    >
      <video
        ref={videoRef}
        src={src}
        className={cn(
          'w-full h-full max-h-[360px] object-cover rounded-lg transition-all duration-200',
          showPlayButton && 'brightness-75'
        )}
        loop
        muted
        playsInline
      />

      {/* Círculo com botão GIF */}
      {showPlayButton && (
        <div
          className="gif-play-button absolute inset-0 flex items-center justify-center z-10"
          onClick={handlePlayClick}
        >
          <div className="bg-black/20 rounded-full w-20 h-20 flex items-center justify-center cursor-pointer transition-colors shadow-lg">
            <span className="text-white font-bold text-base tracking-wider">GIF</span>
          </div>
        </div>
      )}
    </div>
  );
}