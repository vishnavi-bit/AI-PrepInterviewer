// Light and dark mode switch. The choice is saved in the browser (Chakra's colour-mode store) and applied on every page.
import React from 'react';
import { IconButton, Tooltip, useColorMode } from '@chakra-ui/react';
import { Moon, Sun } from '@phosphor-icons/react';

export function ThemeToggle({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { colorMode, toggleColorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <Tooltip label={label} placement="bottom" hasArrow>
      <IconButton
        aria-label={label}
        aria-pressed={isDark}
        size={size}
        variant="ghost"
        borderRadius="full"
        color="var(--pp-text)"
        bg="var(--pp-fill)"
        border="1px solid"
        borderColor="var(--pp-border)"
        _hover={{ borderColor: 'neon.cyan', boxShadow: '0 0 16px rgba(34,211,238,0.35)' }}
        transition="all 300ms cubic-bezier(0.22,1,0.36,1)"
        _active={{ transform: 'scale(0.94)' }}
        onClick={toggleColorMode}
        icon={isDark ? <Sun size={18} weight="fill" color="#FBBF24" /> : <Moon size={18} weight="fill" color="#8B5CF6" />}
      />
    </Tooltip>
  );
}
