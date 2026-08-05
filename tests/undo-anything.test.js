/**
 * undo-anything.test.js
 * Tests unitaires pour undo-anything.js
 */

import { jest } from '@jest/globals'
import { push, undo, redo, clear, history, watch, unwatch } from '../src/undo-anything.js'

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  clear()
  document.body.innerHTML = ''
})

afterEach(() => {
  const container = document.getElementById('container')
  if (container) unwatch(container)
})

// ─── push() ──────────────────────────────────────────────────────────────────

describe('push()', () => {

  test('ajoute une action à la pile', () => {
    push({ label: 'Test', undo: () => {}, redo: () => {} })
    expect(history().undo.length).toBe(1)
  })

  test('efface la pile redo après un push', () => {
    push({ label: 'A', undo: () => {}, redo: () => {} })
    undo()
    expect(history().redo.length).toBe(1)
    push({ label: 'B', undo: () => {}, redo: () => {} })
    expect(history().redo.length).toBe(0)
  })

  test('respecte maxHistory — pile limitée', () => {
    for (let i = 0; i < 60; i++) {
      push({ label: `Action ${i}`, undo: () => {}, redo: () => {} })
    }
    expect(history().undo.length).toBeLessThanOrEqual(50)
  })

  test('ignore les actions sans fonction undo', () => {
    push({ label: 'Invalide' })
    expect(history().undo.length).toBe(0)
  })

})

// ─── undo() ──────────────────────────────────────────────────────────────────

