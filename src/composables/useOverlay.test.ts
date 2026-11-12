import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

const fixture = fileURLToPath(
  new URL("../../test/overlay-dom.ts", import.meta.url),
);

// Vue captures `document` at import time. Keep DOM globals and Vue's module
// cache in a child process so these tests also work in the complete Bun suite.
for (const scenario of [
  "nested overlays dismiss one level and restore focus",
  "activation order wins over component creation order",
  "reopening moves an overlay to the top",
  "disabled Escape eligibility is reactive",
  "unmounting and disconnected panels leave no keyboard owner",
  "only the top focus trap handles Tab",
  "closing before the render tick cannot steal focus",
  "single overlay retains keyboard and scroll defaults",
  "server rendering does not register browser overlays",
]) {
  test(scenario, async () => {
    const child = Bun.spawn([process.execPath, fixture, scenario], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    expect({ exitCode, output: stdout + stderr }).toEqual({
      exitCode: 0,
      output: "",
    });
  });
}
