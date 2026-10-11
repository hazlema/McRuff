# McRuff: Bite the Crime

The user requested a playable game about Buster, a crime-fighting dog who bites criminals, with a Doom-like first-person presentation. They delegated all creative and technology decisions. This is a new game; design and implementation choices are made autonomously under that instruction.

A buildless HTML5 Canvas game with a raycast 3D world, original pixel sprites, original illustrated cover, and synthesized audio. Three connected levels: The Backstreets, The Meatpacking District, and The Docks. Bite to arrest criminals, bark to stun, collect treats to heal, and reach the exit after clearing each district. The final level has a boss. A five-to-ten-minute campaign with win, lose, pause, restart, difficulty choice, controls and sound settings.

Visual direction: 1990s crime-horror arcade. Asphalt #101519, pale bone #e7dcc2, rust #d4482f, brass #b99b58, smoke #718080, police blue #517d96. Condensed bold system type for titles, monospace for diegetic readouts. Illustrated full-screen title background with strong left-aligned typography; gameplay fills the viewport with compact HUD and a visible snout. Rendering is intentionally pixelated. Violence is arcade and non-graphic; goons are arrested.

Architecture: a pure game simulation (levels, collision, combat, pickups, enemy pathfinding), a Canvas raycaster and procedural sprite library, Web Audio synthesized effects/music, and browser input/UI. No runtime packages or network requests. Keyboard and mouse desktop controls, keyboard-only alternative, touch controls. Preferences and best score are optional local storage, with safe failure handling. Pause on focus loss. Game input must not leak into menus.

Validation: Node behavioral tests for wall collision, line of sight, bite reach and wall occlusion, bark cooldown, enemy damage, pickup clamping, level traversal, exit gating, and campaign completion. Browser checks for launch, control input, pause/resume, restart, settings, responsive layout, rendered frame, console errors, and campaign progression.
