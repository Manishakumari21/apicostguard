import { useEffect, useRef } from "react";

const STAR_COLORS = [
  [226, 220, 255], // ink / white
  [196, 167, 231], // iris
  [156, 207, 216], // foam
  [246, 193, 119], // gold
  [235, 187, 186], // rose
];

type Star = {
  x: number;
  y: number;
  z: number;
  size: number;
  color: number;
  twinkle: number;
  speed: number;
  px: number;
  py: number;
};

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const context: CanvasRenderingContext2D = ctx;
    const canvasEl = canvas;
    const reducedMotion =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars: Star[] = [];
    let raf = 0;
    let last = performance.now();
    let mouseX = 0;
    let mouseY = 0;
    let lightTheme = false;
    let lightCheckAt = 0;

    const FOV = 280;
    const MAX_Z = 640;
    const NEAR_Z = 0.5;
    const PARALLAX = 0.32;

    function parseInk(): [number, number, number] {
      const root = document.documentElement;
      const rgb = getComputedStyle(root)
        .getPropertyValue("--ink")
        .trim()
        .split(/\s+/)
        .map(Number);
      if (rgb.length === 3 && rgb.every((n) => !Number.isNaN(n))) {
        return [rgb[0], rgb[1], rgb[2]];
      }
      return [226, 220, 255];
    }

    let ink = parseInk();

    function isLightTheme() {
      return document.documentElement.classList.contains("theme-light");
    }

    function countStars() {
      return Math.min(Math.max(Math.floor((width * height) / 2100), 90), 330);
    }

    function makeStar(initialZ?: number): Star {
      const r = Math.sqrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const spread = Math.min(width, height) * 1.2;
      return {
        x: Math.cos(theta) * r * spread,
        y: Math.sin(theta) * r * spread,
        z: initialZ ?? Math.random() * MAX_Z,
        size: 0.8 + Math.random() * 2.6,
        color: Math.floor(Math.random() * STAR_COLORS.length),
        twinkle: Math.random() * Math.PI * 2,
        speed: 3.2 + Math.random() * 6.4,
        px: 0,
        py: 0,
      };
    }

    function resize() {
      const rect = canvasEl.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvasEl.width = Math.round(width * dpr);
      canvasEl.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = countStars();
      while (stars.length < target) stars.push(makeStar());
      stars.length = Math.min(stars.length, target);
      stars.forEach((s) => {
        s.px = projectX(s.x, s.z);
        s.py = projectY(s.y, s.z);
      });
    }

    function projectX(x: number, z: number) {
      return width / 2 + (x * FOV) / z + mouseX * (FOV / z) * PARALLAX;
    }

    function projectY(y: number, z: number) {
      return height / 2 + (y * FOV) / z + mouseY * (FOV / z) * PARALLAX;
    }

    function drawStatic() {
      context.clearRect(0, 0, width, height);
      for (const s of stars) {
        const cx = projectX(s.x, s.z);
        const cy = projectY(s.y, s.z);
        if (cx < -20 || cx > width + 20 || cy < -20 || cy > height + 20) continue;
        const depth = 1 - s.z / MAX_Z;
        const [r, g, b] = STAR_COLORS[s.color];
        const baseAlpha = lightTheme ? 0.16 : 0.3;
        context.beginPath();
        context.arc(cx, cy, s.size * (0.5 + depth), 0, Math.PI * 2);
        context.fillStyle = `rgba(${r}, ${g}, ${b}, ${baseAlpha * (0.5 + depth)})`;
        context.fill();
      }
    }

    function tick(now: number) {
      const dt = Math.min((now - last) / 16.666, 3);
      last = now;

      if (now - lightCheckAt > 1000) {
        lightCheckAt = now;
        const isLight = isLightTheme();
        if (isLight !== lightTheme) {
          lightTheme = isLight;
          ink = parseInk();
        }
      }

      context.clearRect(0, 0, width, height);

      for (const s of stars) {
        s.px = projectX(s.x, s.z);
        s.py = projectY(s.y, s.z);
        s.z -= s.speed * dt;
        if (s.z < NEAR_Z) {
          Object.assign(s, makeStar(MAX_Z + Math.random() * MAX_Z * 0.3), {
            px: projectX(s.x, s.z),
            py: projectY(s.y, s.z),
          });
        }

        const cx = projectX(s.x, s.z);
        const cy = projectY(s.y, s.z);
        if (cx < -30 || cx > width + 30 || cy < -30 || cy > height + 30) continue;

        const depth = 1 - s.z / MAX_Z;
        const size = s.size * (0.5 + depth);
        const twinkle = 0.6 + 0.4 * Math.sin(now * 0.002 + s.twinkle);
        const baseAlpha = lightTheme ? 0.14 : 0.34;
        const alpha = baseAlpha * (0.4 + depth) * twinkle;
        const [r, g, b] = STAR_COLORS[s.color];

        const dx = cx - s.px;
        const dy = cy - s.py;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          const glow = context.createLinearGradient(s.px, s.py, cx, cy);
          glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
          glow.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${alpha * 0.35})`);
          glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${alpha})`);
          context.strokeStyle = glow;
          context.lineWidth = Math.max(size * 0.9, 0.6);
          context.lineCap = "round";
          context.beginPath();
          context.moveTo(s.px, s.py);
          context.lineTo(cx, cy);
          context.stroke();
        }

        context.beginPath();
        context.arc(cx, cy, size, 0, Math.PI * 2);
        context.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        context.fill();

        if (depth > 0.6) {
          context.beginPath();
          context.arc(cx, cy, size * 2.6, 0, Math.PI * 2);
          context.fillStyle = `rgba(${ink[0]}, ${ink[1]}, ${ink[2]}, ${alpha * 0.16})`;
          context.fill();
        }
      }

      raf = requestAnimationFrame(tick);
    }

    function onPointerMove(e: PointerEvent) {
      mouseX = (e.clientX - width / 2) / (width / 2);
      mouseY = (e.clientY - height / 2) / (height / 2);
    }

    function onVisibility() {
      cancelAnimationFrame(raf);
      if (document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    resize();
    if (reducedMotion) {
      lightTheme = isLightTheme();
      ink = parseInk();
      drawStatic();
    } else {
      window.addEventListener("resize", resize);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
