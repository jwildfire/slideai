# Skill: Render to HTML

Render a Quarto Markdown (.qmd) slide deck to HTML using RevealJS format via the Quarto CLI.

## Inputs

| Parameter | Type     | Required | Default | Description                          |
|-----------|----------|----------|---------|--------------------------------------|
| `qmdPath` | `string` | Yes      | —       | Path to the `.qmd` file to render    |
| `output`  | `string` | No       | —       | Custom output file path for the HTML |

## Outputs

```json
{
  "success": true,
  "outputPath": "/absolute/path/to/slides/index.html",
  "error": "Only present when success is false"
}
```

## CLI Example

```bash
# Render the default QMD in current directory
slideai html

# Render a specific file
slideai html slides/my-deck/index.qmd

# Render with custom output path
slideai html slides/my-deck/index.qmd --output ./build/presentation.html
```

## Programmatic Example

```js
const { renderHtml } = require('slideai');

const result = renderHtml({ qmdPath: './slides/my-deck/index.qmd' });

if (result.success) {
  console.log(`HTML rendered to ${result.outputPath}`);
} else {
  console.error(result.error);
}

// With custom output
const result2 = renderHtml({
  qmdPath: './slides/my-deck/index.qmd',
  output: './build/presentation.html',
});
```

## Error Conditions

| Condition              | `error` message                                                          |
|------------------------|--------------------------------------------------------------------------|
| QMD file not found     | `File not found: <path>`                                                 |
| Quarto CLI not on PATH | `Quarto CLI not found. Please install Quarto: https://quarto.org/docs/get-started/` |
| Quarto render fails    | Error message from the Quarto process                                    |
