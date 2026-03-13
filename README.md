# SlideAI

SlideAI is a command-line tool for building Quarto/RevealJS slide decks. It handles the repetitive parts of presentation creation — scaffolding a new deck, capturing screenshots from live web pages, and rendering to HTML or PDF — so you can focus on the content.

## What it does

**Create a new deck** — Start a presentation from a template with consistent styling already wired up. Optionally pass a bulleted outline and SlideAI will generate a slide for each topic.

**Capture screenshots as slides** — Point SlideAI at one or more URLs and it will screenshot each page, save the images, and insert them into your deck as full-image slides. It auto-scrolls to the first meaningful content (charts, tables, plots) before capturing.

**Render** — Render your `.qmd` deck to HTML (RevealJS) or PDF with a single command.

**Watch** — Monitor your deck for changes and automatically re-render as you edit.

## Example deck

See [Intro to SlideAI](slides/intro-to-slideai/index.qmd) for a sample presentation built with the tool.

## Getting started

```bash
npm install
slideai new my-presentation
slideai html slides/my-presentation/index.qmd
```

## Agentic usage

SlideAI is built for AI-assisted workflows. Each capability maps to a `/command` that an agent can invoke directly:

- `/newslides quarterly-review` — Scaffold a new deck called "quarterly-review"
- `/newslides site-metrics --outline "- Traffic\n- Engagement\n- Conversions"` — Create a deck pre-populated from an outline
- `/slidess https://my-dashboard.example.com` — Screenshot a dashboard and add it as a slide
- `/slidess https://app.example.com/report1 https://app.example.com/report2` — Capture multiple pages in one go
- `/slidehtml` — Render the current deck to HTML
- `/slidepdf` — Render to PDF for sharing
- `/slidewatch` — Watch for changes and auto-render while editing

Every command is also available as a programmatic JavaScript function that returns structured results. See the `agent/` directory for full skill definitions with inputs, outputs, and error conditions.
