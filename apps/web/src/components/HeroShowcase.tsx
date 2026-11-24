// Hero visual: the AI interviewer picture turns in 3D (a continuous 360-degree loop) and floats gently above a soft shadow.
// The picture is flat, so the turn is a CSS 3D rotation of the card, with the same image on its back face.
// Motion uses transform only. With prefers-reduced-motion, the picture stays still on its front face.
import React from 'react';
import { Box } from '@chakra-ui/react';

const CSS = `
@keyframes pp-hero-spin { from { transform: rotateY(0deg) } to { transform: rotateY(360deg) } }
@keyframes pp-hero-float { 0%, 100% { transform: translateY(0px) } 50% { transform: translateY(-16px) } }
@keyframes pp-hero-shadow { 0%, 100% { transform: scale(1); opacity: 0.55 } 50% { transform: scale(0.82); opacity: 0.3 } }
.pp-hero-stage { perspective: 1600px; }
.pp-hero-float { animation: pp-hero-float 7s ease-in-out infinite; transform-style: preserve-3d; }
.pp-hero-spin { animation: pp-hero-spin 22s linear infinite; transform-style: preserve-3d; will-change: transform; }
.pp-hero-face { backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 22px; overflow: hidden; }
.pp-hero-back { position: absolute; inset: 0; transform: rotateY(180deg); }
.pp-hero-shadow { animation: pp-hero-shadow 7s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pp-hero-float, .pp-hero-spin, .pp-hero-shadow { animation: none !important; }
}
`;

const SRC = '/brand/interviewer.gif';
const ALT = 'Female AI interviewer with a headset, speaking at an AI microphone in a holographic interview dashboard, with resume analysis, performance score and career growth panels';

function Face({ back = false }: { back?: boolean }) {
  return (
    <Box
      className={`pp-hero-face${back ? ' pp-hero-back' : ''}`}
      p="2px"
      bgImage="linear-gradient(135deg, #22D3EE, #8B5CF6, #EC4899)"
      boxShadow="0 30px 80px -20px rgba(139,92,246,0.55), 0 0 40px rgba(34,211,238,0.25)"
      aria-hidden={back}
    >
      <Box as="img" src={SRC} alt={back ? '' : ALT} w="full" h="full" objectFit="cover" display="block" borderRadius="calc(22px - 2px)" draggable={false} />
    </Box>
  );
}

export function HeroShowcase() {
  return (
    <Box position="relative" w="full" py={6} px={4}>
      <style>{CSS}</style>
      <Box className="pp-hero-stage" position="relative">
        <Box className="pp-hero-float">
          <Box className="pp-hero-spin" position="relative">
            <Face />
            <Face back />
          </Box>
        </Box>
        {/* Floor shadow: it shrinks as the picture rises and grows as it drops, which gives the card depth. */}
        <Box
          className="pp-hero-shadow"
          aria-hidden
          position="absolute"
          left="18%"
          right="18%"
          bottom="-18px"
          h="28px"
          borderRadius="full"
          bgImage="radial-gradient(ellipse at center, rgba(139,92,246,0.7), transparent 70%)"
          filter="blur(6px)"
          pointerEvents="none"
        />
      </Box>
    </Box>
  );
}
