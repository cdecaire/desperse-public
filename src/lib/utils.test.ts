import { describe, expect, it } from "vitest"

import { cn } from "./utils"

describe("cn", () => {
  it("keeps the design-system typography token over a default font-size class", () => {
    expect(cn("text-muted-foreground text-sm", "text-body-sm text-muted-foreground")).toBe(
      "text-body-sm text-muted-foreground",
    )
  })

  it("drops conflicting leading and font-weight classes when a typography token comes later", () => {
    expect(cn("leading-none font-semibold", "text-title-lg")).toBe("text-title-lg")
  })
})
