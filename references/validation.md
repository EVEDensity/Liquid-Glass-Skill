# Validation

Run `npm ci` and `npm test` from the repository root. The suite uses Playwright with Microsoft Edge or Chromium. To keep a live playground's in-memory selection intact, use a different port for tests.

```powershell
$env:GLASS_PORT = '4220'
$env:GLASS_TEST_URL = 'http://127.0.0.1:4220'
npm test
```

The suite covers the following behavior.

- WebGL2 initialization, six materials, backdrop sampling, glass fusion, and fixed rails.
- Pointer press, drag, and release for the switch, slider, segments, and lens.
- Shape editing and rotation, visual icon selection, drawing, and group selection.
- Clipboard and local handoff parity, standalone and group mounts, and pixel comparisons against the local demo with matching inputs.
- Keyboard activation, 320px and 390px layouts, reduced motion, forced colors, and a usable fallback without WebGL2.

Screenshots and the verification report go to the ignored `evidence/` directory. The comparisons measure parity with this project's demo under controlled conditions.
