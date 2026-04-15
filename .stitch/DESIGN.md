# Design System Specification

## 1. Overview & Creative North Star
**The Intellectual Architect.**  
This design system is a bridge between the rigorous authority of academic tradition and the lean, functional efficiency of developer environments. It moves away from the "generic SaaS" aesthetic, instead adopting a high-end editorial feel characterized by intentional white space, structural layering, and an unwavering focus on content hierarchy.

By prioritizing tonal shifts over structural lines, the system feels integrated and "architectural." It challenges the rigid 12-column grid by utilizing asymmetrical content groupings and overlapping "glass" surfaces, ensuring the UI feels like a bespoke tool rather than a pre-built template.

---

## 2. Colors: Tonal Architecture
The palette is rooted in the academic heritage of UET Blue, but evolved for digital-first ergonomics.

### Core Palette
- **Primary (`#003E79`):** Deep, authoritative navy for core brand expression.
- **Primary Container (`#0055A2`):** The signature UET blue used for action-oriented highlights.
- **Surface & Background (`#F8F9FF`):** A tinted, "cool-white" that reduces eye strain compared to pure `#FFFFFF`.
- **On-Surface (`#111C2A`):** A high-contrast charcoal for maximum legibility.

### The "No-Line" Rule
Traditional 1px borders are strictly prohibited for defining sections. Layout boundaries must be established through:
1.  **Background Shifts:** Transitioning from `surface` to `surface-container-low`.
2.  **Negative Space:** Using the spacing scale to group related items.
3.  **Tonal Transitions:** A `surface-container-high` element naturally defines its own edge against a `surface` background without the need for a stroke.

### Signature Textures & Glass
To provide a "premium" soul, main CTAs and hero headers should utilize a subtle linear gradient from `primary` to `primary-container` at a 135-degree angle. Floating panels (e.g., search overlays, dropdowns) should utilize **Glassmorphism**: 
- **Fill:** `surface` at 80% opacity.
- **Backdrop Blur:** 12px to 20px.
- **Edge:** A "Ghost Border" using `outline-variant` at 15% opacity.

---

## 3. Typography: Editorial Authority
The type system pairs the technical precision of **Inter** with the approachable modernism of **Be Vietnam Pro**.

*   **Display & Headline (Be Vietnam Pro):** Used for primary messaging. The geometric clarity of Be Vietnam Pro establishes the "Architectural" feel. High-scale ratios (e.g., `display-lg` at 3.5rem) should be used to create dramatic, editorial focal points.
*   **Titles & Body (Inter):** Used for all functional data and long-form reading. Inter’s tall x-height ensures clarity in dense developer documentation.
*   **Labels (Inter):** Tight, uppercase or semi-bold labels facilitate quick scanning of metadata and status states.

---

## 4. Elevation & Depth: Tonal Layering
We do not use shadows to mimic height; we use **Tonal Layering** to mimic physical material stacking.

### The Layering Principle
Hierarchy is defined by stacking the `surface-container` tiers:
- **Level 0 (Base):** `surface` or `background`.
- **Level 1 (Sections):** `surface-container-low`.
- **Level 2 (Cards/Modules):** `surface-container-lowest` (pure white).
- **Level 3 (Popovers):** `surface-container-highest` with a backdrop blur.

### Ambient Shadows
Where floating is essential (e.g., a roadmap node being dragged), use an "Ambient Shadow":
- **Color:** `on-surface` tinted with `primary` (e.g., `rgba(0, 62, 121, 0.08)`).
- **Blur:** 32px – 48px.
- **Spread:** -4px.
This creates a soft glow of natural light rather than a harsh synthetic shadow.

---

## 5. Components

### Roadmap Nodes (Specific States)
Nodes reflect the "Developer Tool" aspect—clean, functional, and status-driven.
- **Done:** `primary-container` background with a subtle green tint (`#E8F5E9` overlay at 10%).
- **In Progress:** `surface-container-high` with an `orange` accent left-border (4px).
- **Pending:** `surface-variant` with `on-surface-variant` text.
- **Locked:** `surface-dim` background; text at 40% opacity; `outline` stroke.

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`). Roundedness: `md` (0.375rem). No shadow.
- **Secondary:** `surface-container-low` background. On hover, shifts to `surface-container-high`.
- **Tertiary:** Text only (`primary`). Subtle `primary-fixed-dim` background on hover.

### Input Fields & Search
- **Container:** `surface-container-lowest`.
- **Border:** Never 100% opaque. Use "Ghost Border" (`outline-variant` at 20%).
- **Focus:** 2px solid `primary`. No "outer glow."

### Cards & Lists
- **Rule:** Forbid divider lines.
- **Structure:** Use 24px vertical padding between list items. Use `surface-container-low` for hover states to define item boundaries dynamically.

---

## 6. Do’s and Don’ts

### Do
- **Do** use asymmetrical margins to create an editorial, "high-end" layout.
- **Do** rely on font weight and size (Typography Scale) to differentiate content, not color.
- **Do** use `surface-container` nesting to group information logically.
- **Do** ensure all "Glass" elements remain legible by testing against the `on-surface` contrast ratio.

### Don't
- **Don't** use 1px solid black or dark grey borders. Use background tonal shifts instead.
- **Don't** use "Neon" or high-saturation glows. Keep all light effects muted and atmospheric.
- **Don't** use standard "Drop Shadows" from component libraries. Always use the specified Ambient Shadow values.
- **Don't** clutter the UI. If a piece of information isn't vital to the developer's current flow, hide it behind a `tertiary` action or tooltip.
