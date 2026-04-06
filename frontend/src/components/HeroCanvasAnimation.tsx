import { useEffect, useRef, useState } from 'react';
import { useTransform, useSpring, MotionValue } from 'framer-motion';

const TOTAL_FRAMES = 40;

interface Props {
  scrollYProgress: MotionValue<number>;
}

export default function HeroCanvasAnimation({ scrollYProgress }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(0);

  // Smooth scroll progress
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const frameIndex = useTransform(smoothProgress, [0, 1], [0, TOTAL_FRAMES - 1]);

  useEffect(() => {
    const loadedImages: HTMLImageElement[] = [];
    let loadedCount = 0;

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = `/frames/frame_${i}.jpg`;
      img.onload = () => {
        loadedCount++;
        setLoaded(loadedCount);
      };
      loadedImages.push(img);
    }
    setImages(loadedImages);
  }, []);

  useEffect(() => {
    if (images.length === 0 || loaded < TOTAL_FRAMES) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let animationFrameId: number;

    const render = () => {
      const currentFrameIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(frameIndex.get())));
      const img = images[currentFrameIndex];
      
      if (img) {
        if (canvas.width !== img.width || canvas.height !== img.height) {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        
        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
      }
      
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [images, loaded, frameIndex]);



  return (
    <div className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden">
      {loaded < TOTAL_FRAMES && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-fintech-navy)] z-10">
          <div className="text-center w-full max-w-xs px-6">
            <p className="text-[var(--color-secondary)] mb-4 text-sm font-medium tracking-wide">Loading ATM Experience...</p>
            <div className="w-full h-1.5 bg-[var(--color-atm-reflection)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--color-success)] transition-all duration-300 shadow-[0_0_10px_var(--color-success)]"
                style={{ width: `${(loaded / TOTAL_FRAMES) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover object-left -scale-x-100"
      />
    </div>
  );
}
