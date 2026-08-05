/**
 * undo-anything.js
 * Ctrl+Z universel pour n'importe quelle action web
 * v0.1.0 — TwinMi Studio
 */

// ─── Toast ───────────────────────────────────────────────────────────────────

function showToast(message, onRedo) {
  const existing = document.getElementById('__undo-toast__')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.id = '__undo-toast__'
  toast.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:#1e1e2e;color:#fff;padding:10px 16px;border-radius:10px;
    font-size:14px;z-index:99999;opacity:0;transition:opacity 0.25s ease;
    pointer-events:auto;display:flex;align-items:center;gap:12px;
    box-shadow:0 4px 20px rgba(0,0,0,.3);white-space:nowrap;
    font-family:system-ui,sans-serif;
  `

  const text = document.createElement('span')
  text.textContent = message
  toast.appendChild(text)

  if (typeof onRedo === 'function') {
    const btn = document.createElement('button')
    btn.textContent = 'Rétablir'
    btn.style.cssText = `
      background:#6c63ff;color:#fff;border:none;padding:4px 10px;
      border-radius:6px;font-size:13px;cursor:pointer;font-family:inherit;
    `
    btn.addEventListener('click', () => {
      onRedo()
      toast.remove()
    })
    toast.appendChild(btn)
  }

  document.body.appendChild(toast)
  requestAnimationFrame(() => { toast.style.opacity = '1' })

  const timer = setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 250)
  }, 4000)

  toast.addEventListener('mouseenter', () => clearTimeout(timer))
}

// ─── Pile d'historique ────────────────────────────────────────────────────────

let stack   = []   // pile undo
let redoStack = [] // pile redo
let maxHistory = 50
let paused = false

// ─── Push manuel ─────────────────────────────────────────────────────────────

/**
 * Enregistre une action annulable manuellement
 * @param {object} action
 * @param {string}   action.label  — description de l'action
 * @param {function} action.undo   — fonction pour annuler
 * @param {function} action.redo   — fonction pour rétablir
 */
function push(action) {
  if (paused) return
  if (!action || typeof action.undo !== 'function') {
    console.warn('[undo-anything] action.undo doit être une fonction')
    return
  }

  stack.push(action)
  redoStack = [] // toute nouvelle action efface le redo

  if (stack.length > maxHistory) {
    stack.shift()
  }
}

// ─── Undo ─────────────────────────────────────────────────────────────────────

function undo(opts = {}) {
  if (stack.length === 0) return

  const action = stack.pop()
  redoStack.push(action)

  paused = true
  action.undo()
  paused = false

  if (typeof opts.onUndo === 'function') opts.onUndo(action)

  if (opts.toast !== false) {
    showToast(`↩ ${action.label || 'Action annulée'}`, () => redo(opts))
  }
}

// ─── Redo ─────────────────────────────────────────────────────────────────────

function redo(opts = {}) {
  if (redoStack.length === 0) return

  const action = redoStack.pop()
  stack.push(action)

  paused = true
  if (typeof action.redo === 'function') action.redo()
  paused = false

  if (typeof opts.onRedo === 'function') opts.onRedo(action)

  if (opts.toast !== false) {
    showToast(`↪ ${action.label || 'Action rétablie'}`)
  }
}

// ─── Clear ───────────────────────────────────────────────────────────────────

function clear() {
  stack = []
  redoStack = []
}

// ─── History ─────────────────────────────────────────────────────────────────

function history() {
  return { undo: [...stack], redo: [...redoStack] }
}

// ─── Raccourcis clavier globaux ───────────────────────────────────────────────

let globalOpts = {}
let shortcutEnabled = false

function initShortcuts(opts) {
  if (shortcutEnabled) return
  shortcutEnabled = true

  document.addEventListener('keydown', (e) => {
    const isMac  = navigator.platform.includes('Mac')
    const ctrl   = isMac ? e.metaKey : e.ctrlKey
    const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)

    if (!ctrl) return

    // Ctrl+Z — undo
    if (e.key === 'z' && !e.shiftKey) {
      if (isInput) return // laisser le comportement natif dans les inputs
      e.preventDefault()
      undo(globalOpts)
    }

    // Ctrl+Y ou Ctrl+Shift+Z — redo
    if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
      if (isInput) return
      e.preventDefault()
      redo(globalOpts)
    }
  })
}

// ─── Watch DOM ───────────────────────────────────────────────────────────────

const watched = new Map()

/**
 * Surveille un conteneur DOM et rend ses suppressions/modifications annulables
 * @param {string|HTMLElement} selector
 * @param {object} options
 * @param {number}   [options.maxHistory=50]
 * @param {boolean}  [options.shortcut=true]
 * @param {boolean}  [options.toast=true]
 * @param {function} [options.onUndo]
 * @param {function} [options.onRedo]
 */
function watch(selector, options = {}) {
  const container = typeof selector === 'string'
    ? document.querySelector(selector)
    : selector

  if (!container) {
    console.warn('[undo-anything] Élément introuvable :', selector)
    return
  }

  const opts = {
    maxHistory: 50,
    shortcut: true,
    toast: true,
    onUndo: null,
    onRedo: null,
    ...options
  }

  maxHistory = opts.maxHistory
  globalOpts = opts

  if (opts.shortcut) initShortcuts(opts)

  // ── Observer les suppressions d'éléments enfants ──────────────────────────
  const observer = new MutationObserver((mutations) => {
    if (paused) return

    mutations.forEach(mutation => {
      // Éléments supprimés
      mutation.removedNodes.forEach(node => {
        if (node.nodeType !== 1) return // ignorer les noeuds texte

        const parent    = mutation.target
        const nextSibling = mutation.nextSibling

        push({
          label: `Suppression de "${node.tagName.toLowerCase()}${node.id ? '#' + node.id : ''}"`,
          undo: () => {
            if (nextSibling && nextSibling.parentNode === parent) {
              parent.insertBefore(node, nextSibling)
            } else {
              parent.appendChild(node)
            }
          },
          redo: () => node.remove()
        })
      })

      // Éléments ajoutés
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return
        if (node.id === '__undo-toast__') return // ignorer le toast

        push({
          label: `Ajout de "${node.tagName.toLowerCase()}${node.id ? '#' + node.id : ''}"`,
          undo: () => node.remove(),
          redo: () => {
            const parent = mutation.target
            const next   = mutation.nextSibling
            if (next && next.parentNode === parent) {
              parent.insertBefore(node, next)
            } else {
              parent.appendChild(node)
            }
          }
        })
      })

      // Modifications d'attributs (class, style, data-*)
      if (mutation.type === 'attributes') {
        const el       = mutation.target
        const attr     = mutation.attributeName
        const oldValue = mutation.oldValue
        const newValue = el.getAttribute(attr)

        if (oldValue === newValue) return

        push({
          label: `Modification de "${attr}"`,
          undo: () => {
            if (oldValue === null) el.removeAttribute(attr)
            else el.setAttribute(attr, oldValue)
          },
          redo: () => {
            if (newValue === null) el.removeAttribute(attr)
            else el.setAttribute(attr, newValue)
          }
        })
      }
    })
  })

  observer.observe(container, {
    childList:        true,
    subtree:          true,
    attributes:       true,
    attributeOldValue: true,
    characterData:    false
  })

  // ── Observer les inputs/textareas ─────────────────────────────────────────
  const inputListeners = new Map()

  container.querySelectorAll('input, textarea').forEach(field => {
    let lastValue = field.value

    const onFocus = () => { lastValue = field.value }

    const onBlur = () => {
      const newValue = field.value
      if (newValue === lastValue) return

      const savedOld = lastValue
      const savedNew = newValue

      push({
        label: `Modification de "${field.name || field.id || 'champ'}"`,
        undo: () => { field.value = savedOld },
        redo: () => { field.value = savedNew }
      })

      lastValue = newValue
    }

    field.addEventListener('focus', onFocus)
    field.addEventListener('blur', onBlur)
    inputListeners.set(field, { onFocus, onBlur })
  })

  watched.set(container, { observer, inputListeners, opts })
  return container
}

// ─── Unwatch ─────────────────────────────────────────────────────────────────

function unwatch(selector) {
  const container = typeof selector === 'string'
    ? document.querySelector(selector)
    : selector

  if (!container || !watched.has(container)) return

  const { observer, inputListeners } = watched.get(container)
  observer.disconnect()

  inputListeners.forEach(({ onFocus, onBlur }, field) => {
    field.removeEventListener('focus', onFocus)
    field.removeEventListener('blur', onBlur)
  })

  watched.delete(container)
}

// ─── Export ──────────────────────────────────────────────────────────────────

const Undo = { watch, unwatch, push, undo, redo, clear, history }

export default Undo
export { watch, unwatch, push, undo, redo, clear, history }