describe('undo()', () => {

  test('exécute la fonction undo de la dernière action', () => {
    const undoFn = jest.fn()
    push({ label: 'Test', undo: undoFn, redo: () => {} })
    undo({ toast: false })
    expect(undoFn).toHaveBeenCalledTimes(1)
  })

  test('déplace l\'action vers la pile redo', () => {
    push({ label: 'Test', undo: () => {}, redo: () => {} })
    undo({ toast: false })
    expect(history().undo.length).toBe(0)
    expect(history().redo.length).toBe(1)
  })

  test('appelle onUndo callback', () => {
    const onUndo = jest.fn()
    push({ label: 'Test', undo: () => {}, redo: () => {} })
    undo({ toast: false, onUndo })
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  test('ne fait rien si la pile est vide', () => {
    const onUndo = jest.fn()
    undo({ toast: false, onUndo })
    expect(onUndo).not.toHaveBeenCalled()
  })

  test('undo multiple dans l\'ordre LIFO', () => {
    const results = []
    push({ label: 'A', undo: () => results.push('undo-A'), redo: () => {} })
    push({ label: 'B', undo: () => results.push('undo-B'), redo: () => {} })
    undo({ toast: false })
    undo({ toast: false })
    expect(results).toEqual(['undo-B', 'undo-A'])
  })

})

// ─── redo() ──────────────────────────────────────────────────────────────────

describe('redo()', () => {

  test('exécute la fonction redo', () => {
    const redoFn = jest.fn()
    push({ label: 'Test', undo: () => {}, redo: redoFn })
    undo({ toast: false })
    redo({ toast: false })
    expect(redoFn).toHaveBeenCalledTimes(1)
  })

  test('remet l\'action dans la pile undo', () => {
    push({ label: 'Test', undo: () => {}, redo: () => {} })
    undo({ toast: false })
    redo({ toast: false })
    expect(history().undo.length).toBe(1)
    expect(history().redo.length).toBe(0)
  })

  test('appelle onRedo callback', () => {
    const onRedo = jest.fn()
    push({ label: 'Test', undo: () => {}, redo: () => {} })
    undo({ toast: false })
    redo({ toast: false, onRedo })
    expect(onRedo).toHaveBeenCalledTimes(1)
  })

  test('ne fait rien si redo vide', () => {
    const onRedo = jest.fn()
    redo({ toast: false, onRedo })
    expect(onRedo).not.toHaveBeenCalled()
  })

})

// ─── clear() ─────────────────────────────────────────────────────────────────

describe('clear()', () => {

  test('vide les deux piles', () => {
    push({ label: 'A', undo: () => {}, redo: () => {} })
    push({ label: 'B', undo: () => {}, redo: () => {} })
    undo({ toast: false })
    clear()
    expect(history().undo.length).toBe(0)
    expect(history().redo.length).toBe(0)
  })

})

// ─── history() ───────────────────────────────────────────────────────────────

describe('history()', () => {

  test('retourne les deux piles', () => {
    push({ label: 'A', undo: () => {}, redo: () => {} })
    push({ label: 'B', undo: () => {}, redo: () => {} })
    undo({ toast: false })
    const h = history()
    expect(h.undo.length).toBe(1)
    expect(h.redo.length).toBe(1)
  })

  test('retourne des copies — pas les références internes', () => {
    push({ label: 'A', undo: () => {}, redo: () => {} })
    const h = history()
    h.undo.push({ label: 'Fake' })
    expect(history().undo.length).toBe(1)
  })

})

// ─── watch() DOM ─────────────────────────────────────────────────────────────

describe('watch() — DOM mutations', () => {

  test('retourne undefined si sélecteur introuvable', () => {
    const result = watch('#inexistant')
    expect(result).toBeUndefined()
  })

  test('retourne le container si trouvé', () => {
    document.body.innerHTML = '<div id="container"></div>'
    const result = watch('#container', { shortcut: false, toast: false })
    expect(result).toBe(document.getElementById('container'))
  })

  test('détecte la suppression d\'un élément enfant', async () => {
    document.body.innerHTML = '<ul id="container"><li id="item">Test</li></ul>'
    watch('#container', { shortcut: false, toast: false })

    document.getElementById('item').remove()
    await new Promise(r => setTimeout(r, 50))

    expect(history().undo.length).toBe(1)
    expect(history().undo[0].label).toContain('Suppression')
  })

  test('undo restaure l\'élément supprimé', async () => {
    document.body.innerHTML = '<ul id="container"><li id="item">Test</li></ul>'
    watch('#container', { shortcut: false, toast: false })

    document.getElementById('item').remove()
    await new Promise(r => setTimeout(r, 50))

    expect(document.getElementById('item')).toBeNull()
    undo({ toast: false })
    expect(document.getElementById('item')).not.toBeNull()
  })

  test('détecte l\'ajout d\'un élément enfant', async () => {
    document.body.innerHTML = '<ul id="container"></ul>'
    watch('#container', { shortcut: false, toast: false })

    const li = document.createElement('li')
    li.textContent = 'Nouveau'
    document.getElementById('container').appendChild(li)
    await new Promise(r => setTimeout(r, 50))

    expect(history().undo.length).toBe(1)
    expect(history().undo[0].label).toContain('Ajout')
  })

  test('undo supprime l\'élément ajouté', async () => {
    document.body.innerHTML = '<ul id="container"></ul>'
    watch('#container', { shortcut: false, toast: false })

    const li = document.createElement('li')
    li.id = 'new-item'
    li.textContent = 'Nouveau'
    document.getElementById('container').appendChild(li)
    await new Promise(r => setTimeout(r, 50))

    undo({ toast: false })
    expect(document.getElementById('new-item')).toBeNull()
  })

})

// ─── Scénario complet ─────────────────────────────────────────────────────────

describe('Scénario complet undo/redo', () => {

  test('push → undo → redo → état correct', () => {
    let value = 0

    push({ label: 'increment', undo: () => { value-- }, redo: () => { value++ } })
    value++

    expect(value).toBe(1)
    undo({ toast: false })
    expect(value).toBe(0)
    redo({ toast: false })
    expect(value).toBe(1)
  })

  test('séquence A → B → undo → undo → redo → redo', () => {
    const log = []

    push({ label: 'A', undo: () => log.push('undo-A'), redo: () => log.push('redo-A') })
    push({ label: 'B', undo: () => log.push('undo-B'), redo: () => log.push('redo-B') })

    undo({ toast: false })
    undo({ toast: false })
    redo({ toast: false })
    redo({ toast: false })

    expect(log).toEqual(['undo-B', 'undo-A', 'redo-A', 'redo-B'])
  })

})
