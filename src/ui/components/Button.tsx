import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "row" | "ghost" | "circle" | "quiet";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: IconName;
  trailing?: ReactNode;
  children?: ReactNode;
};

export const Button = ({
  variant = "row",
  icon,
  trailing,
  children,
  className = "",
  type = "button",
  ...rest
}: Props) => (
  <button type={type} className={`btn btn-${variant} ${className}`.trim()} {...rest}>
    {icon && <Icon name={icon} size={variant === "circle" ? 20 : 18} />}
    {children && <span className="btn-label">{children}</span>}
    {trailing && <span className="btn-trailing">{trailing}</span>}
  </button>
);
