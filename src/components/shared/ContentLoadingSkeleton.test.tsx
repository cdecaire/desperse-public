// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ContentLoadingSkeleton } from "./ContentLoadingSkeleton"

afterEach(cleanup)

describe("ContentLoadingSkeleton", () => {
	it("exposes one accessible loading state", () => {
		render(<ContentLoadingSkeleton label="Loading notifications" />)

		expect(screen.getByRole("status", { name: "Loading notifications" })).toBeTruthy()
		expect(screen.getAllByTestId("loading-row")).toHaveLength(4)
	})
})
