import React from "react";
import { Search, Filter } from "lucide-react";

import "../../styles/PatientsSearchBar.css";

/**
 * Reusable search bar component
 *
 * Features:
 * - Real-time search input
 * - Dynamic placeholder text
 * - Theme support (dark/light mode)
 * - Optional filter button
 */

export function PatientsSearchBar({
  isDarkMode,
  searchQuery,
  setSearchQuery,
  placeholder = "Search...",
}) {

  // Apply current theme class
  const theme = isDarkMode ? "dark" : "light";

  return (
    <div className="search-bar-container">

      {/* Search input section */}
      <div className="search-input-wrapper">

        {/* Search icon */}
        <Search className={`search-icon ${theme}`} />

        {/* Search input field */}
        <input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`search-input-field ${theme}`}
        />

      </div>

      {/* Filter button */}
      <button className={`btn-filter ${theme}`}>

        <Filter size={18} />

        <span>Filter</span>

      </button>

    </div>
  );
}