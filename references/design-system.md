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

## Fallback appearance

Without refraction, controls become opaque rounded surfaces with the same size, labels, and hit areas. The layout must not depend on the WebGL canvas.
