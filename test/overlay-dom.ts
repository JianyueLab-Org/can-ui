import assert from "node:assert/strict";
import { Window } from "happy-dom";
import type { App, Ref } from "vue";
import type { UseOverlayOptions } from "../src/composables/useOverlay";

const scenario = process.argv[2];

// These imports intentionally test Vue's module-loading boundary: SSR must load
// without a document; DOM scenarios must install it before runtime-dom loads.
if (scenario === "server rendering does not register browser overlays") {
  const { createSSRApp, defineComponent, h, ref } = await import("vue");
  const { renderToString } = await import("vue/server-renderer");
  const { useOverlay } = await import("../src/composables/useOverlay");
  const html = await renderToString(
    createSSRApp(
      defineComponent({
        setup() {
          const panel = useOverlay(ref(true));
          return () =>
            h("div", { ref: panel, role: "dialog" }, "Server dialog");
        },
      }),
    ),
  );
  assert.match(html, /Server dialog/);
} else {
  const browser = new Window({ url: "https://gallery.example/" });
  Object.assign(globalThis, {
    window: browser,
    document: browser.document,
    Node: browser.Node,
    Element: browser.Element,
    HTMLElement: browser.HTMLElement,
    SVGElement: browser.SVGElement,
    KeyboardEvent: browser.KeyboardEvent,
  });
  // Happy DOM has no layout. These fixture buttons are all rendered and visible.
  Object.defineProperty(browser.HTMLButtonElement.prototype, "offsetParent", {
    get() {
      return this.parentElement;
    },
  });

  const { createApp, defineComponent, h, nextTick, ref } = await import("vue");
  const { useOverlay } = await import("../src/composables/useOverlay");
  const document = globalThis.document;
  const mounted: App[] = [];

  function mountOverlay(
    name: string,
    options: UseOverlayOptions = {},
    parent: HTMLElement = document.body,
    initiallyOpen = false,
  ) {
    const open = ref(initiallyOpen);
    const host = document.createElement("div");
    parent.append(host);
    let panel!: Ref<HTMLElement | null>;
    const app = createApp(
      defineComponent({
        setup() {
          panel = useOverlay(open, options);
          return () =>
            open.value
              ? h("div", { ref: panel, role: "dialog", tabindex: -1 }, [
                  h("button", { "data-first": name }, `${name} first`),
                  h(
                    "button",
                    { "data-last": name, ref: options.initialFocus },
                    `${name} last`,
                  ),
                ])
              : null;
        },
      }),
    );
    mounted.push(app);
    app.mount(host);
    return {
      open,
      host,
      panel: () => panel.value!,
      first: () => panel.value!.querySelector<HTMLElement>("[data-first]")!,
      last: () => panel.value!.querySelector<HTMLElement>("[data-last]")!,
      unmount() {
        app.unmount();
        mounted.splice(mounted.indexOf(app), 1);
        host.remove();
      },
    };
  }

  async function settle() {
    await nextTick();
    await nextTick();
  }

  function elementLabel(element: Element | null) {
    return element ? `${element.outerHTML.split(">")[0]}>` : "null";
  }

  function assertFocus(expected: HTMLElement) {
    assert.ok(
      document.activeElement === expected,
      `Expected focus on ${elementLabel(expected)}; got ${elementLabel(document.activeElement)}`,
    );
  }

  async function key(value = "Escape", shiftKey = false) {
    const event = new KeyboardEvent("keydown", {
      key: value,
      shiftKey,
      bubbles: true,
      cancelable: true,
    });
    document.activeElement!.dispatchEvent(event);
    await settle();
    return event;
  }

  const trigger = document.createElement("button");
  document.body.append(trigger);
  trigger.focus();

  try {
    switch (scenario) {
      case "nested overlays dismiss one level and restore focus": {
        const outer = mountOverlay("sheet", {}, document.body, true);
        await settle();
        const inner = mountOverlay(
          "menu",
          { lockScroll: false },
          outer.panel(),
        );
        outer.last().focus();
        inner.open.value = true;
        await settle();
        assertFocus(inner.first());
        await key();
        assert.equal(inner.open.value, false);
        assert.equal(outer.open.value, true);
        assertFocus(outer.last());
        assert.equal(document.documentElement.style.overflow, "hidden");
        await key();
        assert.equal(outer.open.value, false);
        assertFocus(trigger);
        assert.equal(document.documentElement.style.overflow, "");
        break;
      }
      case "activation order wins over component creation order": {
        const first = mountOverlay("first");
        const second = mountOverlay("second");
        // Both activate in one tick, in the opposite order to their setup.
        second.open.value = true;
        first.open.value = true;
        await settle();
        assertFocus(first.first());
        await key();
        assert.equal(first.open.value, false);
        assert.equal(second.open.value, true);
        break;
      }
      case "reopening moves an overlay to the top": {
        const first = mountOverlay("dialog", {}, document.body, true);
        await settle();
        const second = mountOverlay("palette", {}, document.body, true);
        await settle();
        first.open.value = false;
        await settle();
        first.open.value = true;
        await settle();
        await key();
        assert.equal(first.open.value, false);
        assert.equal(second.open.value, true);
        await key();
        assert.equal(second.open.value, false);
        break;
      }
      case "disabled Escape eligibility is reactive": {
        const eligible = ref(false);
        const outer = mountOverlay("outer", {}, document.body, true);
        await settle();
        const middle = mountOverlay("middle", {}, document.body, true);
        await settle();
        const top = mountOverlay(
          "decision",
          { dismissible: () => eligible.value },
          document.body,
          true,
        );
        await settle();
        await key();
        assert.equal(top.open.value, true);
        assert.equal(middle.open.value, false);
        assert.equal(outer.open.value, true);
        eligible.value = true;
        await key();
        assert.equal(top.open.value, false);
        assert.equal(outer.open.value, true);
        break;
      }
      case "unmounting and disconnected panels leave no keyboard owner": {
        const outer = mountOverlay("outer", {}, document.body, true);
        await settle();
        const top = mountOverlay("top", {}, document.body, true);
        await settle();
        top.unmount();
        const disconnected = mountOverlay("detached", {}, document.body, true);
        await settle();
        disconnected.host.remove();
        outer.first().focus();
        await key();
        assert.equal(outer.open.value, false);
        assert.equal(disconnected.open.value, true);
        disconnected.unmount();
        outer.unmount();
        const replacement = mountOverlay(
          "replacement",
          {},
          document.body,
          true,
        );
        await settle();
        await key();
        assert.equal(replacement.open.value, false);
        assert.equal(document.documentElement.style.overflow, "");
        break;
      }
      case "only the top focus trap handles Tab": {
        const outer = mountOverlay("outer", {}, document.body, true);
        await settle();
        const inner = mountOverlay("inner", {}, document.body, true);
        await settle();
        inner.first().focus();
        const focused: EventTarget[] = [];
        document.addEventListener("focusin", (event) => {
          if (event.target) focused.push(event.target);
        });
        assert.equal((await key("Tab", true)).defaultPrevented, true);
        assertFocus(inner.last());
        assert.deepEqual(focused, [inner.last()]);
        focused.length = 0;
        assert.equal((await key("Tab")).defaultPrevented, true);
        assertFocus(inner.first());
        assert.deepEqual(focused, [inner.first()]);
        assert.equal(outer.open.value, true);
        assert.equal(inner.open.value, true);
        break;
      }
      case "closing before the render tick cannot steal focus": {
        const staleTarget = document.createElement("button");
        document.body.append(staleTarget);
        const overlay = mountOverlay("short-lived", {
          initialFocus: ref<HTMLElement | null>(staleTarget),
        });
        overlay.open.value = true;
        overlay.open.value = false;
        trigger.focus();
        await settle();
        assertFocus(trigger);
        assert.equal(document.documentElement.style.overflow, "");
        break;
      }
      case "single overlay retains keyboard and scroll defaults": {
        const first = ref<HTMLElement | null>(null);
        const overlay = mountOverlay("single", { initialFocus: first });
        overlay.open.value = true;
        await settle();
        assertFocus(overlay.last());
        assert.equal(document.documentElement.style.overflow, "hidden");
        await key("Enter");
        assert.equal(overlay.open.value, true);
        overlay.last().focus();
        assert.equal((await key("Tab")).defaultPrevented, true);
        assertFocus(overlay.first());
        await key();
        assert.equal(overlay.open.value, false);
        assertFocus(trigger);
        assert.equal(document.documentElement.style.overflow, "");
        const nonmodal = mountOverlay(
          "nonmodal",
          { lockScroll: false, trapFocus: false, dismissible: false },
          document.body,
          true,
        );
        await settle();
        assert.equal(document.documentElement.style.overflow, "");
        assert.equal((await key("Tab")).defaultPrevented, false);
        await key();
        assert.equal(nonmodal.open.value, true);
        break;
      }
      default:
        throw new Error(`Unknown overlay scenario: ${scenario}`);
    }
  } finally {
    for (const app of mounted.reverse()) app.unmount();
    await browser.happyDOM.close();
  }
}
