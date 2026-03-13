# Skill: Capture Screenshots

Navigate to web pages via Playwright, capture PNG screenshots, and optionally insert them as full-image slides into a QMD deck.

## Inputs

| Parameter    | Type       | Required | Default   | Description                                        |
|-------------|------------|----------|-----------|----------------------------------------------------|
| `urls`      | `string[]` | Yes      | —         | URLs to capture                                    |
| `outputDir` | `string`   | Yes      | —         | Directory to save PNG files (e.g. `<deck>/images/`)|
| `width`     | `number`   | No       | `1600`    | Viewport width in pixels                           |
| `height`    | `number`   | No       | `800`     | Viewport height in pixels                          |
| `autoscroll`| `boolean`  | No       | `true`    | Auto-scroll to first significant content element   |
| `timeout`   | `number`   | No       | `120000`  | Page load timeout in milliseconds                  |
| `qmdPath`   | `string`   | No       | —         | Target QMD file for automatic slide insertion      |
| `caption`   | `string`   | No       | —         | Caption text for inserted slides                   |

## Outputs

```json
{
  "success": true,
  "captured": [
    {
      "url": "https://example.com/dashboard",
      "filename": "report-dashboard.png",
      "filepath": "/absolute/path/to/images/report-dashboard.png",
      "slug": "dashboard"
    }
  ],
  "warnings": ["Failed to capture https://bad-url.example: net::ERR_NAME_NOT_RESOLVED"],
  "error": "Only present when success is false"
}
```

## CLI Example

```bash
# Single URL
slideai screenshot https://example.com/dashboard --output ./slides/my-deck/images

# Multiple URLs
slideai screenshot https://example.com/page1 https://example.com/page2 --output ./images

# Custom viewport
slideai screenshot https://example.com/chart --width 1920 --height 1080 --output ./images

# Disable auto-scroll
slideai screenshot https://example.com/page --no-autoscroll --output ./images

# URLs from a JSON file
slideai screenshot --input urls.json --output ./images
```

## Programmatic Example

```js
const { screenshot } = require('slideai');

const result = await screenshot({
  urls: ['https://example.com/dashboard', 'https://example.com/report'],
  outputDir: './slides/my-deck/images',
  width: 1600,
  height: 800,
  autoscroll: true,
  qmdPath: './slides/my-deck/index.qmd',
  caption: 'Source: internal dashboard',
});

if (result.success) {
  console.log(`Captured ${result.captured.length} screenshots`);
  if (result.warnings.length) console.warn(result.warnings);
} else {
  console.error(result.error);
}
```

## Error Conditions

| Condition                    | Behavior                                                    |
|------------------------------|-------------------------------------------------------------|
| URL unreachable / timeout    | Warning logged, URL skipped, remaining URLs still processed |
| Playwright not installed     | Returns `{ success: false, error: '...' }`                  |
| Output directory not writable| Returns `{ success: false, error: '...' }`                  |
| All URLs fail                | Returns `{ success: true, captured: [], warnings: [...] }`  |
| Slide insertion fails        | Warning added, screenshots still returned as captured       |
