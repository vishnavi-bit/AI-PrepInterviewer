// Interactive AI interviewer. States: idle (floating, blinking, eyes follow the pointer), speaking (animated mouth and a
// waveform), listening (attentive tilt, pulsing rings). Clicking the avatar replays the question when onActivate is given.
// Motion is removed for users who prefer reduced motion.
import React, { useRef, useState } from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';
import { GRADIENT } from '../styling/tokens';

export type AvatarState = 'idle' | 'speaking' | 'listening';

const CSS = `
@keyframes pp-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
@keyframes pp-blink { 0%,93%,100% { transform: scaleY(1) } 96% { transform: scaleY(0.08) } }
@keyframes pp-talk { 0%,100% { transform: scaleY(0.2) } 50% { transform: scaleY(1) } }
@keyframes pp-ring { 0% { transform: scale(0.85); opacity: 0.7 } 100% { transform: scale(1.5); opacity: 0 } }
@keyframes pp-wave { 0%,100% { transform: scaleY(0.25) } 50% { transform: scaleY(1) } }
@keyframes pp-aura { 0%,100% { opacity: 0.55 } 50% { opacity: 0.9 } }
.pp-av-float { animation: pp-float 5s ease-in-out infinite; }
.pp-av-eye { transform-box: fill-box; transform-origin: center; animation: pp-blink 5.5s infinite; }
.pp-av-mouth { transform-box: fill-box; transform-origin: center; }
.pp-av[data-state='speaking'] .pp-av-mouth { animation: pp-talk 0.32s ease-in-out infinite; }
.pp-av-head { transition: transform 600ms cubic-bezier(0.22,1,0.36,1); transform-origin: 100px 150px; }
.pp-av[data-state='listening'] .pp-av-head { transform: rotate(-4deg) translateX(-2px); }
.pp-av-ring { transform-origin: center; animation: pp-ring 2.2s ease-out infinite; }
.pp-av-aura { animation: pp-aura 4s ease-in-out infinite; }
.pp-wave-bar { transform-origin: bottom; animation: pp-wave 0.9s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pp-av-float, .pp-av-eye, .pp-av-mouth, .pp-av-ring, .pp-av-aura, .pp-wave-bar { animation: none !important; }
  .pp-av-head { transition: none !important; }
}
`;

const LABEL: Record<AvatarState, string> = { idle: 'Interviewer is ready', speaking: 'Interviewer is speaking', listening: 'Listening to your answer' };
const STATUS: Record<AvatarState, string> = { idle: 'Priya, your interviewer', speaking: 'Priya is speaking', listening: 'Listening' };

