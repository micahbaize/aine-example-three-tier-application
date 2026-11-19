# Light/Dark Theme Feature Spec

## Goals
- Provide users with a light and dark theme option for the entire application
- Persist theme preference across sessions using local storage
- Default to system preference on first visit
- Enable smooth transitions between themes
- Apply consistent theming across all UI components (backgrounds, text, buttons, cards, inputs, etc.)

## Non-goals
- Backend theme preference storage (frontend-only feature)
- Theme customization beyond light/dark
- Per-page or per-component theme overrides

## UX / Behavior
1. **Theme Toggle Button**: A button appears in the top-right of the header that allows users to switch between light and dark themes
2. **Default Behavior**: On first visit, the app respects the user's system theme preference (via `prefers-color-scheme` media query)
3. **Persistence**: User's theme choice is saved to local storage and restored on subsequent visits
4. **Smooth Transitions**: When toggling themes, all color changes animate smoothly (CSS transitions, ~200-300ms)
5. **Full Coverage**: All UI components receive theme styling—backgrounds, text, buttons, cards, form inputs, borders, etc.
6. **Visual Feedback**: The toggle button clearly indicates the current theme (e.g., sun/moon icon, tooltip, or text label)

## API Surface
- **Local Storage Key**: `theme-preference` (value: `"light"` or `"dark"`)
- **CSS Variables**: Theme colors defined as CSS custom properties applied to `:root` element
  - Example: `--bg-primary`, `--bg-secondary`, `--text-primary`, `--text-secondary`, `--accent`, etc.
- **Toggle Function**: Button onClick handler that switches theme and updates local storage
- **System Preference Detection**: On app load, check system preference if no saved preference exists

## Implementation Approach
1. **Create a theme context/state management** (React context or simple state) to manage current theme
2. **Initialize theme on app mount**: Check local storage → if not found, check system preference → if neither, default to light
3. **Add CSS custom properties** for all colors used in the app, with light and dark variants
4. **Apply theme class or data attribute** to `<html>` or `<body>` element that triggers CSS variable swaps
5. **Add CSS transitions** on affected properties for smooth switching
6. **Create toggle button component** in header (top-right) that updates theme state and persists to local storage
7. **Test all components** render correctly in both themes
8. **Add smooth animation** via CSS transitions when switching themes

## Acceptance Criteria
- [ ] Theme toggle button appears in the top-right header
- [ ] Clicking the button switches between light and dark themes with smooth animation
- [ ] All UI components (backgrounds, text, buttons, cards, inputs) change colors appropriately
- [ ] Theme preference is saved to local storage and restored on page reload
- [ ] System preference is respected on first visit (no saved preference)
- [ ] Transitions between themes are smooth (~200-300ms)
- [ ] Both light and dark themes are visually distinct and readable
- [ ] Theme toggle button clearly indicates the current theme
