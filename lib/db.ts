import prisma from "../prisma/client"

export const db: typeof prisma = new Proxy(prisma as any, {
  get(target, prop, receiver) {
    if (typeof prop === "string" && !(prop in target)) {
      const lower = prop.toLowerCase();
      if (lower in target) {
        return target[lower];
      }
    }
    return Reflect.get(target, prop, receiver);
  },
});

