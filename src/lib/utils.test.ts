import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn() typography token merging", () => {
  it("text-body-sm overrides base text-sm", () => {
    const result = cn("text-muted-foreground text-sm", "text-body-sm text-muted-foreground")
    expect(result).toBe("text-body-sm text-muted-foreground")
  })

  it("text-title-lg overrides leading-none and font-semibold", () => {
    const result = cn("leading-none font-semibold", "text-title-lg")
    expect(result).toBe("text-title-lg")
  })

  it("preserves color classes when typography token merges", () => {
    const result = cn("text-muted-foreground text-sm", "text-body-sm")
    expect(result).toBe("text-muted-foreground text-body-sm")
  })

  it("falls back to clsx concatenation for unknown classes", () => {
    const result = cn("foo bg-red-500", "foo bar bg-blue-500")
    expect(result).toContain("foo")
    expect(result).toContain("bar")
    expect(result).toContain("bg-blue-500")
    expect(result).not.toContain("bg-red-500")
  })
})
