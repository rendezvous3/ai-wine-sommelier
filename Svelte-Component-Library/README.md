# Component Library

A Svelte 5 component library built with TypeScript and Storybook, featuring reusable UI components organized into two sections: custom CSS components and Tailwind CSS components.

## Project Overview

This component library provides production-ready, reusable UI components that can be shared across multiple projects. Components are organized into two main categories:

- **Custom CSS Components** (`src/lib/custom/`) - Hand-crafted components with custom CSS, no framework dependencies
- **Tailwind Components** (`src/lib/tailwind/`) - Components built with Tailwind CSS utility classes

### Tech Stack

- **Svelte 5** (latest with runes)
- **TypeScript** (strict mode)
- **Vite** (build tool)
- **Storybook** (component documentation)
- **Tailwind CSS** (utility-first styling)

## Getting Started

Install dependencies:

```sh
npm install
```

### Build Storybook

Build a static version of Storybook:

```sh
npm run storybook
```

## Development

### Run Development Server

Start the SvelteKit development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

### Run Storybook

Start Storybook to view and interact with components:

```sh
npm run storybook
```

Storybook will be available at `http://localhost:6006`

### Type Checking

Run TypeScript type checking:

```sh
npm run check
```

Run type checking in watch mode:

```sh
npm run check:watch
```

## Building

### Build Application

To create a production version of the app:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

## Project Structure

```
src/
├── lib/
│   ├── custom/           # Custom CSS components
│   │   └── ComponentName/
│   │       ├── ComponentName.svelte
│   │       └── ComponentName.stories.ts
│   ├── tailwind/         # Tailwind CSS components
│   │   └── ComponentName/
│   │       ├── ComponentName.svelte
│   │       └── ComponentName.stories.ts
│   ├── utils/            # Helper functions
│   ├── types/            # TypeScript definitions
│   └── icons/            # Icon components
└── routes/               # Demo pages
```

Components are organized by name in their respective directories (`custom/` or `tailwind/`), with each component having its own `.svelte` file and corresponding `.stories.ts` file for Storybook documentation.
