"use client";

import { useEffect, useMemo, useRef } from "react";

type WeatherSceneFXProps = {
  condition: string;
  icon?: string;
};

type SceneMode =
  | "clear-night"
  | "clear-day"
  | "snow"
  | "rain"
  | "thunder"
  | "fog"
  | "clouds"
  | "default-night"
  | "default-day";

type Star = {
  x: number;
  y: number;
  size: number;
  phase: number;
  twinkle: number;
};

type Snowflake = {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
};

type Raindrop = {
  x: number;
  y: number;
  len: number;
  speed: number;
};

type MistBlob = {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  alpha: number;
};

type Mote = {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  alpha: number;
};

type SceneTheme = {
  tint: string;
  orbA: string;
  orbB: string;
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function resolveScene(condition: string, isNight: boolean): SceneMode {
  if (condition.includes("thunder") || condition.includes("squall") || condition.includes("tornado")) {
    return "thunder";
  }

  if (condition.includes("snow") || condition.includes("sleet")) {
    return "snow";
  }

  if (condition.includes("rain") || condition.includes("drizzle")) {
    return "rain";
  }

  if (
    condition.includes("mist") ||
    condition.includes("fog") ||
    condition.includes("haze") ||
    condition.includes("smoke") ||
    condition.includes("dust") ||
    condition.includes("sand") ||
    condition.includes("ash")
  ) {
    return "fog";
  }

  if (condition.includes("cloud")) {
    return "clouds";
  }

  if (condition.includes("clear") || condition.includes("sun")) {
    return isNight ? "clear-night" : "clear-day";
  }

  return isNight ? "default-night" : "default-day";
}

const SCENE_THEMES: Record<SceneMode, SceneTheme> = {
  "clear-night": {
    tint: "radial-gradient(120% 120% at 80% 20%, rgba(65, 108, 210, 0.18), transparent 60%)",
    orbA: "radial-gradient(circle, rgba(101, 157, 255, 0.24) 0%, rgba(101, 157, 255, 0) 68%)",
    orbB: "radial-gradient(circle, rgba(147, 110, 255, 0.16) 0%, rgba(147, 110, 255, 0) 70%)"
  },
  "clear-day": {
    tint: "radial-gradient(130% 130% at 85% 15%, rgba(255, 215, 122, 0.14), transparent 58%)",
    orbA: "radial-gradient(circle, rgba(255, 212, 138, 0.2) 0%, rgba(255, 212, 138, 0) 68%)",
    orbB: "radial-gradient(circle, rgba(125, 211, 252, 0.12) 0%, rgba(125, 211, 252, 0) 70%)"
  },
  snow: {
    tint: "radial-gradient(120% 120% at 50% 0%, rgba(188, 226, 255, 0.14), transparent 58%)",
    orbA: "radial-gradient(circle, rgba(191, 219, 254, 0.18) 0%, rgba(191, 219, 254, 0) 70%)",
    orbB: "radial-gradient(circle, rgba(148, 163, 184, 0.16) 0%, rgba(148, 163, 184, 0) 70%)"
  },
  rain: {
    tint: "radial-gradient(120% 120% at 65% 0%, rgba(125, 211, 252, 0.1), transparent 55%)",
    orbA: "radial-gradient(circle, rgba(56, 189, 248, 0.14) 0%, rgba(56, 189, 248, 0) 70%)",
    orbB: "radial-gradient(circle, rgba(30, 64, 175, 0.16) 0%, rgba(30, 64, 175, 0) 70%)"
  },
  thunder: {
    tint: "radial-gradient(120% 120% at 60% 0%, rgba(250, 204, 21, 0.08), transparent 55%)",
    orbA: "radial-gradient(circle, rgba(147, 197, 253, 0.14) 0%, rgba(147, 197, 253, 0) 70%)",
    orbB: "radial-gradient(circle, rgba(253, 224, 71, 0.12) 0%, rgba(253, 224, 71, 0) 70%)"
  },
  fog: {
    tint: "radial-gradient(120% 120% at 55% 10%, rgba(148, 163, 184, 0.16), transparent 58%)",
    orbA: "radial-gradient(circle, rgba(203, 213, 225, 0.16) 0%, rgba(203, 213, 225, 0) 70%)",
    orbB: "radial-gradient(circle, rgba(148, 163, 184, 0.16) 0%, rgba(148, 163, 184, 0) 70%)"
  },
  clouds: {
    tint: "radial-gradient(120% 120% at 58% 0%, rgba(148, 163, 184, 0.1), transparent 55%)",
    orbA: "radial-gradient(circle, rgba(147, 197, 253, 0.12) 0%, rgba(147, 197, 253, 0) 70%)",
    orbB: "radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0) 70%)"
  },
  "default-night": {
    tint: "radial-gradient(120% 120% at 70% 0%, rgba(96, 165, 250, 0.12), transparent 58%)",
    orbA: "radial-gradient(circle, rgba(96, 165, 250, 0.14) 0%, rgba(96, 165, 250, 0) 70%)",
    orbB: "radial-gradient(circle, rgba(129, 140, 248, 0.1) 0%, rgba(129, 140, 248, 0) 70%)"
  },
  "default-day": {
    tint: "radial-gradient(120% 120% at 70% 0%, rgba(125, 211, 252, 0.1), transparent 58%)",
    orbA: "radial-gradient(circle, rgba(125, 211, 252, 0.14) 0%, rgba(125, 211, 252, 0) 70%)",
    orbB: "radial-gradient(circle, rgba(251, 191, 36, 0.08) 0%, rgba(251, 191, 36, 0) 70%)"
  }
};

export function WeatherSceneFX({ condition, icon }: WeatherSceneFXProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbARef = useRef<HTMLDivElement>(null);
  const orbBRef = useRef<HTMLDivElement>(null);

  const scene = useMemo(() => {
    const normalized = condition.trim().toLowerCase();
    const isNight = (icon ?? "").toLowerCase().endsWith("n");
    return {
      mode: resolveScene(normalized, isNight),
      isNight
    };
  }, [condition, icon]);

  const theme = SCENE_THEMES[scene.mode];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!finePointer) {
      return;
    }

    let raf = 0;

    const handlePointerMove = (event: PointerEvent) => {
      if (raf) {
        window.cancelAnimationFrame(raf);
      }

      raf = window.requestAnimationFrame(() => {
        const nx = event.clientX / window.innerWidth - 0.5;
        const ny = event.clientY / window.innerHeight - 0.5;

        if (orbARef.current) {
          orbARef.current.style.transform = `translate3d(${nx * 36}px, ${ny * 28}px, 0)`;
        }

        if (orbBRef.current) {
          orbBRef.current.style.transform = `translate3d(${nx * -28}px, ${ny * -22}px, 0)`;
        }
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") {
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) {
      return;
    }

    let frame = 0;
    let width = 0;
    let height = 0;
    let flashStrength = 0;
    let reducedMotion = false;
    let densityScale = 1;

    let stars: Star[] = [];
    let flakes: Snowflake[] = [];
    let drops: Raindrop[] = [];
    let mist: MistBlob[] = [];
    let motes: Mote[] = [];

    const setupCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const area = width * height;
      reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const isSmallScreen = window.innerWidth < 768;
      densityScale = reducedMotion ? 0.15 : isSmallScreen ? 0.55 : 1;
      stars = [];
      flakes = [];
      drops = [];
      mist = [];
      motes = [];

      if (scene.mode === "clear-night" || scene.mode === "default-night") {
        const count = Math.max(
          14,
          Math.floor(Math.min(220, Math.max(90, Math.floor(area / 12000))) * densityScale)
        );
        stars = Array.from({ length: count }, () => ({
          x: rand(0, width),
          y: rand(0, height * 0.72),
          size: rand(0.5, 2.2),
          phase: rand(0, Math.PI * 2),
          twinkle: rand(0.8, 2.4)
        }));
      }

      if (scene.mode === "snow") {
        const count = Math.max(
          12,
          Math.floor(Math.min(180, Math.max(60, Math.floor(area / 18000))) * densityScale)
        );
        flakes = Array.from({ length: count }, () => ({
          x: rand(0, width),
          y: rand(-height, height),
          size: rand(1, 3.8),
          speedY: rand(0.4, 1.8),
          speedX: rand(-0.5, 0.8)
        }));
      }

      if (scene.mode === "rain" || scene.mode === "thunder") {
        const count = Math.max(
          14,
          Math.floor(Math.min(220, Math.max(80, Math.floor(area / 12000))) * densityScale)
        );
        drops = Array.from({ length: count }, () => ({
          x: rand(0, width),
          y: rand(-height, height),
          len: rand(8, 20),
          speed: rand(4.2, 8.2)
        }));
      }

      if (scene.mode === "fog" || scene.mode === "clouds") {
        const baseCount = scene.mode === "fog" ? 18 : 12;
        const count = Math.max(4, Math.floor(baseCount * densityScale));
        mist = Array.from({ length: count }, () => ({
          x: rand(-width * 0.2, width),
          y: rand(20, height * 0.8),
          w: rand(220, 460),
          h: rand(70, 170),
          speed: rand(0.08, 0.26),
          alpha: rand(0.05, 0.12)
        }));
      }

      if (scene.mode === "clear-day" || scene.mode === "default-day") {
        const count = Math.max(
          8,
          Math.floor(Math.min(120, Math.max(36, Math.floor(area / 28000))) * densityScale)
        );
        motes = Array.from({ length: count }, () => ({
          x: rand(0, width),
          y: rand(0, height),
          size: rand(1.2, 3.4),
          speedX: rand(-0.22, 0.22),
          speedY: rand(-0.08, 0.2),
          alpha: rand(0.06, 0.18)
        }));
      }
    };

    const animate = (timeMs: number) => {
      const t = timeMs * 0.001;
      ctx.clearRect(0, 0, width, height);

      if (stars.length > 0) {
        for (const star of stars) {
          const alpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * star.twinkle + star.phase));
          ctx.beginPath();
          ctx.fillStyle = `rgba(214, 235, 255, ${alpha})`;
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (flakes.length > 0) {
        ctx.fillStyle = "rgba(235, 246, 255, 0.9)";
        for (const flake of flakes) {
          flake.x += flake.speedX;
          flake.y += flake.speedY;

          if (flake.y > height + 10) {
            flake.y = -10;
            flake.x = rand(0, width);
          }

          if (flake.x < -10) {
            flake.x = width + 10;
          } else if (flake.x > width + 10) {
            flake.x = -10;
          }

          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (drops.length > 0) {
        ctx.strokeStyle = scene.mode === "thunder" ? "rgba(186, 230, 253, 0.62)" : "rgba(125, 211, 252, 0.55)";
        ctx.lineWidth = 1.2;
        for (const drop of drops) {
          drop.y += drop.speed;
          drop.x -= 0.7;

          if (drop.y > height + 20) {
            drop.y = rand(-100, -10);
            drop.x = rand(0, width + 120);
          }

          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - 2.5, drop.y + drop.len);
          ctx.stroke();
        }
      }

      if (mist.length > 0) {
        for (const cloud of mist) {
          cloud.x += cloud.speed;
          if (cloud.x - cloud.w * 0.5 > width + 90) {
            cloud.x = -cloud.w;
          }

          ctx.beginPath();
          ctx.fillStyle = `rgba(216, 226, 240, ${cloud.alpha})`;
          ctx.ellipse(cloud.x, cloud.y, cloud.w, cloud.h, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (motes.length > 0) {
        for (const mote of motes) {
          mote.x += mote.speedX;
          mote.y += mote.speedY;

          if (mote.x < -8) mote.x = width + 8;
          if (mote.x > width + 8) mote.x = -8;
          if (mote.y < -8) mote.y = height + 8;
          if (mote.y > height + 8) mote.y = -8;

          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 241, 209, ${mote.alpha})`;
          ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (scene.mode === "thunder") {
        if (!reducedMotion && Math.random() < 0.01) {
          flashStrength = 1;
        }

        flashStrength *= 0.9;

        if (flashStrength > 0.03) {
          ctx.fillStyle = `rgba(255, 255, 255, ${flashStrength * 0.22})`;
          ctx.fillRect(0, 0, width, height);
        }
      }

      frame = window.requestAnimationFrame(animate);
    };

    setupCanvas();
    frame = window.requestAnimationFrame(animate);
    window.addEventListener("resize", setupCanvas);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", setupCanvas);
    };
  }, [scene.mode]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[2] overflow-hidden">
      <div className="absolute inset-0" style={{ background: theme.tint }} />

      <div
        ref={orbARef}
        className="absolute -left-24 top-[-8rem] h-[34rem] w-[34rem] animate-pulseSoft blur-3xl"
        style={{
          background: theme.orbA,
          transition: "transform 220ms ease-out"
        }}
      />

      <div
        ref={orbBRef}
        className="absolute -right-24 bottom-[-10rem] h-[30rem] w-[30rem] animate-float blur-3xl"
        style={{
          background: theme.orbB,
          transition: "transform 260ms ease-out",
          animationDuration: "8s"
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
