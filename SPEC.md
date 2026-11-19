# Light/Dark Mode Feature Specification

## Overview
Implement a user-selectable light/dark mode toggle for the task manager application. The theme preference will be persisted in local storage and respected across page reloads.

## Requirements

### 1. Theme Provider Context ✅
- Create a React Context to manage theme state globally
- Support "light" and "dark" modes
- Provide hooks for components to access and update theme

### 2. Theme Toggle UI ✅
- Add a theme toggle button in the header/navbar area
- Button should be visible and accessible from any page
- Display current theme state visually (icon change)

### 3. Persistence ✅
- Save theme preference to localStorage
- Load saved preference on app startup
- Fallback to system preference if no saved preference exists

### 4. Visual Implementation ✅
- Update `<html>` element's `dark` class based on selected theme
- Ensure all UI components respect the selected theme
- Apply consistent styling across light and dark modes

### 5. UX Considerations ✅
- Smooth transition between themes
- Clear visual indication of current theme (moon icon for dark mode, sun icon for light mode)
- Respect user's choice across sessions

## Implementation Plan

### Completed
1. ✅ Create a `ThemeProvider` component wrapping the app
2. ✅ Create a `useTheme` custom hook for theme access
3. ✅ Add theme toggle button to the layout header
4. ✅ Implement localStorage persistence
5. ✅ Update globals.css with smooth transitions
6. ✅ Test theme switching functionality

### Files Created/Modified
- `src/web/app/layout.tsx` - Added ThemeProvider and header, theme initialization script
- `src/web/app/context/ThemeContext.tsx` - New theme context with localStorage support
- `src/web/app/components/ThemeToggle.tsx` - New theme toggle component with SVG icons
- `src/web/app/components/Header.tsx` - New header component with theme toggle
- `src/web/app/globals.css` - Updated with smooth color transitions
- `src/web/app/page.tsx` - Updated to handle API errors gracefully for testing

## Implementation Details

### Theme Initialization
- Inline script in `<head>` runs before React hydration to prevent flash of unstyled content (FOUC)
- Script checks localStorage for saved theme or system preference
- Applies `dark` class to `<html>` element if needed

### ThemeProvider
- Manages `theme` state and `toggleTheme` function
- Includes `isReady` flag to handle hydration correctly
- Syncs DOM state with React state on mount

### ThemeToggle Button
- Displays sun icon when in light mode (to switch to dark)
- Displays moon icon when in dark mode (to switch to light)
- Includes proper ARIA labels for accessibility
- Uses Tailwind CSS for consistent styling with dark mode variants

### Header Component
- Displays application title and theme toggle button
- Uses `'use client'` directive for client-side rendering
- Sticky positioning for easy access while scrolling

## Testing
- ✅ Theme toggle button renders correctly
- ✅ Theme persists across page reloads via localStorage
- ✅ System preference fallback works when no preference is saved
- ✅ All UI elements properly styled in both light and dark modes
- ✅ Smooth transitions between theme changes

## Browser Compatibility
- Works with all modern browsers supporting:
  - CSS `prefers-color-scheme` media query
  - LocalStorage API
  - CSS custom properties and Tailwind dark mode

## Notes
- The implementation handles Next.js hydration properly by using an initialization script
- The `isReady` flag in ThemeContext prevents hydration mismatches
- All styles use Tailwind's built-in dark mode support with `dark:` variants
- The feature is fully backwards compatible and doesn't break existing functionality
