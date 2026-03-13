# Skill: Render to PDF

Render a Quarto Markdown (.qmd) slide deck to PDF format via the Quarto CLI.

## Inputs

| Parameter | Type     | Required | Default | Description                         |
|-----------|----------|----------|---------|-------------------------------------|
| `qmdPath` | `string` | Yes      | —       | Path to the `.qmd` file to render   |
| `output`  | `string` | No       | —       | Custom output file path for the PDF |

## Outputs

```json
{
  "success": true,
  "outputPath": "/absolute/path/to/slides/index.pdf",
  "error": "Only present when success is false"
}
```

## CLI Example

```bash
# Render the default QMD in current directory
slideai pdf

# Render a specific file
slideai pdf slides/my-deck/index.qmd

# Render with custom output path
slideai pdf slides/my-deck/index.qmd --output ./build/presentation.pdf
```

## Programmatic Example

```js
const { renderPdf } = require('slideai');

const result = renderPdf({ qmdPath: './slides/my-deck/index.qmd' });

if (result.success) {
  console.log(`PDF rendered to ${result.outputPath}`);
} else {
  console.error(result.error);
}

// With custom output
const result2 = renderPdf({
  qmdPath: './slides/my-deck/index.qmd',
  output: './build/presentation.pdf',
});
```

## Error Conditions

| Condition              | `error` message                                                          |
|------------------------|--------------------------------------------------------------------------|
| QMD file not found     | `File not found: <path>`                                                 |
| Quarto CLI not on PATH | `Quarto CLI not found. Please install Quarto: https://quarto.org/docs/get-started/` |
| Quarto render fails    | Error message from the Quarto process                                    |
