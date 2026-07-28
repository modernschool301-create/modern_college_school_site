'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// A per-page "this page has a hero" flag, so the nav knows which mode to use
// instead of hardcoding a pathname. A page with a full-bleed hero renders
// <HeroNavMode />, which flips the flag on; every other page leaves it false,
// so the nav is solid --paper from the first paint (no dark smudge over white
// pages like Contact/About).
type NavHeroValue = {
  hasHero: boolean;
  setHasHero: (v: boolean) => void;
};

const NavHeroContext = createContext<NavHeroValue>({
  hasHero: false,
  setHasHero: () => {},
});

export function NavHeroProvider({ children }: { children: ReactNode }) {
  const [hasHero, setHasHero] = useState(false);
  return (
    <NavHeroContext.Provider value={{ hasHero, setHasHero }}>
      {children}
    </NavHeroContext.Provider>
  );
}

export function useNavHero() {
  return useContext(NavHeroContext);
}

// Rendered by any page that owns a hero. Registers "has hero" for the lifetime
// of that page and clears it on navigation away.
export function HeroNavMode() {
  const { setHasHero } = useNavHero();
  useEffect(() => {
    setHasHero(true);
    return () => setHasHero(false);
  }, [setHasHero]);
  return null;
}
