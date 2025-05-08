// Canvas and context variables
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let w: number;
let h: number;

// Internal time counter
let time = 0;
let isRunning = false;

// Particle data structure
interface Particle {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  offset: number;
  amp: number;
}

// Default options (will be merged with user options)
const defaultOpts: Required<ParticleOptions> = {
  count: 100,
  color: 'rgba(99,176,196,0.15)',
  speedYMin: 0.1,
  speedYMax: 0.4,
  radiusMin: 1,
  radiusMax: 3,
  ampMin: 5,
  ampMax: 15,
};

let opts: Required<ParticleOptions> = { ...defaultOpts };
let particles: Particle[] = [];
let animationId: number | null = null;

/**
 * Initialize canvas and create initial particles
 */
export function startParticles() {
    if (isRunning) return;
    isRunning = true;
  
    if (!canvas) {
      canvas = document.getElementById('particles') as HTMLCanvasElement;
      ctx    = canvas.getContext('2d')!;
      window.addEventListener('resize', resizeCanvas);
    }
  
    resizeCanvas();
  
    canvas.style.display = 'block';
  
    configureParticles(opts);
    animateFrame();
  }
  
  export function stopParticles() {
    if (!isRunning) return;
    isRunning = false;
  
    // Stop animation
    if (animationId != null) cancelAnimationFrame(animationId);
  
    ctx.clearRect(0, 0, w, h);
    canvas.style.display = 'none';
  
    animationId = null;
  }  
/**
 * Configure particle system with user options
 */
export function configureParticles(userOpts: ParticleOptions) {
  opts = { ...defaultOpts, ...userOpts };
  particles = [];

  for (let i = 0; i < opts.count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      radius: Math.random() * (opts.radiusMax - opts.radiusMin) + opts.radiusMin,
      speedY: Math.random() * (opts.speedYMax - opts.speedYMin) + opts.speedYMin,
      offset: Math.random() * 1000,
      amp: Math.random() * (opts.ampMax - opts.ampMin) + opts.ampMin,
    });
  }
}

/**
 * Resize canvas to fill window
 */
function resizeCanvas() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
}

/**
 * Animation loop
 */
function animateFrame() {
  ctx.clearRect(0, 0, w, h);
  time += 0.01;

  // Use configured color
  ctx.fillStyle = opts.color;

  particles.forEach(p => {
    p.y -= p.speedY;

    let xOffset = Math.sin(time + p.offset) * p.amp;
    let x = p.x + xOffset;

    if (p.y + p.radius < 0) {
        p.y = h + Math.random() * 20;
        p.x = Math.random() * w;
    }

    ctx.beginPath();
    ctx.arc(x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
});

  animationId = requestAnimationFrame(animateFrame);
}

export function isParticlesRunning(): boolean {
    return isRunning;
}