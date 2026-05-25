import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface GlowEffectProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string; // Custom RGBA color for the glow
  tiltSpeed?: number; // Angle multiplier for 3D tilt (0 to disable)
  glowSize?: number;  // Radius of the spotlight in px
  bloomOnClick?: boolean; // Flash bright on click
  scaleOnHover?: boolean; // Scale up slightly on hover
  borderRadius?: string; // Border-radius helper (default to inherit/none)
  isAlwaysActive?: boolean; // Glow animates gently even without mouse
  key?: React.Key;
}

export function GlowEffect({
  children,
  className,
  glowColor = 'rgba(52, 211, 153, 0.2)', // Emerald tint by default (matches mint primary theme)
  tiltSpeed = 4, // 3D tilt level
  glowSize = 120,
  bloomOnClick = true,
  scaleOnHover = true,
  borderRadius = '24px',
  isAlwaysActive = false,
}: GlowEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCoords({ x, y });

    if (tiltSpeed > 0) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      // Calculate angular displacement from center (-1 to 1)
      const displaceX = (x - centerX) / centerX;
      const displaceY = (y - centerY) / centerY;
      
      // rotateX is driven by vert displacement (Y), rotateY driven by horiz (X)
      setTilt({
        x: -displaceY * tiltSpeed,
        y: displaceX * tiltSpeed,
      });
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const handleMouseDown = () => {
    if (bloomOnClick) {
      setIsClicked(true);
    }
  };

  const handleMouseUp = () => {
    setIsClicked(false);
  };

  // If clicked inside but user releases mouse outside
  useEffect(() => {
    if (!isClicked) return;
    const handleGlobalMouseUp = () => {
      setIsClicked(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isClicked]);

  // Handle ambient animation coordinates when not hovered
  useEffect(() => {
    if (isHovered || !isAlwaysActive || !containerRef.current) return;

    let animFrame: number;
    let startTime = Date.now();

    const animateAmbientGlow = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const elapsed = (Date.now() - startTime) / 1000; // in seconds

      // Circular motion in the center
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const radius = Math.min(rect.width, rect.height) * 0.25;

      const animatedX = centerX + Math.cos(elapsed * 1.5) * radius;
      const animatedY = centerY + Math.sin(elapsed * 1.5) * radius;

      setCoords({ x: animatedX, y: animatedY });
      animFrame = requestAnimationFrame(animateAmbientGlow);
    };

    animFrame = requestAnimationFrame(animateAmbientGlow);
    return () => cancelAnimationFrame(animFrame);
  }, [isHovered, isAlwaysActive]);

  // CSS transform styles
  const transformStyle = isHovered && tiltSpeed > 0
    ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(${scaleOnHover ? 1.02 : 1}, ${scaleOnHover ? 1.02 : 1}, 1.02)`
    : `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={cn(
        "relative transition-all duration-500 ease-out select-none",
        isClicked ? "scale-[0.97]" : "",
        className
      )}
      style={{
        transform: transformStyle,
        borderRadius: borderRadius,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Dynamic Glow Layer */}
      <div
        className={cn(
          "absolute pointer-events-none inset-0 z-30 transition-opacity duration-500 rounded-inherit mix-blend-screen",
          isHovered || isAlwaysActive ? "opacity-100" : "opacity-0"
        )}
        style={{
          borderRadius: borderRadius,
          background: `radial-gradient(${glowSize}px circle at ${coords.x}px ${coords.y}px, ${glowColor}, transparent 80%)`,
        }}
      />

      {/* Futuristic SPECULAR specular shiny gloss coating effect */}
      <div
        className={cn(
          "absolute pointer-events-none inset-0 z-20 transition-opacity duration-300 rounded-inherit mix-blend-overlay",
          isHovered ? "opacity-40" : "opacity-0"
        )}
        style={{
          borderRadius: borderRadius,
          background: `radial-gradient(${glowSize * 1.5}px circle at ${coords.x}px ${coords.y}px, rgba(255, 255, 255, 0.15), transparent 70%)`,
        }}
      />

      {/* Color Blooming Effect during click (shockwave glow burst) */}
      <div
        className={cn(
          "absolute pointer-events-none inset-0 z-40 rounded-inherit transition-all duration-500 mix-blend-color-dodge",
          isClicked ? "opacity-100 scale-100" : "opacity-0 scale-95"
        )}
        style={{
          borderRadius: borderRadius,
          background: `radial-gradient(180px circle at ${coords.x}px ${coords.y}px, rgba(52, 211, 153, 0.45), transparent 85%)`,
          boxShadow: '0 0 25px rgba(52, 211, 153, 0.25)',
        }}
      />

      {/* Internal Content (Rendered inside perspective, can push down z-index) */}
      <div className="relative z-10 w-full h-full" style={{ transform: 'translateZ(10px)' }}>
        {children}
      </div>
    </div>
  );
}
