# SPEC: Light / Dark Mode Toggle

Status: Draft (spec only, not yet implemented)

## Goals

- Let users choose a light or dark color theme inside the app, overriding the operating system setting.
- Keep "follow the system" as the default so existing users see no change until they pick something.
- Remember the user's choice across visits in the same browser.
- Avoid a flash of the wrong theme when the page loads.
- Make every existing component render correctly in both themes.

## Non-goals

- No server-side or per-user storage of the theme (no database or API changes).
- No redesign or new color palette. The existing zinc-based dark palette and blue accents are kept.
- No theme changes for API responses, documentation, or the database tier.
- No per-page or per-project themes.
- No custom theme colors or user-editable palettes.

## UX / behavior

- **Modes:** three options, shown as a segmented control or cycle button: **Light**, **Dark**, **System**.
  - **System** is the default for first-time visitors. It follows `prefers-color-scheme` and updates live if the OS setting changes while the page is open.
  - **Light** and **Dark** force that theme regardless of the OS setting.
- **Location:** the toggle sits in the top-right corner of the main content column, aligned with the page heading, so it is visible without scrolling and does not clutter the task sidebar.
- **Persistence:** the chosen mode is stored in `localStorage` under the key `theme` with values `light`, `dark`, or `system`. Unset means `system`.
- **Load behavior:** an inline script in the root layout reads the stored value and sets the theme on `<html>` before first paint, so there is no flash of the wrong theme.
- **Scope of change:** only the web frontend in `src/web` is affected.
- **Accessibility:** the toggle is a group of buttons with `aria-pressed` on the active option, has visible focus styles, and labels each option with text (not color or icon alone).
- **Fallback:** if `localStorage` is unavailable (for example, blocked by privacy settings), the app behaves as **System** and the toggle still works for the current session.

## API surface

None. This feature is entirely client-side. No endpoints, request/response shapes, or database migrations change.

## Implementation approach

1. **Tailwind dark variant (`src/web/app/globals.css`):** switch the `dark:` variant from the media query to a class-based variant, e.g. `@custom-variant dark (&:where(.dark, .dark *));`. Remove the `@media (prefers-color-scheme: dark)` block for `:root` and instead define the dark CSS variables under `.dark`. Keep a `:root` light default.
2. **System mode:** when the mode is `system`, apply the `dark` class based on `matchMedia('(prefers-color-scheme: dark)')`, and listen for changes to that query.
3. **Theme module:** a small client-side helper (for example `src/web/app/theme.ts`) that reads/writes `localStorage`, resolves the effective theme, and applies or removes the `dark` class on `<html>`.
4. **Inline script (`src/web/app/layout.tsx`):** a `<script>` placed in `<head>` (with `suppressHydrationWarning` on `<html>`) that performs the same resolution as the helper before paint.
5. **Toggle component:** a `ThemeToggle` client component rendered in the header area of `TaskManager.tsx` (top-right of the main column).
6. **Component audit:** review every component in `TaskManager.tsx` and `page.tsx` for hard-coded light-only colors and add `dark:` variants where missing. Existing `dark:` classes stay as they are.
7. **Metadata:** update the page `<title>` and description only if they are already being changed by another task; otherwise leave them alone.

## Acceptance criteria

- [ ] The toggle shows Light, Dark, and System, and the active option is clearly indicated and has `aria-pressed` set.
- [ ] With no stored preference and OS set to dark, the page renders dark. With OS set to light, it renders light.
- [ ] Choosing **Light** renders light even when the OS is dark; choosing **Dark** renders dark even when the OS is light.
- [ ] In **System** mode, changing the OS theme while the page is open updates the page without a reload.
- [ ] The chosen mode persists after a page reload and a browser restart (stored in `localStorage` key `theme`).
- [ ] On reload with a stored dark preference, the first painted frame is dark (no white flash). Verified by a hard reload with the inline script active.
- [ ] Every visible element (heading, sidebar, project buttons, forms, task list, empty state, footer text, hover/focus states) has readable contrast in both themes.
- [ ] If `localStorage` throws, the page still loads and falls back to System mode without errors in the console.
- [ ] No changes to `src/api`, `src/db`, or any API response shape.
- [ ] `npm run build` and `npm run lint` in `src/web` pass.
- [ ] The existing test suite still passes.
