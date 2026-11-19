# Light/Dark Mode Feature Specification

## Overview
Implement a user-selectable light/dark mode toggle for the task manager application. The theme preference will be persisted in local storage and respected across page reloads.

## Requirements

### 1. Theme Provider Context
- Create a React Context to manage theme state globally
- Support "light" and "dark" modes
- Provide hooks for components to access and update theme

### 2. Theme Toggle UI
- Add a theme toggle button in the header/navbar area
- Button should be visible and accessible from any page
- Display current theme state visually (icon change)

### 3. Persistence
- Save theme preference to localStorage
- Load saved preference on app startup
- Fallback to system preference if no saved preference exists

### 4. Visual Implementation
- Update `<html>` element's `dark` class based on selected theme
- Ensure all UI components respect the selected theme
- Apply consistent styling across light and dark modes

### 5. UX Considerations
- Smooth transition between themes (optional but nice)
- Clear visual indication of current theme
- Respect user's choice across sessions

## Implementation Plan

1. Create a `ThemeProvider` component wrapping the app
2. Create a `useTheme` custom hook for theme access
3. Add theme toggle button to the layout header
4. Implement localStorage persistence
5. Update globals.css with smooth transitions
6. Test theme switching functionality

## Files to Modify/Create
- `src/web/app/layout.tsx` - Add ThemeProvider and header with toggle
- `src/web/app/context/ThemeContext.tsx` - New theme context
- `src/web/app/components/ThemeToggle.tsx` - New theme toggle component
- `src/web/app/globals.css` - Update with transitions

## Testing
- Verify theme toggle works
- Verify persistence across page reloads
- Verify system preference fallback
- Verify all UI elements display correctly in both themes