export function InterviewerAvatar({ state, onActivate }: { state: AvatarState; onActivate?: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });

  // Pupils follow the pointer across the avatar.
  const onMove = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(-1, Math.min(1, (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)));
    const y = Math.max(-1, Math.min(1, (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)));
    setLook({ x, y });
  };

  const interactive = Boolean(onActivate);
  return (
    <Box textAlign="center">
      <style>{CSS}</style>
      <Box
        ref={ref}
        className="pp-av"
        data-state={state}
        role={interactive ? 'button' : 'img'}
        tabIndex={interactive ? 0 : undefined}
        aria-label={`AI interviewer, Priya. ${LABEL[state]}.${interactive ? ' Press to replay the question.' : ''}`}
        onPointerMove={onMove}
        onPointerLeave={() => setLook({ x: 0, y: 0 })}
        onClick={onActivate}
        onKeyDown={(e) => {
          if (interactive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onActivate?.();
          }
        }}
        position="relative"
        mx="auto"
        w={{ base: '230px', md: '280px' }}
        cursor={interactive ? 'pointer' : 'default'}
        outline="none"
        _focusVisible={{ boxShadow: '0 0 0 2px #22D3EE' }}
        borderRadius="full"
      >
        {/* Aura and rings */}
        <Box position="absolute" inset="-12%" borderRadius="full" bgImage="radial-gradient(circle, rgba(139,92,246,0.55) 0%, rgba(34,211,238,0.25) 45%, transparent 70%)" filter="blur(18px)" className="pp-av-aura" aria-hidden />
        {state === 'listening' && [0, 1].map((i) => (
          <Box key={i} position="absolute" inset="8%" borderRadius="full" border="2px solid" borderColor="neon.cyan" className="pp-av-ring" style={{ animationDelay: `${i * 1.1}s` }} aria-hidden />
        ))}
        <Box className="pp-av-float" position="relative">
          <svg viewBox="0 0 200 260" width="100%" height="auto" aria-hidden="true" style={{ overflow: 'visible', filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.5))' }}>
            <defs>
              <linearGradient id="pp-blazer" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3B1F7A" />
                <stop offset="100%" stopColor="#0E3B4D" />
              </linearGradient>
              <linearGradient id="pp-hair" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2A1B4D" />
                <stop offset="100%" stopColor="#0B1030" />
              </linearGradient>
              <linearGradient id="pp-skin" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FBD3BC" />
                <stop offset="100%" stopColor="#E9A98D" />
              </linearGradient>
            </defs>
            {/* shoulders and blazer */}
            <path d="M22 262 C22 196 56 176 100 176 C144 176 178 196 178 262 Z" fill="url(#pp-blazer)" />
            <path d="M100 184 L80 262 L120 262 Z" fill="#F5F3FF" opacity="0.92" />
            <path d="M76 184 L100 214 L124 184" fill="none" stroke="#22D3EE" strokeWidth="2.5" opacity="0.8" />
            {/* neck */}
            <path d="M88 150 L112 150 L114 182 L86 182 Z" fill="url(#pp-skin)" />
            <g className="pp-av-head">
              {/* back hair */}
              <path d="M50 112 C44 58 70 30 100 30 C130 30 156 58 150 112 L156 152 C140 166 60 166 44 152 Z" fill="url(#pp-hair)" />
              {/* face */}
              <path d="M62 102 C62 66 78 50 100 50 C122 50 138 66 138 102 C138 134 122 152 100 152 C78 152 62 134 62 102 Z" fill="url(#pp-skin)" />
              {/* fringe */}
              <path d="M56 100 C58 56 84 42 104 46 C126 50 146 66 144 100 C128 80 110 72 94 74 C78 76 66 86 56 100 Z" fill="url(#pp-hair)" />
              <path d="M70 60 C90 44 118 46 134 70" fill="none" stroke="#22D3EE" strokeWidth="1.5" opacity="0.55" />
              {/* eyes: pupils track the pointer */}
              {[81, 119].map((cx) => (
                <g key={cx}>
                  <ellipse className="pp-av-eye" cx={cx} cy="104" rx="6" ry="7" fill="#0B0F2A" />
                  <circle cx={cx + look.x * 2 + 0.5} cy={104 + look.y * 2} r="2.2" fill="#22D3EE" />
                  <circle cx={cx + 2} cy="101" r="1.4" fill="#FFFFFF" />
                </g>
              ))}
              {/* brows */}
              <path d="M72 90 Q81 84 90 89" fill="none" stroke="#2A1B4D" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M110 89 Q119 84 128 90" fill="none" stroke="#2A1B4D" strokeWidth="2.4" strokeLinecap="round" />
              {/* nose */}
              <path d="M100 110 Q97 120 101 122" fill="none" stroke="#C07F66" strokeWidth="2" strokeLinecap="round" />
              {/* mouth */}
              <ellipse className="pp-av-mouth" cx="100" cy="134" rx="10" ry="5" fill="#E11D74" opacity={state === 'speaking' ? 1 : 0.9} />
              {/* cheeks */}
              <circle cx="72" cy="122" r="6" fill="#F472B6" opacity="0.35" />
              <circle cx="128" cy="122" r="6" fill="#F472B6" opacity="0.35" />
            </g>
          </svg>
        </Box>
      </Box>
      <HStack justify="center" mt={4} spacing={3}>
        {state === 'speaking' ? (
          <HStack spacing="3px" h="18px" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <Box key={i} w="3px" h="18px" borderRadius="full" bgImage={GRADIENT} className="pp-wave-bar" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </HStack>
        ) : (
          <Box w="8px" h="8px" borderRadius="full" bg={state === 'idle' ? 'var(--pp-faint)' : 'neon.lime'} boxShadow={state === 'listening' ? '0 0 12px #A3E635' : 'none'} aria-hidden />
        )}
        <Text fontSize="sm" color="var(--pp-muted)">{STATUS[state]}</Text>
      </HStack>
    </Box>
  );
}
