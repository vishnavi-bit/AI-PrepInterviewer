import React from 'react';
import { Box, ChakraProvider, extendTheme, useColorMode } from '@chakra-ui/react';
import { theme as glueTheme } from '../app/theme';
import { Aurora } from '../components/Aurora';

export interface ThemeEntry { id: string; tokens: Record<string, unknown> }

// Merges every token set registered in the theme glue, in order, onto Chakra's default theme.
export function buildTheme(entries: ThemeEntry[]) {
  return extendTheme(...entries.map((e) => e.tokens));
}

// Chakra stores the chosen colour mode under this key. Dark is the default until someone picks light.
const MODE_KEY = 'chakra-ui-color-mode';

// On a first visit the theme is dark. After the user chooses, their choice is kept (Chakra persists it).
function DefaultDarkMode({ children }: { children?: React.ReactNode }) {
  const { setColorMode } = useColorMode();
  React.useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(MODE_KEY);
    } catch {
      stored = null;
    }
    if (!stored) setColorMode('dark');
  }, [setColorMode]);
  return <>{children}</>;
}

// Registered in the providers glue (outermost). The aurora sits behind every page and follows the colour mode.
export function ChakraAppProvider({ children, entries = glueTheme as unknown as ThemeEntry[] }: { children?: React.ReactNode; entries?: ThemeEntry[] }) {
  const theme = React.useMemo(() => buildTheme(entries), [entries]);
  return (
    <ChakraProvider theme={theme}>
      <DefaultDarkMode>
        <Aurora />
        <Box position="relative" zIndex={1} minH="100vh">
          {children}
        </Box>
      </DefaultDarkMode>
    </ChakraProvider>
  );
}
