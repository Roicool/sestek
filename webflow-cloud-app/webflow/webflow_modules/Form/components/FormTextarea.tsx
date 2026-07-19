"use client";
import React from "react";
import { onKeyDownInputHandlers } from "../helpers/formUtils";

type FormTextAreaProps = React.InputHTMLAttributes<HTMLTextAreaElement>;

const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextAreaProps>(
  function FormTextarea({ className = "", ...props }, ref) {
    return React.createElement("textarea", {
      ...props,
      className: className + " w-input",
      onKeyDown: onKeyDownInputHandlers,
      ref,
    });
  }
);

export default FormTextarea;
