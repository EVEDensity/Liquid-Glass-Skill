# Acceptance

Check these on the integrated page, not only in the bundled demo.

## Interaction

- Draggable glass moves by pointer and has a keyboard equivalent. Fixed controls retain their native behavior.
- A tap activates the intended control. Dragging beyond the movement threshold does not also trigger the click action.
- A theme toggle flips the page theme on click and on a drag past roughly 40 percent of its travel; a shorter drag snaps back without changing the theme. Space and Enter toggle it, `role="switch"` reflects the state, and the choice survives a reload.
- Toggling the theme re-renders the glass against the dimmed backdrop: the thumb refracts its own track in both modes, and no control becomes unreadable after the flip.
- In the demo, the circle joins the switch knob, slider knob, and selected segment. Crossing the colored switch base, the slider rail, or the unselected segment track only refracts that layer; the circle retains its own outline.

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
