"use client";
import * as React from "react";
import type { TagProps } from "../../types";

const VFlex = React.forwardRef<HTMLElement, TagProps>(function VFlex(
  { tag = "div", className = "", grid: _grid, ...props },
  ref
) {
  return React.createElement(tag, {
    className: className + " w-layout-vflex",
    ...props,
    ref,
  });
});

export default VFlex;
