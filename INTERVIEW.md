# INTERVIEW.md — React Concepts

---

## 1. Virtual DOM & Reconciliation

React keeps a lightweight in-memory copy of the DOM called the Virtual DOM. On every state change, it renders a new virtual tree and runs the reconciliation algorithm to diff it against the previous one.

---

## 2. List Keys, Index-as-Key Pitfalls & JSX Compilation

Keys give React a stable identity for each list item so reconciliation can reuse existing DOM nodes instead of re-creating them. Using array index as key breaks this when items reorder or are inserted/deleted — React maps the old index to the wrong node, causing stale state and incorrect UI.

---

## 3. Why State Must Be Immutable

React needs immutable state because it uses quick memory reference checks (===) to see if data changed and trigger a re-render. If you mutate the original object directly, the reference stays the same, React misses the update, and the UI fails to refresh.