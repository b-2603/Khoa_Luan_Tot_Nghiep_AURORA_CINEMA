import { CSSProperties, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import './AuroraMascot3D.css';

export type Mascot3DExpression = 'happy' | 'excited' | 'curious' | 'wink' | 'love' | 'surprised' | 'focused' | 'thinking' | 'sad' | 'announce';
export type Mascot3DPose = 'idle' | 'wave' | 'point' | 'clap' | 'think' | 'heart' | 'announce' | 'bow' | 'jump' | 'spin';

export interface Mascot3DConfig {
  bodyColor?: string;
  accentColor?: string;
  cheekColor?: string;
  eyeColor?: string;
  scarfColor?: string;
  idleAnimation?: 'float' | 'bounce' | 'sway';
  enableShadow?: boolean;
  enableParticles?: boolean;
  scaleFactor?: number;
  ambientLight?: number;
}

interface Props {
  expression?: Mascot3DExpression;
  pose?: Mascot3DPose;
  talking?: boolean;
  interactive?: boolean;
  size?: number;
  className?: string;
  config?: Mascot3DConfig;
  onReady?: () => void;
  onEvent?: (type: string, data?: Record<string, unknown>) => void;
}

type MascotAssetKey = 'master' | 'wave' | 'advisor' | 'thinking' | 'intro' | 'notify' | 'thanks';

const VITE_ENV = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env;
const BASE_URL = (VITE_ENV?.BASE_URL || '/').replace(/\/?$/, '/');
const publicAsset = (path: string) => `${BASE_URL}${path.replace(/^\/+/, '')}`;

const MASCOT_ASSETS: Record<MascotAssetKey, string> = {
  master: publicAsset('assets/aurora-assistant/rig/aurora-master-v3.png'),
  wave: publicAsset('assets/aurora-assistant/aurora-wave.png'),
  advisor: publicAsset('assets/aurora-assistant/aurora-advisor.png'),
  thinking: publicAsset('assets/aurora-assistant/aurora-thinking.png'),
  intro: publicAsset('assets/aurora-assistant/aurora-intro.png'),
  notify: publicAsset('assets/aurora-assistant/aurora-notify.png'),
  thanks: publicAsset('assets/aurora-assistant/aurora-thanks.png'),
};

/** Semantic assistant actions always resolve to a connected silhouette. */
const POSE_ASSET_MAP: Record<Mascot3DPose, MascotAssetKey> = {
  idle: 'master',
  wave: 'wave',
  point: 'advisor',
  clap: 'intro',
  think: 'thinking',
  heart: 'thanks',
  announce: 'notify',
  bow: 'master',
  jump: 'wave',
  spin: 'master',
};

let preloadPromise: Promise<void> | undefined;

function preloadMascotAssets() {
  if (preloadPromise) return preloadPromise;

  preloadPromise = Promise.all(Object.values(MASCOT_ASSETS).map(source => new Promise<void>(resolve => {
    const image = new Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    image.decoding = 'async';
    image.addEventListener('error', finish, { once: true });
    image.addEventListener('load', () => {
      if (typeof image.decode !== 'function') {
        finish();
        return;
      }
      image.decode().catch(() => undefined).finally(finish);
    }, { once: true });
    image.src = source;
  }))).then(() => undefined);

  return preloadPromise;
}

type LayerState = {
  current: MascotAssetKey;
  previous: MascotAssetKey | null;
  transition: number;
};

type SpringState = {
  tiltX: number;
  tiltY: number;
  shiftX: number;
  shiftY: number;
  velocityTiltX: number;
  velocityTiltY: number;
  velocityShiftX: number;
  velocityShiftY: number;
};

const neutralSpring = (): SpringState => ({
  tiltX: 0,
  tiltY: 0,
  shiftX: 0,
  shiftY: 0,
  velocityTiltX: 0,
  velocityTiltY: 0,
  velocityShiftX: 0,
  velocityShiftY: 0,
});

function springAxis(value: number, velocity: number, target: number, delta: number, stiffness: number, damping: number) {
  const acceleration = (target - value) * stiffness - velocity * damping;
  const nextVelocity = velocity + acceleration * delta;
  return [value + nextVelocity * delta, nextVelocity] as const;
}

function resetMotionStyles(root: HTMLDivElement | null) {
  if (!root) return;
  root.style.setProperty('--tilt-x', '0deg');
  root.style.setProperty('--tilt-y', '0deg');
  root.style.setProperty('--motion-x', '0px');
  root.style.setProperty('--motion-y', '0px');
  root.style.setProperty('--idle-y', '0px');
  root.style.setProperty('--idle-r', '0deg');
  root.style.setProperty('--breath-x', '1');
  root.style.setProperty('--breath-y', '1');
  root.style.setProperty('--shadow-scale', '1');
  root.style.setProperty('--shadow-opacity', '.68');
}

export default function AuroraMascot3D({
  expression = 'happy',
  pose = 'idle',
  talking = false,
  interactive = true,
  size = 240,
  className = '',
  config,
  onReady,
  onEvent,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const springRef = useRef<SpringState>(neutralSpring());
  const phaseRef = useRef(Math.random() * Math.PI * 2);
  const talkingRef = useRef(talking);
  const readyCallbackRef = useRef(onReady);
  const [assetsReady, setAssetsReady] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(true);
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const requestedAsset = POSE_ASSET_MAP[pose];
  const [layers, setLayers] = useState<LayerState>({ current: requestedAsset, previous: null, transition: 0 });

  talkingRef.current = talking;
  readyCallbackRef.current = onReady;

  useEffect(() => {
    let disposed = false;
    preloadMascotAssets().then(() => {
      if (disposed) return;
      setAssetsReady(true);
      readyCallbackRef.current?.();
    });
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    setLayers(previous => previous.current === requestedAsset
      ? previous
      : { current: requestedAsset, previous: previous.current, transition: previous.transition + 1 });
  }, [requestedAsset]);

  useEffect(() => {
    if (!layers.previous) return;
    const transition = layers.transition;
    const timer = window.setTimeout(() => {
      setLayers(current => current.transition === transition ? { ...current, previous: null } : current);
    }, reducedMotion ? 0 : 680);
    return () => window.clearTimeout(timer);
  }, [layers.previous, layers.transition, reducedMotion]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      setIsIntersecting(entries[0]?.isIntersecting ?? true);
    }, { threshold: 0.01, rootMargin: '80px' });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  const animationActive = assetsReady && isIntersecting && pageVisible && !reducedMotion;
  const idleAnimation = config?.idleAnimation && ['float', 'bounce', 'sway'].includes(config.idleAnimation)
    ? config.idleAnimation
    : 'float';

  useEffect(() => {
    const root = rootRef.current;
    if (!animationActive) {
      springRef.current = neutralSpring();
      resetMotionStyles(root);
      return;
    }

    let frame = 0;
    let previousTime = performance.now();
    const tick = (time: number) => {
      const delta = Math.min(.05, Math.max(.001, (time - previousTime) / 1000));
      previousTime = time;
      const pointer = pointerRef.current;
      const spring = springRef.current;
      const seconds = time / 1000 + phaseRef.current;
      const idleLookX = Math.sin(seconds * .43) * .12 + Math.sin(seconds * .21 + 1.4) * .05;
      const idleLookY = Math.sin(seconds * .37 + .8) * .09;
      const lookX = pointer.active && interactive ? pointer.x : idleLookX;
      const lookY = pointer.active && interactive ? pointer.y : idleLookY;

      [spring.tiltX, spring.velocityTiltX] = springAxis(spring.tiltX, spring.velocityTiltX, -lookY * 4.2, delta, 72, 14);
      [spring.tiltY, spring.velocityTiltY] = springAxis(spring.tiltY, spring.velocityTiltY, lookX * 5.6, delta, 72, 14);
      [spring.shiftX, spring.velocityShiftX] = springAxis(spring.shiftX, spring.velocityShiftX, lookX * 2.25, delta, 66, 13);
      [spring.shiftY, spring.velocityShiftY] = springAxis(spring.shiftY, spring.velocityShiftY, lookY * 1.55, delta, 66, 13);

      let idleY = 0;
      let idleRotate = 0;
      let breath = 0;
      if (idleAnimation === 'bounce') {
        const wave = (Math.sin(seconds * 1.72) + 1) / 2;
        idleY = -(wave * wave) * 3.1;
        idleRotate = Math.sin(seconds * .86) * .34;
        breath = Math.sin(seconds * 1.72) * .7;
      } else if (idleAnimation === 'sway') {
        idleY = Math.sin(seconds * .92 + .4) * .7 - .5;
        idleRotate = Math.sin(seconds * .78) * 1.05;
        breath = Math.sin(seconds * 1.28) * .55;
      } else {
        idleY = Math.sin(seconds * 1.22) * 1.35 - 1.2;
        idleRotate = Math.sin(seconds * .63 + .5) * .42;
        breath = Math.sin(seconds * 1.22) * .62;
      }
      if (talkingRef.current) idleY += Math.sin(seconds * 8.4) * .36;

      root?.style.setProperty('--tilt-x', `${spring.tiltX.toFixed(3)}deg`);
      root?.style.setProperty('--tilt-y', `${spring.tiltY.toFixed(3)}deg`);
      root?.style.setProperty('--motion-x', `${spring.shiftX.toFixed(3)}px`);
      root?.style.setProperty('--motion-y', `${spring.shiftY.toFixed(3)}px`);
      root?.style.setProperty('--idle-y', `${idleY.toFixed(3)}px`);
      root?.style.setProperty('--idle-r', `${idleRotate.toFixed(3)}deg`);
      root?.style.setProperty('--breath-x', `${(1 - breath * .0028).toFixed(4)}`);
      root?.style.setProperty('--breath-y', `${(1 + breath * .0065).toFixed(4)}`);
      root?.style.setProperty('--shadow-scale', `${(1 - Math.abs(idleY) * .018).toFixed(3)}`);
      root?.style.setProperty('--shadow-opacity', `${Math.max(.4, .68 - Math.abs(idleY) * .055).toFixed(3)}`);
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [animationActive, idleAnimation, interactive]);

  useEffect(() => {
    if (!animationActive || expression === 'wink' || layers.current === 'thanks') {
      setBlinking(false);
      return;
    }

    let blinkTimer = 0;
    let reopenTimer = 0;
    let cancelled = false;
    const schedule = () => {
      blinkTimer = window.setTimeout(() => {
        if (cancelled) return;
        setBlinking(true);
        reopenTimer = window.setTimeout(() => {
          setBlinking(false);
          if (!cancelled) schedule();
        }, 118 + Math.round(Math.random() * 48));
      }, 2450 + Math.round(Math.random() * 3300));
    };
    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(blinkTimer);
      window.clearTimeout(reopenTimer);
    };
  }, [animationActive, expression, layers.current]);

  const style = useMemo(() => {
    const scaleFactor = Math.max(.75, Math.min(1.35, Number(config?.scaleFactor) || 1));
    const ambientLight = Math.max(.2, Math.min(1.2, Number(config?.ambientLight) || .6));
    return {
      width: size,
      height: size,
      '--mascot-size': `${size}px`,
      '--mascot-scale': String(scaleFactor),
      '--mascot-brightness': String(.86 + ambientLight * .24),
      '--fx-primary': config?.bodyColor || '#F7D25E',
      '--fx-accent': config?.accentColor || '#0F1B3D',
      '--fx-cheek': config?.cheekColor || '#FFB8C6',
      '--fx-eye': config?.eyeColor || '#1A1A3A',
      '--fx-scarf': config?.scarfColor || '#162850',
      '--tilt-x': '0deg',
      '--tilt-y': '0deg',
      '--motion-x': '0px',
      '--motion-y': '0px',
      '--idle-y': '0px',
      '--idle-r': '0deg',
      '--breath-x': '1',
      '--breath-y': '1',
      '--shadow-scale': '1',
      '--shadow-opacity': '.68',
    } as CSSProperties;
  }, [config, size]);

  const trackPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!interactive || !rootRef.current || reducedMotion) return;
    const bounds = rootRef.current.getBoundingClientRect();
    pointerRef.current.x = Math.max(-1, Math.min(1, (event.clientX - bounds.left - bounds.width / 2) / Math.max(1, bounds.width * .5)));
    pointerRef.current.y = Math.max(-1, Math.min(1, (event.clientY - bounds.top - bounds.height / 2) / Math.max(1, bounds.height * .5)));
    pointerRef.current.active = true;
  };

  const resetPointer = () => {
    pointerRef.current.x = 0;
    pointerRef.current.y = 0;
    pointerRef.current.active = false;
  };

  const classes = [
    'aurora-mascot3d-wrapper',
    `pose-${pose}`,
    `expression-${expression}`,
    `asset-${layers.current}`,
    `idle-${idleAnimation}`,
    assetsReady ? 'is-ready' : 'is-loading',
    animationActive ? 'is-animating' : 'is-paused',
    blinking && 'is-blinking',
    talking && 'is-talking',
    interactive && 'is-interactive',
    reducedMotion && 'motion-reduced',
    config?.enableShadow === false && 'no-shadow',
    config?.enableParticles === false && 'no-particles',
    className,
  ].filter(Boolean).join(' ');

  return <div
    ref={rootRef}
    className={classes}
    style={style}
    role="img"
    aria-label="Linh vật Aurora Cinema 3D"
    aria-busy={!assetsReady}
    onPointerEnter={() => { pointerRef.current.active = interactive; }}
    onPointerMove={trackPointer}
    onPointerLeave={resetPointer}
    onPointerCancel={resetPointer}
    onClick={() => onEvent?.('click', { pose, expression })}
  >
    <span className="mascot3d-ground" aria-hidden="true" />
    <span className="mascot3d-aura" aria-hidden="true" />
    <span className="mascot3d-focus-ring" aria-hidden="true" />
    <span className="mascot3d-sparkle sparkle-a" aria-hidden="true">✦</span>
    <span className="mascot3d-sparkle sparkle-b" aria-hidden="true">✦</span>
    <span className="mascot3d-sparkle sparkle-c" aria-hidden="true">✦</span>

    <div className="mascot3d-stage" aria-hidden="true">
      {layers.previous && <span
        key={`previous-${layers.previous}-${layers.transition}`}
        className={`mascot3d-silhouette previous asset-art-${layers.previous}`}
        style={{ backgroundImage: `url("${MASCOT_ASSETS[layers.previous]}")` }}
      />}
      <span
        key={`current-${layers.current}-${layers.transition}`}
        className={`mascot3d-silhouette current asset-art-${layers.current}`}
        style={{ backgroundImage: `url("${MASCOT_ASSETS[layers.current]}")` }}
      />
      <span className="mascot3d-face-overlay">
        <span className="mascot3d-blink blink-left" />
        <span className="mascot3d-blink blink-right" />
      </span>
      <span className="mascot3d-gloss" />
    </div>

    <span className="mascot3d-heart" aria-hidden="true">♥</span>
    <span className="mascot3d-question" aria-hidden="true">?</span>
    <span className="mascot3d-surprise" aria-hidden="true">!</span>
    <span className="mascot3d-tear" aria-hidden="true" />
    <span className="mascot3d-voice" aria-hidden="true"><i /><i /><i /></span>
    <span className="mascot3d-loader" aria-hidden="true" />
  </div>;
}
