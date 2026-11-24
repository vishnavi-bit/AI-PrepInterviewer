// Shared page building blocks: glass surfaces, gradient and glow buttons, gradient headings, states and loading.
import React from 'react';
import { Alert, AlertIcon, Box, Button, Flex, Heading, Skeleton, Stack, Text } from '@chakra-ui/react';
import { GRADIENT, GRADIENT_SOFT } from '../styling/tokens';

export const GLASS_BG = 'var(--pp-glass)';
export const GLASS_BORDER = '1px solid var(--pp-border)';

export function GradientText({ children, ...rest }: React.ComponentProps<typeof Box>) {
  return (
    <Box as="span" bgImage={GRADIENT} bgClip="text" sx={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} {...rest}>
      {children}
    </Box>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'flex-start', md: 'flex-end' }} gap={5} mb={{ base: 7, md: 10 }}>
      <Stack spacing={3} maxW="720px">
        <Heading as="h1" size="xl" fontWeight="bold" letterSpacing="-0.03em" lineHeight="1.1">
          <GradientText>{title}</GradientText>
        </Heading>
        {subtitle && <Text color="var(--pp-muted)" fontSize={{ base: 'sm', md: 'md' }}>{subtitle}</Text>}
      </Stack>
      {actions && <Flex gap={3} wrap="wrap">{actions}</Flex>}
    </Flex>
  );
}

// Glassmorphism card with a soft inner highlight and a lift on hover.
export function Surface({ children, glow = false, ...rest }: React.ComponentProps<typeof Box> & { glow?: boolean }) {
  return (
    <Box
      position="relative"
      bg={GLASS_BG}
      backdropFilter="blur(18px) saturate(160%)"
      border={GLASS_BORDER}
      borderRadius="2xl"
      p={{ base: 5, md: 7 }}
      boxShadow={glow ? '0 0 0 1px rgba(139,92,246,0.35), 0 20px 60px -18px rgba(139,92,246,0.45)' : 'var(--pp-shadow), inset 0 1px 0 rgba(255,255,255,0.08)'}
      transition="transform 500ms cubic-bezier(0.22,1,0.36,1), box-shadow 500ms cubic-bezier(0.22,1,0.36,1), border-color 300ms"
      _hover={{ borderColor: 'rgba(139,92,246,0.35)' }}
      {...rest}
    >
      {children}
    </Box>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <Surface glow textAlign="center" py={{ base: 12, md: 16 }}>
      <Stack spacing={4} align="center" maxW="480px" mx="auto">
        <Box w="64px" h="64px" borderRadius="full" bgImage={GRADIENT_SOFT} boxShadow="0 0 40px rgba(139,92,246,0.5)" />
        <Heading as="h2" size="md" fontWeight="semibold">{title}</Heading>
        <Text color="var(--pp-muted)">{body}</Text>
        {action}
      </Stack>
    </Surface>
  );
}

export function ErrorAlert({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <Alert status="error" bg="rgba(244,63,94,0.12)" color="#FFD1DC" borderRadius="xl" border="1px solid" borderColor="rgba(244,63,94,0.35)" backdropFilter="blur(10px)">
      <AlertIcon color="#FB7185" />
      <Text role="alert" fontSize="sm">{message}</Text>
    </Alert>
  );
}

export function LoadingBlock({ lines = 3 }: { lines?: number }) {
  return (
    <Surface>
      <Stack spacing={4} aria-busy="true" aria-label="Loading">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} height="18px" borderRadius="md" startColor="rgba(255,255,255,0.06)" endColor="rgba(139,92,246,0.18)" />
        ))}
      </Stack>
    </Surface>
  );
}

// Gradient button with a soft glow that brightens on hover.
export function PrimaryButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      bgImage={GRADIENT}
      color="var(--pp-text)"
      borderRadius="full"
      fontWeight="semibold"
      px={6}
      boxShadow="0 10px 30px -8px rgba(139,92,246,0.7), 0 0 0 1px rgba(255,255,255,0.12) inset"
      transition="transform 400ms cubic-bezier(0.22,1,0.36,1), box-shadow 400ms cubic-bezier(0.22,1,0.36,1), filter 300ms"
      _hover={{ transform: 'translateY(-2px)', boxShadow: '0 16px 40px -8px rgba(139,92,246,0.85), 0 0 24px rgba(34,211,238,0.35)', filter: 'brightness(1.08)', _disabled: { transform: 'none' } }}
      _active={{ transform: 'scale(0.97)' }}
      _disabled={{ opacity: 0.45, cursor: 'not-allowed', boxShadow: 'none' }}
      {...props}
    />
  );
}

// Glass button for secondary actions.
export function GhostButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      borderColor="var(--pp-border)"
      color="var(--pp-text)"
      bg="var(--pp-fill)"
      backdropFilter="blur(10px)"
      borderRadius="full"
      fontWeight="medium"
      transition="all 300ms cubic-bezier(0.22,1,0.36,1)"
      _hover={{ bg: 'var(--pp-fill)', borderColor: 'rgba(34,211,238,0.55)', boxShadow: '0 0 18px rgba(34,211,238,0.25)' }}
      _active={{ transform: 'scale(0.97)' }}
      {...props}
    />
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Box as="span" display="inline-flex" alignItems="center" gap={2} alignSelf="flex-start" px={3} py={1} borderRadius="full" bg="rgba(34,211,238,0.08)" border="1px solid rgba(34,211,238,0.3)" fontSize="xs" textTransform="uppercase" letterSpacing="0.14em" color="neon.cyan" fontWeight="semibold">
      <Box w="6px" h="6px" borderRadius="full" bg="neon.cyan" boxShadow="0 0 10px #22D3EE" aria-hidden />
      {children}
    </Box>
  );
}

// Circular score with a gradient arc and glow.
export function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const r = 66;
  const c = 2 * Math.PI * r;
  const id = React.useId().replace(/:/g, '');
  return (
    <Box position="relative" w={`${size}px`} h={`${size}px`} role="img" aria-label={`Overall score ${score} out of 100`} filter="drop-shadow(0 0 18px rgba(139,92,246,0.5))">
      <svg viewBox="0 0 160 160" width={size} height={size}>
        <defs>
          <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="55%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
        <circle cx="80" cy="80" r={r} fill="none" style={{ stroke: 'var(--pp-border)' }} strokeWidth="12" />
        <circle cx="80" cy="80" r={r} fill="none" stroke={`url(#ring-${id})`} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 80 80)" style={{ transition: 'stroke-dasharray 1200ms cubic-bezier(0.22,1,0.36,1)' }} />
      </svg>
      <Box position="absolute" inset={0} display="grid" placeItems="center" textAlign="center">
        <Stack spacing={0}>
          <Text fontSize="4xl" fontWeight="bold" lineHeight="1" fontFamily="heading"><GradientText>{score}</GradientText></Text>
          <Text fontSize="xs" color="var(--pp-muted)">out of 100</Text>
        </Stack>
      </Box>
    </Box>
  );
}
