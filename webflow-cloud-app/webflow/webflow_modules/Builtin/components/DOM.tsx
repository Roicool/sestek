"use client";
import * as React from "react";

const DOM = React.forwardRef<
  HTMLElement,
  React.AllHTMLAttributes<HTMLElement> &
    React.SVGAttributes<SVGElement> & { tag?: string }
>(function DOM({ tag = "div", className = "", ...props }, ref) {
  return React.createElement(tag, {
    className,
    ...props,
    ref,
  });
});

export default DOM;
