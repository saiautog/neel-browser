import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import type { HaloColorId, SearchEngineId } from '../types/browser';
import { HALO_COLORS, SEARCH_ENGINES } from '../utils/url';

interface NewTabViewProps {
  searchEngine: SearchEngineId;
  haloColor: HaloColorId;
  onNavigate: (input: string) => void;
}

const HALO_MOTES = [
  { x: -120, y: -28, size: 4, delay: 0, dur: 4.5 },
  { x: -72, y: -52, size: 3, delay: 0.6, dur: 5.2 },
  { x: -24, y: -38, size: 5, delay: 1.1, dur: 4.8 },
  { x: 18, y: -58, size: 3.5, delay: 0.3, dur: 5.6 },
  { x: 64, y: -32, size: 4.5, delay: 1.4, dur: 4.3 },
  { x: 112, y: -46, size: 3, delay: 0.9, dur: 5.1 },
  { x: -45, y: -14, size: 2.5, delay: 1.7, dur: 4.9 },
  { x: 42, y: -18, size: 3, delay: 0.4, dur: 4.6 },
];

export const NewTabView: React.FC<NewTabViewProps> = ({
  searchEngine,
  haloColor,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onNavigate(query.trim());
  };

  const activeEnergy = isFocused || query.length > 0;
  const palette = HALO_COLORS[haloColor] || HALO_COLORS.sky;

  return (
    <div className="h-full w-full flex items-center justify-center bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-6 overflow-hidden">
      <div className="w-full max-w-xl flex flex-col items-center -mt-14 relative">
        <div className="relative w-full h-24 mb-2 flex items-center justify-center select-none pointer-events-none">
          {HALO_MOTES.map((mote, i) => (
            <motion.span
              key={i}
              style={{ width: mote.size, height: mote.size }}
              className={`absolute rounded-full ${palette.moteClass}`}
              animate={{
                x: activeEnergy ? mote.x * 0.68 : mote.x,
                y: activeEnergy
                  ? [mote.y + 8, mote.y + 2, mote.y + 8]
                  : [mote.y, mote.y - 10, mote.y],
                opacity: activeEnergy ? [0.5, 0.95, 0.5] : [0.25, 0.65, 0.25],
              }}
              transition={{
                x: { duration: 0.45, ease: 'easeOut' },
                y: {
                  duration: mote.dur,
                  delay: mote.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
                opacity: {
                  duration: mote.dur,
                  delay: mote.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                },
              }}
            />
          ))}
        </div>

        <div className="relative w-full">
          <motion.div
            aria-hidden="true"
            animate={{
              scale: activeEnergy ? 1.04 : 0.96,
              opacity: activeEnergy ? 0.55 : 0.28,
            }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`absolute -inset-2 rounded-2xl bg-gradient-to-r ${palette.glowClass} blur-xl pointer-events-none`}
          />

          <form
            onSubmit={handleSubmit}
            className={`relative w-full flex items-center gap-2.5 h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus-within:bg-white dark:focus-within:bg-slate-950 ${palette.borderFocusClass} transition-colors`}
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={`Search with ${SEARCH_ENGINES[searchEngine].label} or enter URL`}
              aria-label="Search or enter website address"
              autoFocus
              className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
            />
          </form>
        </div>
      </div>
    </div>
  );
};
