import React from "react";
import { Search, Filter } from "lucide-react";
import "../../styles/PatientsSearchBar.css";

/**
 * SearchBar Component
 * ------------------
 * A unified search bar used across Patients and Reports pages.
 */
export function PatientsSearchBar({ isDarkMode, searchQuery, setSearchQuery, placeholder }) {
  const theme = isDarkMode ? "dark" : "light";

  return (
    <div className="search-bar-container">
      <div className="search-input-wrapper">
        <Search className={"search-icon " + theme} />
        <input
          type="text"
          placeholder={placeholder || "Search..."} // يستخدم الـ placeholder الممرر أو قيمة افتراضية
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={"search-input-field " + theme}
        />
      </div>

      <button className={"btn-filter " + theme}>
        <Filter size={18} />
        <span>Filter</span>
      </button>
    </div>
  );
}