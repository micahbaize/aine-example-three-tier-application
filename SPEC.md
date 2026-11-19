# Light/Dark Mode Feature Specification

## Goals

- Add a manual dark mode toggle button to the UI (placed in the top-right corner)
- Detect and respect user's system preference (light or dark) on first visit
- Persist user's theme preference across sessions in local storage
- Apply dark mode styling to all pages and components using existing color scheme

## Non-goals

- Create new color palettes; use existing Tailwind dark mode classes and CSS variables
- Change the existing dark mode class-based approach in Tailwind
- Add multiple theme options beyond light/dark
- Add theme transition animations

## UX / Behavior

1. **System Preference Detection**: On first visit, detect the user's system color scheme preference via `prefers-color-scheme` media query
2. **Manual Toggle**: Place a toggle button in the top-right corner of the page that allows users to switch between light and dark mode
3. **Persistence**: Store the user's preference in browser local storage under a key (e.g., `theme`)
4. **Application**: Apply the selected theme to the `<html>` element using the `dark` class (Tailwind's built-in approach)
5. **Consistency**: Dark mode styles should apply to all pages and components (currently already using `dark:` prefixes)

## API Surface

### Client Component: ThemeToggle

- A button component (or similar) that:
  - Displays current theme state (icon or text)
  - Toggles between light and dark on click
  - Updates local storage
  - Updates the DOM (`html` element class)

### Theme Provider/Hook (if needed)

- Initialize theme on app load:
  - Check local storage for saved preference
  - If none, check system preference
  - Apply theme to `<html>` element
  - Store preference in local storage

## Implementation Approach

1. **Create a theme provider or client component** that:
   - Runs on client-side only
   - Initializes theme on mount (checks local storage, then system preference)
   - Provides a function to toggle theme
   - Updates `<html>` element's `dark` class
   - Saves preference to local storage

2. **Create a ThemeToggle component** placed in the layout:
   - Button in top-right corner
   - Calls the theme toggle function on click
   - Shows current theme state

3. **Integrate into layout.tsx**:
   - Add theme provider/initialization
   - Add ThemeToggle button to header or top-right

4. **Use existing dark mode setup**:
   - Tailwind's `dark:` prefix classes (already in use)
   - CSS variables for background/foreground (already in place)
   - No need to modify tailwind.config.ts

## Acceptance Criteria

- [ ] Toggle button appears in top-right corner of the page
- [ ] Clicking the toggle switches between light and dark mode for all content
- [ ] System preference is detected on first visit and applied
- [ ] User's theme preference persists across page refreshes
- [ ] User's theme preference persists across browser sessions
- [ ] All existing pages and components respect the selected theme
- [ ] Toggle button is accessible (keyboard navigable, appropriate ARIA labels)
- [ ] No console errors or warnings related to theme switching
- [ ] Works in modern browsers (Chrome, Firefox, Safari, Edge)
