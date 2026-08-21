/**
 * Monaco Editor loader configuration for Vite.
 *
 * The vite-plugin-monaco-editor (configured in vite.config.js) automatically
 * bundles and serves the Web Workers for HTML/CSS/JS/JSON language services.
 * This file tells @monaco-editor/react not to fetch Monaco from the CDN —
 * use the locally bundled version instead so workers resolve correctly.
 *
 * This file is imported in main.jsx before any Editor component mounts.
 */
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Use the locally bundled Monaco (workers are handled by vite-plugin-monaco-editor)
loader.config({ monaco });
