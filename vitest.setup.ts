// WHY: register jest-dom custom matchers (toBeInTheDocument, toHaveClass, ...)
// so React component tests can assert on rendered DOM nodes. Setup is isolated
// to vitest — it does not affect the production build or Vite dev server.
import "@testing-library/jest-dom/vitest";