# Light/Dark Mode Implementation

## Overview

This implementation adds a complete light/dark mode toggle system to the Aine Example Three-Tier Application. Users can switch between three theme options:

- **☀️ Light Mode**: Forces light theme
- **🖥️ System Mode**: Follows the system's color scheme preference
- **🌙 Dark Mode**: Forces dark theme

## Key Features

✅ **Persistent Theme Preference** - User's choice is saved to localStorage and survives page reloads
✅ **System Preference Detection** - Respects `prefers-color-scheme` media query
✅ **No Flash on Load** - Theme script initializes before React hydration
✅ **Smooth Transitions** - Visual transitions between theme changes
✅ **Tailwind Integration** - Uses Tailwind's `dark:` class strategy
✅ **Accessible** - Clear visual indicators and semantic HTML

## Architecture

### Components

#### 1. **ThemeProvider** (`src/web/app/providers/ThemeProvider.tsx`)
A React Context provider that manages the entire theme state:
- Stores theme preference in localStorage
- Listens to system theme changes
- Provides `useTheme()` hook for components
- Applies theme to DOM via `dark` class on `<html>`

**API:**
```typescript
useTheme() => {
  theme: 'light' | 'dark' | 'system'    // Current preference
  setTheme: (theme) => void              // Change preference
  resolvedTheme: 'light' | 'dark'        // Actual applied theme
}
```

#### 2. **ThemeToggle** (`src/web/app/components/ThemeToggle.tsx`)
A client component that renders the theme selection UI:
- Three buttons with emoji indicators
- Visual feedback showing current selection
- Smooth styling transitions

### Integration Points

- **`layout.tsx`**: Wraps app with `<ThemeProvider>`
- **`TaskManager.tsx`**: Includes `<ThemeToggle>` in the sidebar header

## How It Works

1. **Initialization**
   - Page loads, browser renders HTML
   - React renders ThemeProvider
   - Provider checks localStorage for saved preference
   - DOM class is updated accordingly

2. **User Switches Theme**
   - User clicks a theme button in ThemeToggle
   - `setTheme()` is called
   - Preference is saved to localStorage
   - `dark` class is added/removed from `<html>`
   - Tailwind re-applies styles based on class

3. **System Theme Changes**
   - When theme is set to "System"
   - `prefers-color-scheme` media query listener is active
   - If user's system theme changes, it's detected
   - Theme automatically updates

4. **Page Reload**
   - localStorage is checked
   - Stored preference is applied
   - No flash or layout shift

## Styling

The app uses Tailwind CSS's dark mode class strategy:

```tailwind
/* Light mode (default) */
.bg-white

/* Dark mode (when 'dark' class on <html>) */
.dark:bg-zinc-900
```

Existing styles already support both modes through CSS:
- Background colors
- Text colors
- Border colors
- All use Tailwind's light/dark variants

## Testing the Feature

### In the Web App
1. Navigate to the application
2. Look for theme toggle in the header
3. Click the buttons (☀️/🖥️/🌙)
4. Theme changes immediately
5. Refresh page - preference persists
6. Change system theme - "System" mode follows it

### Using the Demo
Open `theme-demo.html` in a browser to test the theme functionality in isolation without needing the full app backend.

## Browser Support

| Feature | Support | Fallback |
|---------|---------|----------|
| localStorage | IE8+ | Uses system preference |
| prefers-color-scheme | Chrome 76+, Firefox 67+, Safari 12.1+ | Defaults to light |
| CSS :dark class | Modern browsers | Graceful degradation |

## Files Changed

### Created
- `src/web/app/providers/ThemeProvider.tsx` - Theme state management
- `src/web/app/components/ThemeToggle.tsx` - Theme selector UI
- `theme-demo.html` - Standalone test page
- `SPEC.md` - Feature specification

### Modified
- `src/web/app/layout.tsx` - Add ThemeProvider wrapper
- `src/web/app/components/TaskManager.tsx` - Add ThemeToggle component

## Performance Considerations

- Theme state is minimal (string + function)
- localStorage operations are synchronous but fast
- Media query listener is set only when needed
- CSS class toggling triggers browser reflow (unavoidable for theme)
- No JavaScript blocking on first paint

## Future Enhancements

Possible future improvements:
- Add theme transition animations
- Allow custom color schemes
- Remember theme per page/section
- Add theme preview before applying
- Integration with user preferences API
- Server-side theme support (SSR)

## Troubleshooting

**Q: Theme doesn't persist after refresh**
- Check if localStorage is enabled in browser
- Check browser console for errors
- Clear localStorage and retry: `localStorage.clear()`

**Q: Flash of wrong theme on load**
- This should not happen (initialization happens early)
- Try hard refresh: `Ctrl+Shift+R`
- Check if browser cached the page

**Q: Dark mode not working**
- Verify `dark` class is in HTML
- Check Tailwind CSS is properly configured
- Verify `dark:` classes exist in your CSS

## Code Examples

### Using the theme in a component

```typescript
'use client';

import { useTheme } from '@/app/providers/ThemeProvider';

export function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <div>
      Current theme: {theme}
      Actual theme: {resolvedTheme}
      <button onClick={() => setTheme('dark')}>
        Go Dark
      </button>
    </div>
  );
}
```

### CSS dark mode styles

```css
/* Light mode (default) */
.card {
  background-color: white;
  color: black;
}

/* Dark mode */
.dark .card {
  background-color: #1f2937;
  color: white;
}
```

Or with Tailwind:

```html
<div class="bg-white dark:bg-gray-900 text-black dark:text-white">
  Content
</div>
```
