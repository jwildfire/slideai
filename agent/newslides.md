# Skill: Create New Slide Deck

Create a new Quarto/RevealJS slide deck project from a template, optionally populated from a content outline.

## Inputs

| Parameter    | Type     | Required | Default            | Description                                      |
|-------------|----------|----------|--------------------|--------------------------------------------------|
| `name`      | `string` | Yes      | —                  | Deck name (used as directory name and title)      |
| `outputPath`| `string` | No       | `./slides/<name>`  | Custom output directory path                      |
| `template`  | `string` | No       | `"default"`        | Template name from `templates/` directory         |
| `outline`   | `string` | No       | —                  | Multi-line content outline (bullets become slides)|

## Outputs

```json
{
  "success": true,
  "outputPath": "/absolute/path/to/slides/my-deck",
  "files": [
    "/absolute/path/to/slides/my-deck/_quarto.yml",
    "/absolute/path/to/slides/my-deck/styles.css",
    "/absolute/path/to/slides/my-deck/images/placeholder.svg",
    "/absolute/path/to/slides/my-deck/index.qmd"
  ],
  "error": "Only present when success is false"
}
```

## CLI Example

```bash
# Basic deck creation
slideai new my-presentation

# With custom output path
slideai new my-presentation --output /path/to/output

# With a specific template
slideai new my-presentation --template default

# With a content outline
slideai new my-presentation --outline "- Introduction
- Key Findings
- Conclusion"

# Combined: template + outline + output path
slideai new my-presentation --template default --outline "- Intro\n- Data\n- Summary" --output ./decks/q4
```

## Programmatic Example

```js
const { scaffold } = require('slideai');

// Basic usage
const result = scaffold({ name: 'my-presentation' });

// With all options
const result = scaffold({
  name: 'quarterly-review',
  outputPath: './decks/q4-review',
  template: 'default',
  outline: '- Introduction\n- Key Findings\n  - Revenue growth\n  - User metrics\n- Conclusion',
});

if (result.success) {
  console.log(`Deck created at ${result.outputPath}`);
  console.log(`Files: ${result.files.join(', ')}`);
} else {
  console.error(result.error);
}
```

## Error Conditions

| Condition                        | `error` message                                                        |
|----------------------------------|------------------------------------------------------------------------|
| Template name not found          | `Unknown template "<name>". Available templates: default, ...`         |
| Target directory already exists  | `Directory already exists: /path/to/dir`                               |
| File system write failure        | OS-level error message from the failed operation                       |
| Empty/unparseable outline        | Not an error — generates a single placeholder slide instead            |
