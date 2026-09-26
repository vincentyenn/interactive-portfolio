# Loft as the Full Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the interactive loft into the complete portfolio site, with all destinations available inside one non-scrolling viewport.

**Architecture:** Keep the existing Blender GLB and React Three Fiber camera marks. Add hash-route state in `App.tsx` so route, camera focus, project selection, and browser history stay in sync; render all portfolio content in the existing semantic HTML focus panel. Remove the lower scrolling page and adapt the fixed room shell and destination navigation for desktop, mobile, keyboard, reduced motion, and WebGL failure.

**Tech Stack:** React 19, TypeScript, Vite, Three.js, React Three Fiber, Drei, GSAP, native History API, CSS.

---

## File Map

- Modify `src/App.tsx`: route parsing/serialization, History API synchronization, destination navigation, project list/detail states, skip link, and removal of the lower content page.
- Keep `src/LoftScene.tsx` API unchanged unless a compile-time mismatch appears. It already receives `focus` and `selectedProject`, animates to each destination, and calls `onFocus` / `onProject` for room hotspots and blueprints.
- Modify `src/styles.css`: make the app a fixed `100dvh` viewport, remove long-page rules, preserve the loft composition, and add persistent desktop navigation plus the compact mobile menu and full-screen destination panel.
- Modify `README.md`: describe the entire-site room navigation and hash routes instead of a hero followed by page content.
- Keep `content/portfolio.json`, the GLB, scripts, and package dependencies unchanged.

## Task 1: Add the Route Codec

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Define the route state and route parser**

Add this below the existing `sections` declaration. It maps public route names to the camera focus names and project slugs to the existing array indexes.

```tsx
type RouteState = { focus: Focus, selectedProject: number | null }

function routeFromHash(hash: string): RouteState {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (!parts.length || parts[0] === 'room') return { focus: 'room', selectedProject: null }
  if (parts[0] === 'overview') return { focus: 'computer', selectedProject: null }
  if (parts[0] === 'projects') {
    if (!parts[1]) return { focus: 'projects', selectedProject: null }
    const index = portfolio.projects.findIndex((project) => project.id === parts[1])
    return index < 0 ? { focus: 'room', selectedProject: null } : { focus: 'projects', selectedProject: index }
  }
  if (parts[0] === 'experience' || parts[0] === 'about' || parts[0] === 'contact') {
    return { focus: parts[0], selectedProject: null }
  }
  return { focus: 'room', selectedProject: null }
}
```

- [ ] **Step 2: Add the canonical route serializer**

```tsx
function hashForRoute(route: RouteState): string {
  if (route.focus === 'room') return '#/room'
  if (route.focus === 'computer') return '#/overview'
  if (route.focus === 'projects') {
    const project = route.selectedProject === null ? null : portfolio.projects[route.selectedProject]
    return project ? `#/projects/${project.id}` : '#/projects'
  }
  return `#/${route.focus}`
}
```

- [ ] **Step 3: Review route mappings against the spec**

Confirm the parser and serializer pair covers `#/room`, `#/overview`, `#/projects`, each project slug, `#/experience`, `#/about`, and `#/contact`. Unknown route names and unknown project slugs must resolve to the room state.

## Task 2: Synchronize React State with Browser History

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Initialize the app from the address bar**

Replace the separate `focus` and `selectedProject` state declarations with one route state. Normalize an empty or invalid hash with `replaceState` so loading the root opens at `#/room`.

```tsx
const [route, setRoute] = useState<RouteState>(() => {
  const initial = routeFromHash(window.location.hash)
  const canonical = hashForRoute(initial)
  if (window.location.hash !== canonical) window.history.replaceState(null, '', canonical)
  return initial
})
const { focus, selectedProject } = route
```

- [ ] **Step 2: Add one route transition function**

All buttons and 3D callbacks must use this function. It pushes only changed URLs and updates React state immediately because `pushState` does not emit `popstate`.

```tsx
const navigate = useCallback((next: RouteState) => {
  const hash = hashForRoute(next)
  if (window.location.hash !== hash) window.history.pushState(null, '', hash)
  setRoute(next)
}, [])
```

- [ ] **Step 3: Restore route state on Back, Forward, and external hash changes**

```tsx
useEffect(() => {
  const syncRoute = () => {
    const next = routeFromHash(window.location.hash)
    const canonical = hashForRoute(next)
    if (window.location.hash !== canonical) window.history.replaceState(null, '', canonical)
    setRoute(next)
  }
  window.addEventListener('popstate', syncRoute)
  window.addEventListener('hashchange', syncRoute)
  return () => {
    window.removeEventListener('popstate', syncRoute)
    window.removeEventListener('hashchange', syncRoute)
  }
}, [])
```

- [ ] **Step 4: Route existing callbacks through `navigate`**

Replace state-only updates with `navigate({ focus: next, selectedProject: null })`, `navigate({ focus: 'projects', selectedProject: index })`, and `navigate({ focus: 'room', selectedProject: null })`. Keep reduced-motion camera handling inside the existing `CameraDirector`.

## Task 3: Make Projects Addressable as List and Detail States

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Keep the workbench list separate from project detail**

In `FocusPanel`, render the blueprint choices only when `selectedProject === null`. When a project is selected, replace the list with that project's detail and a **Back to blueprints** button. Use the selected project's `id` to generate the route through `navigate`.

- [ ] **Step 2: Keep project details within one panel view**

