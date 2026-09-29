#!/usr/bin/env bun
/**
 * can-ui-check-pages <site> [pagesDir]
 *
 * A site's package.json: "check:pages": "can-ui-check-pages web"
 * See src/checkPages.ts.
 */
import { runCheckPages } from "../src/checkPages";

process.exit(runCheckPages(process.argv.slice(2), process.cwd(), console));
