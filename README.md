# undo-anything.js

> Universal Ctrl+Z for any web action. DOM mutations, inputs, custom actions. Zero dependency, < 3kb gzip.

[![npm version](https://img.shields.io/npm/v/undo-anything)](https://www.npmjs.com/package/undo-anything)
[![license](https://img.shields.io/npm/l/undo-anything)](LICENSE)
[![gzip size](https://img.shields.io/badge/gzip-%3C3kb-brightgreen)]()

**The problem:** Users accidentally delete items, change values, or trigger actions they didn't mean to — and there's no way back.

**The solution:** 2 lines of code.

---

## Install

```bash
npm install undo-anything
```

Or via CDN:

```html
<script type="module">
  import Undo from 'https://cdn.jsdelivr.net/npm/undo-anything/src/undo-anything.js'
</script>
```

---

## Quick start

```js
import Undo from 'undo-anything'

// Watch a container — all DOM changes become undoable
Undo.watch('#my-list')

// Now Ctrl+Z restores deleted items, Ctrl+Y re-deletes them
```

---

## Options

```js
Undo.watch('#my-list', {
  maxHistory: 50,          // max actions stored (default: 50)
  shortcut:   true,        // enable Ctrl+Z / Ctrl+Y (default: true)
  toast:      true,        // show "Action undone — Redo?" toast (default: true)
  onUndo: (action) => {},  // callback after undo
  onRedo: (action) => {},  // callback after redo
})
```

---

## Custom actions

For anything beyond DOM mutations, use `Undo.push()`:

```js
// Example: custom counter
let count = 0

document.getElementById('increment').addEventListener('click', () => {
  const prev = count
  count++
  updateUI()

  Undo.push({
    label: `Increment ${prev} → ${count}`,
    undo: () => { count = prev; updateUI() },
    redo: () => { count++; updateUI() }
  })
})

// Now Ctrl+Z decrements the counter
```

---

## Methods

```js
// Manual undo / redo
Undo.undo()
Undo.redo()

// Push a custom undoable action
Undo.push({ label: 'My action', undo: () => {}, redo: () => {} })

// Stop watching a container
Undo.unwatch('#my-list')

// Clear history
Undo.clear()

// Inspect the stacks
Undo.history()
// → { undo: [...actions], redo: [...actions] }
```

---

## What gets tracked automatically

| Action | Tracked |
|---|---|
| Element removed from DOM | ✅ restored at exact position |
| Element added to DOM | ✅ removed on undo |
| Attribute changed (class, style, data-*) | ✅ reverted |
| Input / textarea blur | ✅ value reverted |
| Custom action via `push()` | ✅ anything you define |

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Z` / `Cmd+Z` | Undo last action |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo last undone action |

> Shortcuts are disabled when focus is inside an `<input>` or `<textarea>` to preserve native browser behavior.

---

## Framework usage

### React

```jsx
import Undo from 'undo-anything'
import { useEffect } from 'react'

function TaskList() {
  useEffect(() => {
    Undo.watch('#task-list', { toast: true })
    return () => Undo.unwatch('#task-list')
  }, [])

  return <ul id="task-list">...</ul>
}
```

### Vue

```vue
<script setup>
import Undo from 'undo-anything'
import { onMounted, onUnmounted } from 'vue'

onMounted(() => Undo.watch('#list'))
onUnmounted(() => Undo.unwatch('#list'))
</script>
```

---

## Browser support

| Chrome | Firefox | Safari | Edge |
|---|---|---|---|
| ✅ 64+ | ✅ 63+ | ✅ 11.1+ | ✅ 79+ |

Requires `MutationObserver` and `BroadcastChannel` — available in all modern browsers.

---

## License

MIT © [TwinMi Studio](https://github.com/SoulReaper67)
