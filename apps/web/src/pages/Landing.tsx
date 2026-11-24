// Public landing page: a 3D hero, a gradient headline, feature cards and a scroll-linked tagline reveal.
// Every claim here comes from the project requirements; no invented numbers or testimonials.
import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Container, Flex, Grid, Heading, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react';
import { ChatCircleText, ChartLineUp, FileText, Microphone, Briefcase, ShieldCheck, Sparkle } from '@phosphor-icons/react';
import { Eyebrow, GhostButton, GradientText, PrimaryButton, Surface } from '../components/ui';
import { HeroShowcase } from '../components/HeroShowcase';
import { SiteFooter } from '../components/SiteFooter';
import { GRADIENT } from '../styling/tokens';

const FEATURES = [
  { icon: FileText, color: '#22D3EE', title: 'Start from your resume', body: 'Upload a PDF or Word file. We extract what it says, and you confirm or correct it before anything is used.' },
  { icon: Briefcase, color: '#8B5CF6', title: 'Roles that fit your skills', body: 'Get suggested job roles with a short reason for each, then pick the one you want to practise for.' },
  { icon: Microphone, color: '#EC4899', title: 'Speak or type your answers', body: 'An interviewer asks questions out loud and on screen. Answer with your voice or type, whichever suits you.' },
  { icon: ChartLineUp, color: '#A3E635', title: 'Reports you can revisit', body: 'Each interview ends with a score, strengths, areas to improve and practice suggestions, saved to your history.' },
];

const STEPS = [
  'Upload your resume and check the details we found.',
  'Choose a role, interview type, difficulty and duration.',
  'Answer the questions, then open your report.',
];

// Tagline reveal: each word lights up in reading order as the section scrolls past. Scroll is throttled with rAF.
function TaglineReveal({ text }: { text: string }) {
  const words = text.split(' ');
  const ref = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduced) {
      setProgress(words.length);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const span = rect.height + window.innerHeight * 0.6;
      const scrolled = window.innerHeight - rect.top;
      const ratio = Math.min(1, Math.max(0, scrolled / span));
      setProgress(Math.round(ratio * words.length));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced, words.length]);

  return (
    <Heading ref={ref} as="p" size="2xl" fontWeight="bold" lineHeight="1.15" maxW="760px" mx="auto" textAlign="center" letterSpacing="-0.025em" sx={{ textWrap: 'balance' }}>
      {words.map((w, i) => (
        <Box
          as="span"
          key={`${w}-${i}`}
          color={i < progress ? 'white' : 'var(--pp-faint)'}
          textShadow={i < progress ? '0 0 22px rgba(139,92,246,0.55)' : 'none'}
          transition="color 500ms cubic-bezier(0.22,1,0.36,1), text-shadow 500ms"
        >
          {w}{' '}
        </Box>
      ))}
    </Heading>
  );
}

