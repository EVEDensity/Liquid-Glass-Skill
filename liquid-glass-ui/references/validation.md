# Validation record

Validated on 2026-11-03 with Microsoft Edge driven by Playwright on Windows. The reference lab was opened for visual inspection only. Its screenshot stays in local `evidence/` and is excluded from the release archive.

`npm test` passed 16 checks:

- WebGL2 initialization, texture upload, and shader linking.
- The Apple preset loads refraction 18, merge 10, and the full parameter set. Thick lens changes magnification to 1.28.
- Pointer dragging and arrow-key movement.
- Pressing a button scales its glass and releases back.
- Light theme, local image selection, and backdrop switching.
- Copying the preset includes every material key.
- A checkerboard fixture changed 8,518 pixels when refraction changed, with no WebGL error.
- Pointer-highlight cleanup on unmount.
- No horizontal overflow at 390px or 320px.
- Forced colors hide the refractive canvas and keep opaque controls.
- With WebGL2 removed, all controls remain usable.
- Skill metadata and release files are present.

Desktop, light-theme, and mobile screenshots were reviewed. Runtime requests do not load remote fonts, libraries, or reference-site assets.

Not yet validated: Safari, Firefox, a physical phone, a system-level reduced-transparency setting, a screen reader, instrumented contrast across every backdrop, 200% zoom, and GPU performance benchmarks. Passing these checks is not a WCAG certification or a claim of pixel parity with the reference lab.
