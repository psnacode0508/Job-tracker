# INTERVIEW.md — React & Database Concepts

---

## 1. Virtual DOM & Reconciliation

React keeps a lightweight in-memory copy of the DOM called the Virtual DOM. On every state change, it renders a new virtual tree and runs the reconciliation algorithm to diff it against the previous one.

---

## 2. List Keys, Index-as-Key Pitfalls & JSX Compilation

Keys give React a stable identity for each list item so reconciliation can reuse existing DOM nodes instead of re-creating them. Using array index as key breaks this when items reorder or are inserted/deleted — React maps the old index to the wrong node, causing stale state and incorrect UI.

---

## 3. Why State Must Be Immutable

React needs immutable state because it uses quick memory reference checks (===) to see if data changed and trigger a re-render. If you mutate the original object directly, the reference stays the same, React misses the update, and the UI fails to refresh.

---

## 4. Embedding vs Referencing: How to Decide

Decide based on relationship cardinality and query access patterns. Embed for bounded 1-to-few data always fetched together with the parent (e.g., job application notes), eliminating network roundtrips and joins. Reference for unbounded 1-to-many growth or shared entities (e.g., an application referencing its User owner), preventing documents from exceeding MongoDB’s 16MB limit and avoiding duplicate data update anomalies across multiple documents.

---

## 5. Why Queries Get Slow, Index Benefits & Costs

Queries get slow when the database must perform a full collection scan (COLLSCAN), inspecting every document in O(N) time. Indexes build ordered B-trees over indexed fields, enabling logarithmic O(log N) lookups (IXSCAN) that point directly to matching documents. However, indexes carry trade-offs: every insert, update, and delete must update the index structures, slowing write throughput, and indexes consume significant RAM and disk storage to remain memory-resident.

---

## 6. SQL vs NoSQL: Choosing for a New Project

Choose SQL (PostgreSQL) when your project requires strict ACID multi-table transactions, rigid relational schemas, and complex joins across normalized tables (e.g., financial ledgers, banking, payment gateways). Choose NoSQL (MongoDB) when data is hierarchical, schema requirements evolve rapidly, or documents naturally embed nested items (e.g., job boards, activity feeds), allowing single-document atomic operations and effortless horizontal scaling through native sharding without join overhead.