export default function Landing() {
  return (
    <Box>
      <Container maxW="1200px" px={{ base: 5, md: 8 }} pt={{ base: 12, md: 20 }} pb={{ base: 16, md: 24 }}>
        <Grid templateColumns={{ base: '1fr', lg: '1.05fr 0.95fr' }} gap={{ base: 10, lg: 6 }} alignItems="center">
          <Stack spacing={7} align={{ base: 'center', lg: 'flex-start' }} textAlign={{ base: 'center', lg: 'left' }}>
            <Text fontFamily="heading" fontSize={{ base: "lg", md: "xl" }} fontWeight="bold" letterSpacing="0.02em"><GradientText>AI PrepInterviewer</GradientText></Text>
            <Eyebrow>Interview practice from your resume</Eyebrow>
            <Heading as="h1" size="3xl" fontWeight="bold" letterSpacing="-0.035em" lineHeight="1.04" sx={{ textWrap: 'balance' }}>
              <GradientText>Turn Your Resume into Interview Confidence</GradientText>
            </Heading>
            <Text fontSize={{ base: 'md', md: 'lg' }} color="var(--pp-muted)" maxW="560px" sx={{ textWrap: 'pretty' }}>
              AI PrepInterviewer analyses your resume, recommends suitable roles, runs a mock interview with a 2D AI interviewer, and scores your answers so you can see progress over time.
            </Text>
            <HStack spacing={3} pt={1} wrap="wrap" justify={{ base: 'center', lg: 'flex-start' }}>
              <PrimaryButton as={RouterLink} to="/register" size="lg">Create your account</PrimaryButton>
              <GhostButton as={RouterLink} to="/login" size="lg">I have an account</GhostButton>
            </HStack>
            <Text fontSize="xs" color="var(--pp-faint)">Scores are AI practice estimates. They do not guarantee real hiring outcomes.</Text>
          </Stack>
          <Box position="relative">
            <HeroShowcase />
          </Box>
        </Grid>
      </Container>

      <Container maxW="1200px" px={{ base: 5, md: 8 }} py={{ base: 10, md: 16 }}>
        <Box py={{ base: 14, md: 24 }} borderY="1px solid" borderColor="var(--pp-border)">
          <TaglineReveal text="Know what to say before the real interview starts, and why it works." />
        </Box>
      </Container>

      <Container id="features" maxW="1200px" px={{ base: 5, md: 8 }} pb={{ base: 16, md: 24 }} scrollMarginTop="96px">
        <Stack spacing={4} mb={12} maxW="680px">
          <Eyebrow>What you get</Eyebrow>
          <Heading as="h2" size="xl" fontWeight="bold" letterSpacing="-0.02em"><GradientText>Everything you need for one practice interview</GradientText></Heading>
        </Stack>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          {FEATURES.map(({ icon: Icon, color, title, body }) => (
            <Surface key={title} _hover={{ transform: 'translateY(-4px)' }}>
              <Stack spacing={5}>
                <Flex w="52px" h="52px" borderRadius="16px" align="center" justify="center" bg={`${color}22`} border="1px solid" borderColor={`${color}66`} boxShadow={`0 0 28px ${color}44`} color={color}>
                  <Icon size={24} aria-hidden />
                </Flex>
                <Heading as="h3" size="md" fontWeight="semibold">{title}</Heading>
                <Text color="var(--pp-muted)">{body}</Text>
              </Stack>
            </Surface>
          ))}
        </SimpleGrid>
      </Container>

      <Container id="how-it-works" maxW="1200px" px={{ base: 5, md: 8 }} pb={{ base: 16, md: 24 }} scrollMarginTop="96px">
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={10} alignItems="start">
          <Stack spacing={5}>
            <Eyebrow>How it works</Eyebrow>
            <Heading as="h2" size="xl" fontWeight="bold" letterSpacing="-0.02em"><GradientText>Three steps from upload to report</GradientText></Heading>
          </Stack>
          <Stack spacing={5}>
            {STEPS.map((s, i) => (
              <HStack key={s} align="flex-start" spacing={4}>
                <Flex flexShrink={0} w="40px" h="40px" borderRadius="full" bgImage={GRADIENT} align="center" justify="center" fontSize="sm" fontWeight="bold" boxShadow="0 0 22px rgba(139,92,246,0.55)">{i + 1}</Flex>
                <Text color="var(--pp-text)" pt={2}>{s}</Text>
              </HStack>
            ))}
            <Surface mt={2} display="flex" gap={4} alignItems="flex-start">
              <ShieldCheck size={24} color="#22D3EE" aria-hidden style={{ flexShrink: 0 }} />
              <Text fontSize="sm" color="var(--pp-muted)">Your resume, answers and reports belong to you. Only you can see them, and you can delete your account at any time.</Text>
            </Surface>
            <Surface display="flex" gap={4} alignItems="flex-start">
              <ChatCircleText size={24} color="#EC4899" aria-hidden style={{ flexShrink: 0 }} />
              <Text fontSize="sm" color="var(--pp-muted)">Prefer typing? Every question can be answered in text, and you can review a voice transcript before you submit it.</Text>
            </Surface>
            <Surface display="flex" gap={4} alignItems="flex-start">
              <Sparkle size={24} color="#A3E635" aria-hidden style={{ flexShrink: 0 }} />
              <Text fontSize="sm" color="var(--pp-muted)">Click the interviewer at any time to hear the question again.</Text>
            </Surface>
          </Stack>
        </Grid>
      </Container>

      <SiteFooter />
    </Box>
  );
}
