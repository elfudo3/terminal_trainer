import { describe, expect, it } from "vitest";
import { MAX_PITCH, MAX_YAW, createMorsModel, easeFactor, fitScale, frameDistance, idleLook, pointerToLook, supportsWebGL } from "../src/mors-model";

describe("look maths", () => {
  it("maps the pointer to a clamped look direction around the model's centre", () => {
    expect(pointerToLook(500, 300, 1000, 600)).toEqual({ yaw: 0, pitch: 0 });
    expect(pointerToLook(1000, 300, 1000, 600).yaw).toBeCloseTo(MAX_YAW);
    expect(pointerToLook(5000, -900, 1000, 600)).toEqual({ yaw: MAX_YAW, pitch: -MAX_PITCH });
    const offCentre = pointerToLook(200, 100, 1000, 600, { x: 200, y: 100 });
    expect(offCentre).toEqual({ yaw: 0, pitch: 0 });
  });

  it("idles with small, bounded motion and eases toward targets frame-rate independently", () => {
    for (const t of [0, 1.3, 7.7, 42]) {
      const look = idleLook(t);
      expect(Math.abs(look.yaw)).toBeLessThan(0.2);
      expect(Math.abs(look.pitch)).toBeLessThan(0.1);
      expect(Math.abs(look.lift)).toBeLessThan(0.02);
    }
    expect(easeFactor(0)).toBe(0);
    expect(easeFactor(1 / 60)).toBeGreaterThan(0);
    expect(easeFactor(1 / 60)).toBeLessThan(easeFactor(1 / 30));
    expect(easeFactor(10)).toBeCloseTo(1);
  });

  it("fits the model's longest side to the stage", () => {
    expect(fitScale({ x: 0.92, y: 0.92, z: 0.85 }, 1.84)).toBeCloseTo(2);
    expect(fitScale({ x: 0, y: 0, z: 0 })).toBe(1);
  });

  it("places the camera so the whole model, hat included, is in view", () => {
    // A 2-unit tall model with a 90° field of view needs the camera 1 unit away, plus the margin.
    expect(frameDistance({ x: 1, y: 2 }, 90, 0)).toBeCloseTo(1);
    expect(frameDistance({ x: 1, y: 2 }, 90, 0.1)).toBeCloseTo(1.1);
    // The wider of width and height decides.
    expect(frameDistance({ x: 2, y: 1 }, 90, 0)).toBeCloseTo(1);
  });
});

describe("createMorsModel without WebGL", () => {
  it("shows the fallback and reports it, and dispose removes the element", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    expect(supportsWebGL()).toBe(false); // jsdom has no WebGL
    const model = createMorsModel(document.getElementById("root")!, {
      fallback: () => {
        const el = document.createElement("span");
        el.className = "fake-avatar";
        return el;
      },
    });
    expect(await model.ready).toBe("fallback");
    expect(model.element.querySelector(".fake-avatar")).not.toBeNull();
    expect(model.element.classList.contains("is-ready")).toBe(true);
    expect(model.element.getAttribute("role")).toBe("img");
    model.dispose();
    expect(document.querySelector(".mors-model")).toBeNull();
  });
});
