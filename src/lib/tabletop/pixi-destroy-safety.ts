import { Graphics } from "pixi.js";

type GraphicsDestroyArgs = Parameters<Graphics["destroy"]>;
type GuardedGraphicsPrototype = Graphics & {
  __tadeonDestroyGuardInstalled?: boolean;
};

const prototype = Graphics.prototype as GuardedGraphicsPrototype;

if (!prototype.__tadeonDestroyGuardInstalled) {
  const destroyGraphics = prototype.destroy;

  prototype.destroy = function guardedDestroy(
    this: Graphics,
    ...args: GraphicsDestroyArgs
  ) {
    if (this.destroyed) return;
    return destroyGraphics.apply(this, args);
  };

  Object.defineProperty(prototype, "__tadeonDestroyGuardInstalled", {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });
}
