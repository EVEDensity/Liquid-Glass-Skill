# Design system

## Material

The default is `PRESETS.apple`: a light edge lens, slight blur, color picked up from the backdrop, and a thin specular rim. Use it for navigation and short controls.

- `clear` removes most blur and dims a bright backdrop.
- `thick` magnifies the center and bends the edge harder.
- `frosted` trades detail for readable color.
- `plain` is a sharp lens without haze.
- `prism` pushes dispersion until the rim splits color.

Do not stack transparent panels. One refractive field is enough. Settings, forms, and long copy sit on an opaque surface.

## Shape and interaction

Controls are capsules, circles, or rounded rectangles. Their glass geometry comes from the DOM rectangle, so the rendered rim and the hit target match.

Standalone glass can be dragged and moved with arrow keys. Near another glass surface, its rim forms a neck and then a single contour. A fixed base contributes color to the refraction without taking part in the union.

A tap on an inner button keeps its action. On a draggable control, movement beyond the drag threshold moves the glass and suppresses that tap.

## Color and type

The playground uses the original cool landscape: `#173746`, `#36596a`, and `#f7fafc`, with `#f7f4ec` for the opaque settings panel. Text on glass must be checked against both light and dark parts of the backdrop. If contrast fails, move the label to an opaque area or switch that control to the frosted preset. Do not fix contrast by blurring the entire page.

Use one sans-serif family already available on the system. Keep headings tight and body copy under 70 characters.

## Light and dark themes

A theme toggle flips a `data-theme` attribute, and every surface follows it. Keep both token sets defined together: `assets/liquid-glass.css` defaults to the dark values and overrides them under `[data-theme="light"]`. A dark page needs more than inverted panel colors: dim a photographic backdrop so the glass samples the same darkened pixels the page shows, switch `appearance` to `dark` in `setMaterial`, and re-check text contrast on glass in both modes. The theme toggle component owns the attribute, the persisted choice, and the aria state; the app only reacts to `glassthemechange`.

## Fallback appearance

Without refraction, controls become opaque rounded surfaces with the same size, labels, and hit areas. The layout must not depend on the WebGL canvas. The theme toggle keeps working in the fallback: its track and thumb switch to opaque fills that follow the current theme.
