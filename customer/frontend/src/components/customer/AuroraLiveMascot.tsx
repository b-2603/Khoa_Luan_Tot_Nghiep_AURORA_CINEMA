import { CSSProperties, useEffect, useRef, useState } from 'react';
import './AuroraLiveMascot.css';

export type AuroraExpression = 'happy' | 'curious' | 'excited' | 'wink' | 'love' | 'surprised' | 'focused';
export type AuroraBehavior = 'wave' | 'point' | 'think' | 'clap' | 'announce' | 'heart';

type Props = {
  expression?: AuroraExpression;
  behavior?: AuroraBehavior;
  talking?: boolean;
  interactive?: boolean;
  className?: string;
  label?: string;
};

const ASSET_ROOT = '/assets/aurora-assistant/rig';
const MASTER_ASSET = `${ASSET_ROOT}/aurora-reference-front-crop.png`;

export default function AuroraLiveMascot({ expression = 'happy', behavior = 'wave', talking = false, interactive = false, className = '', label = 'Aurora Cinema' }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const motion = useRef({ x: 0, y: 0, vx: 0, vy: 0, targetX: 0, targetY: 0 });
  const behaviorRef = useRef(behavior);
  const expressionRef = useRef(expression);
  const talkingRef = useRef(talking);
  const phaseRef = useRef(Math.random() * Math.PI * 2);
  const [blinking, setBlinking] = useState(false);
  const [autoExpression, setAutoExpression] = useState<AuroraExpression>(expression);
  const [autoBehavior, setAutoBehavior] = useState<AuroraBehavior>(behavior);
  const activeExpression = autoExpression;
  const activeBehavior = autoBehavior;

  behaviorRef.current = activeBehavior;
  expressionRef.current = activeExpression;
  talkingRef.current = talking;

  useEffect(() => {
    setAutoExpression(expression);
    setAutoBehavior(behavior);
    motion.current.targetX = 0;
    motion.current.targetY = 0;
  }, [expression, behavior]);

  useEffect(() => {
    const expressions: AuroraExpression[] = ['happy', 'curious', 'excited', 'love', 'surprised', 'focused'];
    const behaviors: AuroraBehavior[] = ['wave', 'announce', 'think', 'heart', 'clap', 'point'];
    let expressionIndex = Math.max(0, expressions.indexOf(expression));
    let behaviorIndex = Math.max(0, behaviors.indexOf(behavior));
    const timer = window.setInterval(() => {
      expressionIndex = (expressionIndex + 1) % expressions.length;
      behaviorIndex = (behaviorIndex + 1) % behaviors.length;
      setAutoExpression(expressions[expressionIndex]);
      setAutoBehavior(behaviors[behaviorIndex]);
    }, 6800);
    return () => window.clearInterval(timer);
  }, [expression, behavior]);

  useEffect(() => {
    let cancelled = false;
    let blinkTimer = 0;
    let reopenTimer = 0;
    const schedule = () => {
      blinkTimer = window.setTimeout(() => {
        if (cancelled) return;
        setBlinking(true);
        reopenTimer = window.setTimeout(() => {
          setBlinking(false);
          if (!cancelled) schedule();
        }, 115 + Math.round(Math.random() * 55));
      }, 2400 + Math.round(Math.random() * 3500));
    };
    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(blinkTimer);
      window.clearTimeout(reopenTimer);
    };
  }, [activeExpression]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const root = rootRef.current;
      const state = motion.current;
      const elapsed = Math.min(2, (now - last) / 16.667);
      last = now;
      const spring = 0.075 * elapsed;
      const damping = Math.pow(0.76, elapsed);
      state.vx = (state.vx + (state.targetX - state.x) * spring) * damping;
      state.vy = (state.vy + (state.targetY - state.y) * spring) * damping;
      state.x += state.vx;
      state.y += state.vy;
      const time = now / 1000 + phaseRef.current;
      const pulse = (Math.sin(time * 3.15) + 1) / 2;
      const softPulse = pulse * pulse * (3 - 2 * pulse);
      let leftArm = 0, rightArm = 0, leftX = 0, leftY = 0, rightX = 0, rightY = 0, actionHead = 0;
      if (behaviorRef.current === 'wave') rightArm = -6 + Math.sin(time * 5.2) * 8.5;
      if (behaviorRef.current === 'point') { rightArm = -7 + Math.sin(time * 1.55) * 1.2; rightX = 2; rightY = -2; }
      if (behaviorRef.current === 'think') { leftArm = -21 + Math.sin(time * 1.4) * 1.8; leftX = 17; leftY = -19; actionHead = -3.2; }
      if (behaviorRef.current === 'clap') { leftArm = -22 * softPulse; rightArm = 20 * softPulse; leftX = 20 * softPulse; leftY = -5 * softPulse; rightX = -20 * softPulse; rightY = 8 * softPulse; }
      if (behaviorRef.current === 'announce') { rightArm = -5 + Math.sin(time * 2.1) * 2.2; actionHead = Math.sin(time * 1.8) * 1.2; }
      if (behaviorRef.current === 'heart') { leftArm = -16 * softPulse; rightArm = 17 * softPulse; leftX = 13 * softPulse; leftY = -5 * softPulse; rightX = -14 * softPulse; rightY = 7 * softPulse; }
      const expressionHead = expressionRef.current === 'curious' ? -3.5 : 0;
      const surpriseLift = expressionRef.current === 'surprised' ? -Math.max(0, Math.sin(time * 1.9)) * 2.2 : 0;
      const idleWeight = Math.sin(time * .62) * .55 + Math.sin(time * 1.17 + .8) * .18;
      const bodyY = -1.7 - Math.sin(time * 1.45) * 1.55 + surpriseLift;
      const bodyRotate = idleWeight + Math.sin(time * .9 + 1.2) * .14;
      const breath = 1 + Math.sin(time * 1.45) * .014 + Math.sin(time * .72) * .003;
      const mouthOpen = talkingRef.current ? .78 + (Math.sin(time * 12.5) + 1) * .16 : 1;
      root?.style.setProperty('--look-x', `${state.x.toFixed(2)}px`);
      root?.style.setProperty('--look-y', `${state.y.toFixed(2)}px`);
      root?.style.setProperty('--head-turn', `${(state.x * 0.62 + actionHead + expressionHead).toFixed(2)}deg`);
      root?.style.setProperty('--body-y', `${bodyY.toFixed(2)}px`);
      root?.style.setProperty('--body-r', `${bodyRotate.toFixed(2)}deg`);
      root?.style.setProperty('--breath-x', `${(2 - breath).toFixed(4)}`);
      root?.style.setProperty('--breath-y', `${breath.toFixed(4)}`);
      root?.style.setProperty('--arm-left-r', `${leftArm.toFixed(2)}deg`);
      root?.style.setProperty('--arm-right-r', `${rightArm.toFixed(2)}deg`);
      root?.style.setProperty('--arm-left-x', `${leftX.toFixed(2)}%`);
      root?.style.setProperty('--arm-left-y', `${leftY.toFixed(2)}%`);
      root?.style.setProperty('--arm-right-x', `${rightX.toFixed(2)}%`);
      root?.style.setProperty('--arm-right-y', `${rightY.toFixed(2)}%`);
      root?.style.setProperty('--scarf-left-r', `${(Math.sin(time * 1.15 - .7) * 2.3 - bodyRotate).toFixed(2)}deg`);
      root?.style.setProperty('--scarf-right-r', `${(Math.sin(time * 1.08 + .9) * 2.1 - bodyRotate).toFixed(2)}deg`);
      root?.style.setProperty('--mouth-y', mouthOpen.toFixed(3));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!interactive) return;
    const onPointerMove = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      motion.current.targetX = Math.max(-3.5, Math.min(3.5, (event.clientX - rect.left - rect.width / 2) / 75));
      motion.current.targetY = Math.max(-2.7, Math.min(2.7, (event.clientY - rect.top - rect.height / 2) / 80));
    };
    const reset = () => {
      motion.current.targetX = 0;
      motion.current.targetY = 0;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', reset);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', reset);
      window.removeEventListener('blur', reset);
    };
  }, [interactive]);

  useEffect(() => {
    if (interactive) return;
    let returnTimer = 0;
    const drift = window.setInterval(() => {
      motion.current.targetX = (Math.random() - 0.5) * 1.7;
      motion.current.targetY = (Math.random() - 0.5) * 1.2;
      window.clearTimeout(returnTimer);
      returnTimer = window.setTimeout(() => {
        motion.current.targetX = 0;
        motion.current.targetY = 0;
      }, 720);
    }, 2850);
    return () => { window.clearInterval(drift); window.clearTimeout(returnTimer); };
  }, [interactive]);

  const style = {
    '--look-x': '0px', '--look-y': '0px', '--head-turn': '0deg', '--body-y': '0px', '--body-r': '0deg',
    '--breath-x': '1', '--breath-y': '1', '--arm-left-r': '0deg', '--arm-right-r': '0deg', '--arm-left-x': '0%',
    '--arm-left-y': '0%', '--arm-right-x': '0%', '--arm-right-y': '0%', '--scarf-left-r': '0deg', '--scarf-right-r': '0deg', '--mouth-y': '1',
  } as CSSProperties;
  const layer = (name: string, className: string) => <span className={`aurora-rig-part ${className}`} style={{ backgroundImage: `url(${ASSET_ROOT}/${name}.png)` }} />;

  return <div ref={rootRef} className={`aurora-live aurora-rig expression-${activeExpression} behavior-${activeBehavior} ${talking ? 'is-talking' : ''} ${blinking ? 'is-blinking' : ''} ${className}`} style={style} role="img" aria-label={label}>
    <span className="aurora-rig-ground" />
    <span className="aurora-rig-sparkle sparkle-a">✦</span><span className="aurora-rig-sparkle sparkle-b">✦</span><span className="aurora-rig-sparkle sparkle-c">✦</span>
    <span className="aurora-master-character" style={{ backgroundImage: `url(${MASTER_ASSET})` }} />
    <span className="aurora-master-blink blink-left" />
    <span className="aurora-master-blink blink-right" />
    <span className="aurora-master-glint glint-left" />
    <span className="aurora-master-glint glint-right" />
    <span className="aurora-master-talk" />
    <span className="aurora-master-heart">♥</span>
    <div className="aurora-rig-character">
      {layer('scarf-left', 'rig-scarf rig-scarf-left')}{layer('scarf-right', 'rig-scarf rig-scarf-right')}
      {layer('body', 'rig-body')}{layer('arm-left', 'rig-arm rig-arm-left')}{layer('arm-right', 'rig-arm rig-arm-right')}
      <div className="rig-head-group">
        {layer('head', 'rig-head')}
        <div className="rig-eye-group rig-eye-left">{layer('eye-left', 'rig-eye')}</div>
        <div className="rig-eye-group rig-eye-right">{layer('eye-right', 'rig-eye')}</div>
        <div className="rig-mouth-group">{layer(talking || activeExpression === 'surprised' || activeExpression === 'excited' ? 'mouth-open' : 'mouth-smile', 'rig-mouth')}</div>
      </div>
      <span className="aurora-rig-heart">♥</span><span className="aurora-rig-question">?</span>
    </div>
  </div>;
}
