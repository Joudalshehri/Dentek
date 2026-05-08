import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../contexts/DarkModeContext';
import "../../styles/DarkModeToggle.css";

/**
 * DarkModeToggle Component
 * ------------------------
 * A functional toggle button that switches the application's 
 * visual theme between Light and Dark modes using context.
 */
export function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  // Determine which class and icon to display based on the state
  const themeClass = isDarkMode ? 'dark' : 'light';

  return (
    <button
      onClick={toggleDarkMode}
      className={"theme-toggle-btn " + themeClass}
      aria-label="Toggle dark mode"
    >
      {isDarkMode ? <Sun /> : <Moon />}
    </button>
  );
}