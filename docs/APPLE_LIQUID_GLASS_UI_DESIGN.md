# Apple Liquid Glass UI Design System — Complete Reference

> Apple's unified design language introduced at WWDC 2025. The company's broadest design update ever, applied across iOS 26, iPadOS 26, macOS Tahoe, watchOS 26, tvOS 26, and visionOS 26.

---

## 1. Core Concept

**Liquid Glass** is a dynamic "digital meta-material" that combines:
- Real-time blur
- Depth-based refraction
- Specular highlights

to create floating panels and controls that feel like physical glass objects. It gives digital interfaces "the elegance and vitality of matter" (Alan Dye, VP of Human Interface Design).

---

## 2. Four Core Design Principles

| Principle | Description |
|-----------|-------------|
| **Lensing & Refraction** | Dynamically bends and shapes light to communicate layering |
| **Fluid Motion & Interaction** | Creates responsive, gel-like flexibility in interactions |
| **Dynamic Adaptivity** | Continuously adapts based on content and environment for legibility |
| **Unified Design Language** | Establishes consistency across all Apple platforms |

---

## 3. Visual Elements & Optical Properties

### 3.1 Blur & Transparency
- **Refined translucency** creates spatial layering
- **Real-time blur** with depth-based refraction
- **Frosted glass effect** — optimized blur for performance
- **Glass depth** — limit to 20 or below for UI controls, max 30
- **Frost parameter** — typically 10–25 (Figma)
- **Background blur** — 6–10px radius for frosted-glass effect
- **Opacity** — 10–20% for translucent interaction with background
- **Blend modes** — Plus Lighter or Screen

### 3.2 Refraction
- **Snell's law** — light bends at glass-air boundaries
- **Refraction offset** — varies based on surface angle
- **Depth-based** — thicker at center, thinner at beveled edges
- **Index of refraction (IOR)** — ~1.5 for glass

### 3.3 Chromatic Dispersion
- **RGB channel separation** — blue refracts more than red
- **Subtle rainbow fringes** at edges — hallmark of quality glass
- **Edge-only** — flat center has no dispersion
- **Dispersion amount** — typically 0.5–1.0 multiplier

### 3.4 Specular Highlights
- **Phong/Blinn-Phong** specular model
- **Shininess** — 32–128 for highlight size
- **F0 = 0.04** — glass at normal incidence
- **Environment reflection** — samples environment map for reflections

### 3.5 Fresnel Reflection
- **~4% reflection** at normal incidence
- **Near-perfect mirror** at grazing angles
- **Schlick approximation** for Fresnel effect
- **Boosted on bevel** — edgeFactor × 0.3 added to fresnel

### 3.6 Caustics (Optional)
- **Cylindrical lens focusing** — light passes through glass from behind
- **Bright bands** — when curved surface focuses rays
- **Back-facing light** — caustics appear when light comes from behind

### 3.7 Absorption (Optional)
- **Beer's Law** — I = I₀ × e^(-α × d)
- **Soda-lime glass** — green transmits best, red/blue absorbed more
- **Path length** — thicker in center, thinner at edges

---

## 4. Shape & Geometry

### 4.1 Squircles (Superellipses)
- **Formula**: |x/a|ⁿ + |y/b|ⁿ = 1
- **n = 4** — Apple's distinctive smooth corner
- **n = 2** — ellipse
- **n → ∞** — sharp rectangle
- **Key difference from rounded rects**: Continuous curvature throughout; no abrupt change where arc meets straight edge
- **Signed Distance Field (SDF)** for rendering

### 4.2 Beveled Edges
- **Chamfered edges** with 3D geometry
- **Catch light differently** than flat centers
- **Bevel width** — typically 40–60px (how far chamfer extends inward)
- **Bevel depth** — typically 1 (0 = flat center, 1 = edge)
- **Surface normal** — tilts outward in bevel zone
- **Smoothstep** — transitions from edge to flat center

### 4.3 Inner Shadows (Depth Simulation)
- **First shadow**: 2px offset (bottom-right), darker color, low opacity
- **Second shadow**: -2px offset (top-left), lighter color, lower opacity
- **Creates "puffy" depth** simulating light reflection

---

## 5. Colors & Background

### 5.1 Base Fill
- **White** — 1–2% opacity for soft base
- **Background** — content shows through glass
- **Vignette** — soft vignette for depth (0.7–1.0 range)

### 5.2 Light/Environment
- **Warm color** — golden sunset (1.0, 0.8, 0.4)
- **Cool color** — cool blue (0.6, 0.7, 0.9)
- **Warmth** — varies with light direction

### 5.3 Dark/Light Mode
- **Adapts** to light and dark environments
- **Respects** Reduced Transparency, Reduced Motion, High Contrast

---

## 6. Typography

- **SF Pro** — primary typeface
- **SF Compact** — compact variant
- **New York** — serif option
- **Font sizes** — follow iOS/macOS scale
- **Contrast** — minimum 4.5:1 text-to-background ratio (accessibility)
- **Caution** — floating glass can reduce contrast; ensure strong contrast layers

---

## 7. Layout & Spacing

- **Auto Layout** — 16px horizontal padding, 10px vertical padding
- **Padding** — typically 40px for panels
- **Spatial grouping** — floating glass layers separate controls from content
- **One primary glass sheet per view** — avoid visual overload

---

## 8. Components Using Liquid Glass

- Buttons
- Switches
- Sliders
- Media controls
- Tab bars
- Sidebars
- Toolbars
- Popovers
- Larger surfaces (panels, cards)
- App icons (layered, translucency, glass-like shimmer)

---

## 9. Implementation Parameters

### 9.1 SwiftUI
- `.glassEffect()` modifier for iOS, iPadOS, macOS

### 9.2 Figma (2025.07+)
- **Glass effect** — built-in
- **Depth** — 0–30
- **Frost** — 10–25 (Figma)
- **Texture**: Size ~90, Radius ~40

### 9.3 Web/CSS Approximation
- `backdrop-filter: blur(10px)`
- Semi-transparent backgrounds

---

## 10. Accessibility Guidelines

- **Reduce Transparency** — frosted fallback on older devices
- **Reduce Motion** — respect user preference
- **High Contrast** — support for accessibility
- **Glass depth ≤ 20** for UI controls
- **Minimum contrast** — 4.5:1 for text
- **Performance** — requires higher-end Apple silicon for 60fps; older devices get frosted fallback

---

## 11. Design Principles Summary

1. **Clarity** — defer to content
2. **Depth** — reintroduce spatial hierarchy
3. **Dynamics** — responsive to movement
4. **Adaptivity** — content and environment-aware
5. **Cohesion** — unified cross-platform

---

## 12. Quick Reference — Key Parameters

| Parameter | Typical Value |
|-----------|----------------|
| Squircle exponent (n) | 4 |
| Bevel width | 40–60px |
| Bevel depth | 1 |
| Blur radius | 6–10px |
| Frost | 10–25 |
| Glass depth (max) | 20 (controls), 30 (max) |
| IOR | 1.5 |
| Base opacity | 1–2% (white) |
| Dispersion | 0.5–1.0 |
| Specular shininess | 32–128 |
| F0 (Fresnel) | 0.04 |
| Horizontal padding | 16px |
| Vertical padding | 10px |

---

## 13. Sources

- Apple WWDC 2025
- Apple Developer Design Gallery
- Charles Grassi — "Recreating Apple's Liquid Glass"
- designedforhumans.tech — Accessibility analysis
- Medium — Figma implementation guides
- The Verge, Apple Insider

---

*Document created from web research. Last updated: January 2025.*
