import { forwardRef, InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  rightAdornment?: ReactNode;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, className, rightAdornment, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div>
        <p className="mb-2 block text-sm font-medium text-[#e7ebf5]">{label}</p>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-12 w-full rounded-xl border bg-[#04142a] border-[#ffffff65] px-4 text-sm text-white outline-none transition placeholder:text-[#5f6983] focus:border-[#4e5e92]",
              rightAdornment && "pr-12",
              error ? "border-[#f87171]" : "border-transparent",
              className
            )}
            {...props}
          />
          {rightAdornment}
        </div>
        {error && <p className="mt-1 text-sm text-[#fca5a5]">{error}</p>}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

export { FormInput };
