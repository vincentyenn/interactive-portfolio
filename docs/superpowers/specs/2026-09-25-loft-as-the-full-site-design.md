# Loft as the Full Site

## Status

Draft for user review. The persistent-loft direction was approved in chat on 2026-09-25; the route and responsive behavior below are the proposed implementation details.

## Goal

Make the existing interactive loft the complete portfolio website. The experience stays within one viewport. Visitors navigate to Overview, Projects, Experience, About, and Contact through the loft objects, the HTML destination navigation, or addressable URLs.

## Current State

The app already renders one Blender-exported loft scene, camera transitions for each destination, accessible HTML navigation, destination panels, and a no-WebGL fallback. `src/App.tsx` then adds a separate long `SiteContent` page after the full-screen hero. Links in that lower page depend on document scrolling, and the current room navigation state is not synchronized with browser history.

## Recommended Approach

Keep the current single GLB and camera-mark system. Remove the below-the-fold portfolio page and make the existing destination panels the only presentation of portfolio content. This avoids loading multiple scenes while retaining the interaction the user approved: click a meaningful room object, fly the camera to it, and show its content in HTML.

Do not add a first-person free-roam mode or create separate 3D rooms in this change.

## Navigation and URL State

Use hash routes so the site continues to work at the GitHub Pages project base path without a server rewrite:

- `#/room` for the opening loft and introduction
- `#/overview` for the computer and portfolio summary
- `#/projects` for the overhead workbench and blueprint list
- `#/projects/:project-id` for one blueprint's project detail
- `#/experience`, `#/about`, and `#/contact` for the remaining destinations

The initial empty hash resolves to `#/room`. Clicking a hotspot or destination control updates the route and selects the matching camera and panel. Opening a project adds a project-detail history entry; returning to the blueprint list restores the workbench state. Browser Back and Forward restore the matching destination, camera, and project selection. A direct visit or refresh on any valid route opens that state. Unknown destinations and project IDs resolve to the room route.

Replace in-page anchor links that currently expect the lower page with route-aware controls. Keep external GitHub and LinkedIn destinations as normal links.

## Full-Viewport Layout

- The application occupies `100dvh`; the document itself does not scroll.
- Remove `SiteContent`, the lower-page footer, and all scroll-to-content cues.
- Keep the introduction, portfolio summary, project list and details, experience, about copy, and contact links in the destination panels.
- Design the panels to fit the viewport at supported desktop and mobile sizes. Do not rely on panel-internal vertical scrolling; keep the displayed copy concise and adapt panel layout and type size for short screens.
- Keep a clear route back to the room from each destination. Desktop keeps the destination navigation available while a panel is open. Mobile uses a compact menu control that opens the same destination links without adding page scroll.
- Keep the 3D room visible during camera transitions and as context behind destination content. Use panel surfaces and contrast appropriate to the existing warm, low-light art direction.

## Project Flow

Selecting Projects moves the camera to the top-down workbench and presents the three blueprint choices. Selecting a blueprint moves to a project-detail state, displays that project's title, summary, year, status, tools, and repository link when available, and updates the URL. A clear Back to blueprints action returns to the list without leaving the workbench. A separate Back to room control returns to the opening state.

## Responsive and Accessible Behavior

- Keep semantic HTML controls as the source of navigation; 3D hotspots remain pointer enhancements.
- Every destination is usable by keyboard and touch, has a visible focus state, and transfers focus to the active panel heading. Returning to the room restores focus to the originating destination control when possible.
- On mobile, use viewport-sized destination views and a compact menu so content remains readable without page scrolling.
- Honor `prefers-reduced-motion` by switching camera routes immediately.
- Keep the skip link, but point it to the destination navigation so keyboard users can bypass the decorative canvas without jumping to removed content.

## Loading and Failure Behavior

The header, introduction, and destination navigation remain usable while the GLB loads. If WebGL, the GLB, or the rendering context fails, show a clear unavailable state and keep all routes and HTML destination panels working against the existing non-WebGL background treatment. Do not require a long fallback page.

## Scope and Files

Expected changes are concentrated in `src/App.tsx`, `src/LoftScene.tsx`, `src/styles.css`, and `README.md`. Keep the existing GLB and content data unless implementation reveals a concrete issue. Do not add a routing dependency unless native hash handling proves insufficient.

## Acceptance Checks

1. The page remains within one viewport and has no document vertical scroll on desktop or mobile.
2. Every room hotspot and HTML destination control opens the matching panel and camera state.
3. Each blueprint opens the correct project detail, and Back to blueprints restores the workbench list.
4. Direct route loads, refresh, browser Back, and browser Forward restore the expected state.
5. Keyboard, touch, focus return, and reduced-motion behavior remain usable.
6. WebGL failure leaves every destination and all portfolio content available.
7. The production build succeeds and the GitHub Pages base path remains `/interactive-portfolio/`.

## Risks and Mitigations

- **Route state can drift from UI state.** Parse the hash in one place and route every navigation action through the same state transition.
- **Short mobile viewports can constrain text.** Use a full-screen content state, compact navigation, and concise copy; confirm at phone and short-height viewports.
- **Removing the long page can hide content from fallback users.** Keep all portfolio content in semantic HTML destination panels regardless of WebGL availability.
- **Hash routing can conflict with anchors.** Remove page-section anchors and reserve hash fragments for app routes; preserve external URLs unchanged.
