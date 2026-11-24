// Application shell: a glass sidebar on desktop, a glass top bar with a drawer on small screens. Public pages use a glass top bar.
import React from 'react';
import { Link as RouterLink, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Drawer, DrawerBody, DrawerContent, DrawerOverlay, Flex, HStack, IconButton, Stack, Text, useDisclosure } from '@chakra-ui/react';
import { House, FileText, Briefcase, Microphone, ClockCounterClockwise, UserCircle, List, SignOut, GearSix } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { GRADIENT, GLOW } from '../styling/tokens';
import { GhostButton, PrimaryButton } from './ui';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: House },
  { to: '/resume', label: 'Resume', icon: FileText },
  { to: '/roles', label: 'Job roles', icon: Briefcase },
  { to: '/interview', label: 'Interview', icon: Microphone },
  { to: '/interview/history', label: 'History', icon: ClockCounterClockwise },
  { to: '/profile', label: 'Profile', icon: UserCircle },
  { to: '/settings', label: 'Settings', icon: GearSix },
];

const GLASS = {
  bg: 'var(--pp-sidebar)',
  backdropFilter: 'blur(22px) saturate(160%)',
} as const;

// The AI PrepInterviewer logo (transparent background, see public/brand/logo.png).
export function Brand() {
  return (
    <Box as={RouterLink} to="/" display="inline-flex" aria-label="AI PrepInterviewer home" _hover={{ textDecoration: 'none', filter: 'drop-shadow(0 0 14px rgba(34,211,238,0.5))' }} transition="filter 400ms cubic-bezier(0.22,1,0.36,1)">
      <Box as="img" src="/brand/logo.png" alt="AI PrepInterviewer" h={{ base: '36px', md: '44px' }} w="auto" display="block" />
    </Box>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Stack spacing={1.5}>
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} onClick={onNavigate} style={{ textDecoration: 'none' }}>
          {({ isActive }) => (
            <HStack
              position="relative"
              px={4}
              py={3}
              borderRadius="xl"
              spacing={3}
              color={isActive ? 'var(--pp-text)' : 'var(--pp-muted)'}
              bg={isActive ? 'linear-gradient(90deg, rgba(34,211,238,0.18), rgba(139,92,246,0.22))' : 'transparent'}
              border="1px solid"
              borderColor={isActive ? 'rgba(139,92,246,0.45)' : 'transparent'}
              boxShadow={isActive ? '0 0 24px -6px rgba(139,92,246,0.6)' : 'none'}
              transition="all 350ms cubic-bezier(0.22,1,0.36,1)"
              _hover={{ bg: 'var(--pp-fill)', color: 'var(--pp-text)', transform: 'translateX(3px)' }}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && <Box position="absolute" left="-1px" top="20%" bottom="20%" w="3px" borderRadius="full" bgImage={GRADIENT} aria-hidden />}
              <Icon size={19} weight={isActive ? 'fill' : 'regular'} color={isActive ? '#22D3EE' : undefined} aria-hidden />
              <Text fontSize="sm" fontWeight={isActive ? 'semibold' : 'medium'}>{label}</Text>
            </HStack>
          )}
        </NavLink>
      ))}
    </Stack>
  );
}

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const drawer = useDisclosure();

  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Flex minH="100vh">
      <Box as="aside" display={{ base: 'none', lg: 'flex' }} w="272px" flexShrink={0} flexDir="column" borderRight="1px solid" borderColor="var(--pp-border)" p={5} position="sticky" top={0} h="100vh" {...GLASS}>
        <Box mb={9} px={2} pt={1}><Brand /></Box>
        <NavItems />
        <Box mt="auto" pt={6} borderTop="1px solid" borderColor="var(--pp-border)">
          <HStack justify="space-between" mb={3}>
            <Text fontSize="xs" color="var(--pp-faint)" textTransform="uppercase" letterSpacing="0.12em">Appearance</Text>
            <ThemeToggle size="sm" />
          </HStack>
          <Text fontSize="sm" color="var(--pp-text)" fontWeight="semibold" noOfLines={1}>{user?.name}</Text>
          <Text fontSize="xs" color="var(--pp-muted)" noOfLines={1} mb={3}>{user?.email}</Text>
          <GhostButton size="sm" w="full" leftIcon={<SignOut size={16} />} onClick={onLogout}>Log out</GhostButton>
        </Box>
      </Box>

      <Box flex="1" minW={0}>
        <Flex as="header" display={{ base: 'flex', lg: 'none' }} align="center" justify="space-between" px={4} py={3} borderBottom="1px solid" borderColor="var(--pp-border)" position="sticky" top={0} zIndex={10} {...GLASS}>
          <Brand />
          <HStack spacing={2}>
            <ThemeToggle size="sm" />
            <IconButton aria-label="Open navigation" variant="ghost" color="var(--pp-text)" icon={<List size={22} />} onClick={drawer.onOpen} />
          </HStack>
        </Flex>
        <Drawer isOpen={drawer.isOpen} placement="left" onClose={drawer.onClose}>
          <DrawerOverlay bg="rgba(3,5,14,0.6)" backdropFilter="blur(6px)" />
          <DrawerContent {...GLASS} color="var(--pp-text)" borderRight="1px solid" borderColor="var(--pp-border)">
            <DrawerBody p={5}>
              <Box mb={8}><Brand /></Box>
              <NavItems onNavigate={drawer.onClose} />
              <Button mt={6} variant="ghost" color="var(--pp-muted)" leftIcon={<SignOut size={16} />} onClick={onLogout}>Log out</Button>
            </DrawerBody>
          </DrawerContent>
        </Drawer>
        <Box as="main" id="main" key={location.pathname} px={{ base: 4, sm: 5, md: 8, xl: 12 }} py={{ base: 6, md: 10 }} maxW="1200px" mx="auto" className="pp-page">
          {children ?? <Outlet />}
        </Box>
      </Box>
    </Flex>
  );
}

export function PublicLayout({ children }: { children?: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <Box minH="100vh">
      <Flex as="header" align="center" justify="space-between" px={{ base: 4, md: 8 }} py={4} position="sticky" top={0} zIndex={10} borderBottom="1px solid" borderColor="var(--pp-border)" {...GLASS}>
        <Brand />
        <HStack spacing={{ base: 1.5, sm: 3 }}>
          <ThemeToggle size="sm" />
          <Button as={RouterLink} to="/" variant="ghost" size="sm" px={{ base: 2, sm: 3 }} color="var(--pp-muted)" fontWeight="medium" _hover={{ color: 'var(--pp-text)', bg: 'var(--pp-fill)' }} aria-label="Home">Home</Button>
          {user ? (
            <PrimaryButton as={RouterLink} to="/dashboard" size="sm">Go to dashboard</PrimaryButton>
          ) : (
            <>
              <GhostButton as={RouterLink} to="/login" size="sm">Log in</GhostButton>
              <PrimaryButton as={RouterLink} to="/register" size="sm">Create account</PrimaryButton>
            </>
          )}
        </HStack>
      </Flex>
      <Box as="main" id="main">
        {children ?? <Outlet />}
      </Box>
    </Box>
  );
}
