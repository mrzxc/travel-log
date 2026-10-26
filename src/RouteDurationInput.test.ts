import { describe, it, expect } from "vitest";
import { confirmedDuration } from "./RouteDurationInput";
describe("confirmed duration", () => {
  it("accepts decimal durations without replacing leading zeroes", () => {
    expect(confirmedDuration("0.5", 2)).toBe(0.5);
    expect(confirmedDuration(".25", 2)).toBe(0.25);
  });
  it("restores the previous duration for empty and invalid drafts", () => {
    expect(confirmedDuration("", 0.5)).toBe(0.5);
    expect(confirmedDuration("   ", 2)).toBe(2);
    expect(confirmedDuration("invalid", 0.5)).toBe(0.5);
    expect(confirmedDuration("Infinity", 2)).toBe(2);
  });
  it("enforces bounds only when a draft is confirmed", () => {
    expect(confirmedDuration("0", 2)).toBe(0.2);
    expect(confirmedDuration("0.", 2)).toBe(0.2);
    expect(confirmedDuration("-1", 2)).toBe(0.2);
    expect(confirmedDuration("100", 2)).toBe(60);
  });
});
