# Skill: Watch and Auto-Render

Monitor a QMD slide deck and its assets for file changes, automatically re-rendering to HTML on each save. Events are debounced to avoid redundant renders.

## Inputs

| Parameter    | Type     | Required | Default | Description                              |
|-------------|----------|---------|---------|------------------------------------------|
| `qmdPath`   | `string` | Yes     | —       | Path to the `.qmd` file to watch         |
| `debounceMs`| `number` | No      | `500`   | Debounce window in milliseconds          |

## Outputs

The `watch` function returns a handle object, not a result object. The watcher runs continuously until stopped.

```json
{
  "stop": "function — call to stop watching and clean up"
}
```

## CLI Example

```bash
# Watch the default QMD in current directory
slideai watch

# Watch a specific file
slideai watch slides/my-deck/index.qmd
```

The CLI process runs until interrupted with Ctrl+C.

## Programmatic Example

```js
const { watch } = require('slideai');

const handle = watch({ qmdPath: './slides/my-deck/index.qmd' });

// Watcher is now active — monitors:
//   - The QMD file itself
//   - styles.css in the same directory
//   - The images/ directory

// Stop watching when done
handle.stop();

// With custom debounce
const handle2 = watch({
  qmdPath: './slides/my-deck/index.qmd',
  debounceMs: 1000,
});
```

## Watched Paths

The watcher monitors these paths relative to the QMD file's directory:

- `<qmdPath>` — the QMD file itself
- `<dir>/styles.css` — the slide stylesheet
- `<dir>/images/` — the images directory (additions, deletions, changes)

## Error Conditions

| Condition                | Behavior                                                  |
|--------------------------|-----------------------------------------------------------|
| Render fails on change   | Error logged to stderr, watcher continues running         |
| QMD file deleted         | Watcher continues, will re-render when file reappears     |
| Quarto CLI not available | Render errors logged on each change, watcher stays active |
