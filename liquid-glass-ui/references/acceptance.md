# Acceptance

Check these on the integrated page, not only in the bundled demo.

## Interaction

- Each glass control moves by pointer and by arrow keys.
- Inner buttons activate without dragging the parent.
- In **Controls**, drag the search button into the dock and pull it away: look for a single continuous rim and a clean split.
- In **Merge test**, the circle joins the white switch knob, slider knob, and selected segment. Crossing the colored switch base, the slider rail, or the unselected segment track only refracts that layer; the circle retains its own outline.
- A copied preset contains every material key and can be recognized by `setMaterial`.

## Rendering

- The backdrop visibly bends at the rim and remains stable while dragging.
- Changing from `apple` to `thick` or `prism` changes the rendered pixels.
- No console errors occur during load, drag, preset changes, or image selection.
- A video or animated canvas calls `setSource` before every `render`.

## Accessibility and layout

- Canvas is `aria-hidden`; controls have accessible names.
- Focus is visible. Targets are at least 44 by 44 CSS px.
- No horizontal overflow at 320 CSS px.
- Reduced transparency and forced colors hide refraction and remain readable.
- Missing WebGL2 does not remove the controls.

## Release boundary

- No reference-site images, video, fonts, or copied shader source are included.
- Docs do not claim official Apple code or measured pixel parity.
- Runtime code has no remote dependency.
