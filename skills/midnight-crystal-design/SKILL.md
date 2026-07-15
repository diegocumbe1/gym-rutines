---
name: midnight-crystal-design
description: Apply the Gym Rutines Midnight Crystal luxury performance design system. Use when designing, reviewing, or implementing Gym Rutines UI, branding, landing pages, dashboards, components, CSS/Tailwind tokens, charts, forms, navigation, or visual refinements that must feel premium, dark, executive, minimal, and performance oriented.
---

# Midnight Crystal Design

Use this skill to make Gym Rutines feel like a luxury performance operating system, not a generic fitness app. Prioritize hierarchy, restraint, and expensive-feeling precision over decoration.

## Brand Direction

Design for this statement:

> Luxury Performance System.

The product should feel close to Apple Fitness+, Whoop, Oura, Raycast, Linear, Porsche Dashboard, and Aston Martin digital experiences.

Use these adjectives as decision filters:

- Midnight
- Crystal
- Performance
- Premium
- Sophisticated
- Elite
- Modern
- Editorial
- Technical
- Executive

## Core Principles

- Design dark mode first.
- Prefer information hierarchy over decoration.
- Use spacious layouts with dense, premium controls.
- Create luxury through simplicity, sharp spacing, and quiet contrast.
- Treat blue as the hero color, but keep it deep and restrained.
- Use light as a material: subtle borders, reflections, glows, and focus states.
- Make every screen production-ready, understandable, and calm.
- Use minimal motion only when it clarifies state or polish.

## Visual Tokens

Use these CSS custom properties when adding or refactoring global styles:

```css
:root {
  --background: #05070c;
  --surface: #0a0f18;
  --surface-2: #101827;
  --surface-3: #162033;

  --primary: #14213d;
  --primary-hover: #1b2f56;
  --primary-light: #274690;
  --highlight: #315da8;

  --text-primary: #fafafa;
  --text-secondary: #d1d5db;
  --text-muted: #9ca3af;
  --text-disabled: #6b7280;

  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --info: #38bdf8;

  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 20px;
  --radius-xl: 24px;
  --radius-2xl: 32px;
}
```

Use type tokens:

```css
--text-xs: 12px;
--text-sm: 14px;
--text-md: 16px;
--text-lg: 18px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 32px;
--text-4xl: 40px;
```

Use 4px-based spacing: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`.

## Typography

- Use Satoshi for page titles, hero text, major metrics, and editorial headings.
- Use Inter for body text, labels, forms, tables, and navigation.
- Use JetBrains Mono for numeric performance data: weight, calories, dates, timers, PRs, percentages, and stats.
- Use weights 600 and 700 for headings; 400 and 500 for body.
- Keep letter spacing at `0`; do not use negative tracking.
- Avoid viewport-scaled font sizes. Use stable responsive steps instead.

If Satoshi is not installed in the project, either add it intentionally or use the closest existing heading font pattern without inventing a new visual direction.

## Materials

Use crystal surfaces sparingly:

```css
.crystal-surface {
  background: rgba(20, 33, 61, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(20px);
}

.crystal-highlight {
  border: 1px solid rgba(49, 93, 168, 0.25);
  box-shadow: 0 0 30px rgba(49, 93, 168, 0.15);
}
```

Elevation levels:

- Level 1: `border: 1px solid rgba(255,255,255,.05)`.
- Level 2: `box-shadow: 0 8px 30px rgba(0,0,0,.30)`.
- Level 3: `box-shadow: 0 12px 40px rgba(0,0,0,.45)`.

Avoid heavy gradients and excessive glassmorphism. A component can feel premium with a subtle border, careful spacing, and one controlled reflection.

## Components

### Buttons

- Primary: deep luxury blue `--primary`, hover `--primary-hover`.
- Secondary: transparent or surface background with subtle border.
- Ghost: no background, reserved for low-emphasis actions.
- Destructive: use red only for irreversible or dangerous actions.
- Keep buttons dense, crisp, and premium. Avoid pill shapes.

### Inputs

- Use large click areas, dark surfaces, soft borders, and subtle focus glow.
- Use focus outline: `1px solid rgba(49,93,168,.50)`.
- Keep labels clear, compact, and above or beside fields depending on density.

### Cards

- Use cards as the main primitive for metrics, workouts, plans, and logs.
- Cards should feel elevated and calm, with crystal material, fine borders, and subtle reflections.
- Do not nest UI cards inside other cards.
- Keep radii controlled; avoid bubble-like mobile UI.

### Charts

- Use `#315da8`, `#274690`, and `#1b2f56` as the chart palette.
- Avoid rainbow charts.
- Prioritize readable axes, clear labels, and numeric scanability.

### Icons

- Use Lucide icons when available.
- Use sizes `18px`, `20px`, or `22px`.
- Use stroke width `1.75`.
- Prefer icons in icon buttons when the action is familiar; add tooltips for less obvious controls.

## Layout

Desktop:

- Center dashboard content with a max width near `1600px`.
- Use large margins and generous section spacing.
- Prioritize performance data, current plan state, upcoming work, and recent progress.

Mobile:

- Use thumb-friendly controls.
- Prefer bottom navigation for primary app destinations.
- Use large, stable cards for core workout and metric flows.
- Ensure text and controls never overlap or squeeze awkwardly.

## Motion

Use durations `150ms`, `200ms`, or `250ms` with `ease-out`.

Avoid bounce, spring, exaggerated transitions, decorative animation, or motion that slows down repeated training workflows.

## Implementation Checklist

When implementing or reviewing UI:

1. Confirm the first screen communicates serious training and premium performance.
2. Make the most important metric or action visually dominant.
3. Apply the token colors before inventing new colors.
4. Use restrained radii and avoid pill-shaped defaults.
5. Keep surfaces dark, borders fine, and shadows subtle.
6. Use JetBrains Mono for performance numbers.
7. Use Lucide icons for app controls.
8. Test desktop and mobile layouts for text overflow and overlap.
9. Remove anything that feels like a template, cartoon fitness app, or generic AI dashboard.

## Forbidden Patterns

Never generate:

- Purple SaaS UI.
- Tailwind template-looking dashboards.
- Neon cyberpunk styling.
- Heavy gradients.
- Huge shadows.
- Excessive glassmorphism.
- Generic fitness illustrations.
- Emoji-based interfaces.
- Generic AI dashboard patterns.
- Bright blue interfaces.
- Canva-like layouts.
- Dribbble trend overload.

Final identity: Midnight Crystal Luxury.