Show the existing title, summary, year, status, tools, and optional repository link. Do not render the list and detail at the same time. Keep a separate **Back to the loft** action that routes to `#/room`.

- [ ] **Step 3: Preserve focus as the project route changes**

Add `lastProjectIndexRef` in `App` and update it whenever `onProject(index)` opens a blueprint. Focus the project detail heading after opening a blueprint. When the route returns to `#/projects` through the Back to blueprints button or browser Back/Forward, focus the saved blueprint button if the list is mounted. Returning to the room focuses the originating destination control when it exists.

## Task 4: Route Every Navigation Entry Point

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Use the same route transition for all HTML controls**

Wire the room navigation, Start at the computer, brand button, header Contact control, panel destination links, Back to the loft button, and canvas callbacks to `navigate`. Map the computer to `#/overview`; keep the other destination names in their route paths.

- [ ] **Step 2: Keep external destinations as external links**

Leave GitHub, LinkedIn, and project repository links as ordinary anchors with their existing `target` and `rel` attributes. Remove only anchors that jump to the old lower page.

- [ ] **Step 3: Keep destination navigation available while a panel is open**

Remove the focused-state rule that hides `.room-nav` on desktop. The active route stays highlighted and users can switch directly between destinations.

## Task 5: Replace the Scrolling Page with One Viewport

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Remove the lower `SiteContent` page**

Delete the `SiteContent` component and its render after the hero. Remove the old footer, `#portfolio-content` target, and scroll-to-content links. Keep all portfolio facts in the Overview, Projects, Experience, About, and Contact panels.

- [ ] **Step 2: Make the loft app fill and clip to the viewport**

Set the root app shell to `height: 100dvh; min-height: 0; overflow: hidden`. Set `html`, `body`, and `#root` to fill the viewport and disable document vertical overflow. Preserve the existing canvas size and vignette layers.

- [ ] **Step 3: Keep all panel content inside the viewport**

Remove `overflow: auto` from `.focus-panel`. Adjust desktop panel spacing and mobile type/layout so the current portfolio copy fits without panel scrolling. Keep the 3D room visible behind the panel and keep the camera transition visible.

- [ ] **Step 4: Replace the scroll-based skip link**

Give the room navigation `id="room-navigation"` and `tabIndex={-1}`. The skip link prevents anchor scrolling and focuses that navigation element, so keyboard users can bypass the decorative canvas without changing routes.

## Task 6: Add Fixed Mobile Navigation and Panels

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add the compact mobile destination menu control**

Add a button in the header with an accessible name, `aria-expanded`, and a state-controlled destination menu. Selecting a destination closes the menu and calls `navigate`.

- [ ] **Step 2: Keep mobile views within the same viewport**

At widths up to 700px, use the full-screen destination panel and compact menu described in the spec. Preserve a visible path back to the room and avoid fixed controls covering the panel's final link.

- [ ] **Step 3: Account for short mobile viewports and safe areas**

Use `100dvh`, safe-area insets, and the existing short-height media query. Ensure the contact action, project Back controls, and About/Experience copy remain visible without vertical page or panel scrolling.

## Task 7: Preserve Loading, Fallback, Motion, and Accessibility Behavior

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Keep navigation usable during scene loading**

Keep the header, route menu, and opening intro outside the Suspense boundary. The current `Preparing the loft…` status remains announced while the GLB loads.

- [ ] **Step 2: Keep the same routes when WebGL fails**

Retain the existing WebGL detection, error boundary, and context-loss handling. Render all HTML panels and route controls over the existing CSS background when the scene fails; the panels must not depend on the lower page.

- [ ] **Step 3: Keep route changes accessible**

Use semantic buttons for in-site route transitions, maintain visible keyboard focus, focus the active panel heading, preserve focus on Back, and keep the canvas marked decorative to assistive technology.

- [ ] **Step 4: Preserve reduced-motion behavior**

Keep `prefers-reduced-motion` passed to `LoftScene`; reduced-motion users receive immediate camera changes. Do not add route animations to the DOM panels that bypass the existing reduced-motion CSS.

## Task 8: Update Project Documentation and Check the Full Experience

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Describe the site as one room-based portfolio**

Update the README introduction and exploration instructions to state that Overview, Projects, Experience, About, and Contact all live in the full-screen loft. Document the hash-route format, project-detail Back behavior, no-WebGL fallback, and keyboard navigation.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite complete without errors; assets remain under the `/interactive-portfolio/` base path.

- [ ] **Step 3: Check the approved acceptance criteria in the browser**

Use the running preview and check desktop and mobile: no document or panel vertical scrolling; all five destinations via hotspot and HTML controls; each project route and Back to blueprints; direct route refresh and browser Back/Forward; keyboard focus; reduced-motion camera changes; and the `?no3d=1` fallback.

- [ ] **Step 4: Review the final changes and commit**

Run `git diff --check`, inspect the route and layout changes, then commit the implementation with message `feat: make the loft the full portfolio site`.

## Spec Coverage

- Full viewport and no scroll: Tasks 5 and 6.
- Room hotspots and HTML navigation: Tasks 2 and 4.
- Project blueprint details and return path: Task 3.
- Direct routes, refresh, Back, and Forward: Tasks 1 and 2.
- Keyboard, touch, focus, and reduced motion: Tasks 5, 6, and 7.
- Loading and WebGL fallback: Task 7.
- GitHub Pages base path and documentation: Tasks 1 and 8.
