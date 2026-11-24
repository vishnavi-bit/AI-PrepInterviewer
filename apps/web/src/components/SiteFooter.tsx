// Homepage footer: brand, product, account and resources, legal, and a divider with the copyright line.
// Links only go to pages that exist. Items without a page yet are shown as "coming soon", not as dead links.
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Container, Grid, GridItem, HStack, Stack, Text, Flex, Heading } from '@chakra-ui/react';

const LINK_STYLE = {
  color: 'var(--pp-muted)',
  fontSize: 'sm',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 1,
  transition: 'color 300ms cubic-bezier(0.22,1,0.36,1), transform 300ms cubic-bezier(0.22,1,0.36,1)',
  _hover: { color: 'var(--pp-text)', transform: 'translateX(3px)', textDecoration: 'none' },
} as const;

type Item = { label: string; to?: string; href?: string };

const PRODUCT: Item[] = [
  { label: 'Home', to: '/' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'AI Mock Interview', to: '/interview' },
];

const ACCOUNT: Item[] = [
  { label: 'Create Account', to: '/register' },
  { label: 'Login', to: '/login' },
  { label: 'My Dashboard', to: '/dashboard' },
  { label: 'Interview Reports', to: '/interview/history' },
  { label: 'Resume Preparation', to: '/resume' },
];

// No page exists yet for these, so they are not links.
const COMING_SOON = ['Pricing', 'Interview Tips', 'FAQs'];
const LEGAL_SOON = ['Privacy Policy', 'Terms & Conditions', 'Cookie Policy'];

function FooterLink({ item }: { item: Item }) {
  if (item.to) {
    return <Box as={RouterLink} to={item.to} sx={{ ...LINK_STYLE }}>{item.label}</Box>;
  }
  return <Box as="a" href={item.href} sx={{ ...LINK_STYLE }}>{item.label}</Box>;
}

function Column({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack spacing={4}>
      <Heading as="h3" fontSize="sm" fontWeight="semibold" color="var(--pp-text)" letterSpacing="0.02em">{title}</Heading>
      <Stack spacing={3} as="ul" listStyleType="none" m={0} p={0}>{children}</Stack>
    </Stack>
  );
}

function Soon({ label }: { label: string }) {
  return (
    <Text as="li" fontSize="sm" color="var(--pp-faint)" display="flex" alignItems="center" gap={2}>
      {label}
      <Text as="span" fontSize="10px" textTransform="uppercase" letterSpacing="0.12em" px={2} py="2px" borderRadius="full" border="1px solid" borderColor="var(--pp-border)">Soon</Text>
    </Text>
  );
}

export function SiteFooter() {
  return (
    <Box as="footer" position="relative" mt={{ base: 8, md: 12 }} overflow="hidden" borderTop="1px solid" borderColor="var(--pp-border)">
      {/* Soft gradient light across the top edge */}
      <Box
        aria-hidden
        position="absolute"
        top={0}
        left="10%"
        right="10%"
        h="1px"
        bgImage="linear-gradient(90deg, transparent, #22D3EE, #8B5CF6, #EC4899, transparent)"
        opacity={0.7}
      />
      <Box aria-hidden position="absolute" top="-120px" left="-80px" w="360px" h="360px" borderRadius="full" bgImage="radial-gradient(circle, rgba(139,92,246,0.22), transparent 65%)" pointerEvents="none" />
      <Box aria-hidden position="absolute" bottom="-140px" right="-60px" w="380px" h="380px" borderRadius="full" bgImage="radial-gradient(circle, rgba(34,211,238,0.16), transparent 65%)" pointerEvents="none" />

      <Container maxW="1200px" px={{ base: 5, md: 8 }} py={{ base: 12, md: 16 }} position="relative">
        <Grid templateColumns={{ base: '1fr', sm: '1fr 1fr', lg: '1.6fr 1fr 1.3fr 1fr' }} gap={{ base: 10, md: 12 }}>
          <GridItem>
            <Stack spacing={5} maxW="340px">
              <Box as={RouterLink} to="/" display="inline-flex" aria-label="AI PrepInterviewer home" w="fit-content">
                <Box as="img" src="/brand/logo.png" alt="AI PrepInterviewer" h="40px" w="auto" display="block" />
              </Box>
              <Text fontWeight="semibold" color="var(--pp-text)" fontSize="md">Practice smarter. Interview better. Build confidence.</Text>
              <Text color="var(--pp-muted)" fontSize="sm" lineHeight="1.7">
                Prepare for your next interview with AI-powered mock interviews, personalized feedback, and performance reports.
              </Text>
            </Stack>
          </GridItem>

          <Column title="Product">
            {PRODUCT.map((item) => (
              <Box as="li" key={item.label} listStyleType="none"><FooterLink item={item} /></Box>
            ))}
            <Soon label="Pricing" />
          </Column>

          <Column title="Account & Resources">
            {ACCOUNT.map((item) => (
              <Box as="li" key={item.label} listStyleType="none"><FooterLink item={item} /></Box>
            ))}
            <Soon label="Interview Tips" />
            <Soon label="FAQs" />
          </Column>

          <Column title="Legal">
            {LEGAL_SOON.map((label) => <Soon key={label} label={label} />)}
          </Column>
        </Grid>

        <Box mt={{ base: 10, md: 14 }} h="1px" bg="var(--pp-border)" />
        <Flex mt={6} justify="space-between" align="center" direction={{ base: 'column', md: 'row' }} gap={3}>
          <Text fontSize="xs" color="var(--pp-faint)">© 2026 AI PrepInterviewer. All rights reserved.</Text>
          <HStack spacing={2} fontSize="xs" color="var(--pp-faint)">
            <Box w="6px" h="6px" borderRadius="full" bgImage="linear-gradient(120deg, #22D3EE, #EC4899)" aria-hidden />
            <Text>Scores are AI practice estimates, not hiring outcomes.</Text>
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}
