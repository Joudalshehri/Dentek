import { createContext, useContext, useState, useEffect } from 'react';

/**
 * DarkModeContext
 * ---------------
 * Context to manage the dark mode state across the entire application.
 */
const DarkModeContext = createContext(undefined);

/**
 * DarkModeProvider Component
 * --------------------------
 * A provider component that wraps the application to provide dark mode 
 * functionality, state persistence via localStorage, and DOM manipulation.
 */
export function DarkModeProvider({ children }) {
  // Initialize state by checking localStorage for previous user preference
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('dentek-dark-mode');
    return saved ? JSON.parse(saved) : false;
  });

  /**
   * Side effect to sync state with localStorage and the document body class.
   * This allows global CSS styles to respond to theme changes.
   */
  useEffect(() => {
    // Persist the theme choice in the browser
    localStorage.setItem('dentek-dark-mode', JSON.stringify(isDarkMode));
    
    // Toggle the 'dark' class on the body element for global styling (e.g., Tailwind)
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  /**
   * Toggles the current theme between Light and Dark modes.
   */
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

/**
 * useDarkMode Custom Hook
 * ------------------------
 * A custom hook that provides an easy interface for functional components 
 * to access and update the dark mode state.
 * * @throws {Error} If used outside of a DarkModeProvider.
 */
export function useDarkMode() {
  const context = useContext(DarkModeContext);
  
  // Guard clause to ensure the hook is used within the correct context
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  
  return context;
}