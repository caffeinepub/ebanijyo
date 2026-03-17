import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export function useAuth() {
  const {
    identity,
    login,
    clear,
    isLoggingIn,
    isLoginSuccess,
    isInitializing,
  } = useInternetIdentity();

  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const principal = identity?.getPrincipal().toString();

  return {
    isAuthenticated,
    login,
    logout: clear,
    principal,
    isLoggingIn,
    isLoginSuccess,
    isInitializing,
  };
}

interface LoginButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
}

export function LoginButton({
  className,
  variant = "default",
  size = "default",
  label = "Login",
}: LoginButtonProps) {
  const { login, isLoggingIn, isInitializing } = useAuth();

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={login}
      disabled={isLoggingIn || isInitializing}
      data-ocid="auth.primary_button"
    >
      {isLoggingIn ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogIn className="w-4 h-4" />
      )}
      <span className="ml-1">{isLoggingIn ? "Connecting..." : label}</span>
    </Button>
  );
}
