import React, { useEffect, useRef, useState } from 'react';

interface FlickeringGridProps {
  squareSize?: number;
  gridGap?: number;
  flickerChance?: number;
  color?: string;
  maxOpacity?: number;
  className?: string;
}

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = 'rgb(59, 130, 246)', // Blue color to match our theme
  maxOpacity = 0.3,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const animationFrameRef = useRef<number>();
  const squaresRef = useRef<Float32Array>();
  const lastUpdateTimeRef = useRef<number>(0);
  
  // Convert color string to RGBA values
  const colorToRGBA = (colorStr: string) => {
    const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    // Default to blue if parsing fails
    return { r: 59, g: 130, b: 246 };
  };

  const rgbaColor = colorToRGBA(color);

  const setupCanvas = (canvas: HTMLCanvasElement, width: number, height: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Calculate grid dimensions
    const cols = Math.floor((width + gridGap) / (squareSize + gridGap));
    const rows = Math.floor((height + gridGap) / (squareSize + gridGap));
    
    // Initialize squares array with random opacities
    const squares = new Float32Array(cols * rows);
    for (let i = 0; i < squares.length; i++) {
      squares[i] = Math.random() * maxOpacity;
    }
    
    squaresRef.current = squares;
    
    return { ctx, cols, rows };
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, cols: number, rows: number) => {
    if (!squaresRef.current) return;
    
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        const opacity = squaresRef.current[index];
        
        if (opacity > 0) {
          const x = col * (squareSize + gridGap);
          const y = row * (squareSize + gridGap);
          
          ctx.fillStyle = `rgba(${rgbaColor.r}, ${rgbaColor.g}, ${rgbaColor.b}, ${opacity})`;
          ctx.fillRect(x, y, squareSize, squareSize);
        }
      }
    }
  };

  const updateSquares = () => {
    if (!squaresRef.current) return;
    
    for (let i = 0; i < squaresRef.current.length; i++) {
      if (Math.random() < flickerChance) {
        squaresRef.current[i] = Math.random() * maxOpacity;
      } else {
        // Gradually fade out more slowly
        squaresRef.current[i] *= 0.98;
        if (squaresRef.current[i] < 0.005) {
          squaresRef.current[i] = 0;
        }
      }
    }
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const result = setupCanvas(canvas, canvasSize.width, canvasSize.height);
    if (!result) return;
    
    const { ctx, cols, rows } = result;
    
    const frame = (currentTime: number) => {
      // Limit updates to ~30fps for smoother, slower animation
      if (currentTime - lastUpdateTimeRef.current >= 33) {
        updateSquares();
        drawGrid(ctx, cols, rows);
        lastUpdateTimeRef.current = currentTime;
      }
      animationFrameRef.current = requestAnimationFrame(frame);
    };
    
    frame();
  };

  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setCanvasSize({ width: offsetWidth, height: offsetHeight });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      animate();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [canvasSize, squareSize, gridGap, flickerChance, maxOpacity]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%', 
        height: '100%',
        margin: 0,
        padding: 0
      }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          margin: 0,
          padding: 0
        }}
        width={canvasSize.width}
        height={canvasSize.height}
      />
    </div>
  );
};