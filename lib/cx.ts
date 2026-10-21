/** Joins class names, skipping falsy values: cx("a", cond && "b"). */
export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");
