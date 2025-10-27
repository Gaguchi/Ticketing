import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

interface ClientOnlyPortalProps {
  children: ReactNode;
  selector: string;
}

const ClientOnlyPortal: React.FC<ClientOnlyPortalProps> = ({
  children,
  selector,
}) => {
  const ref = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    ref.current = document.querySelector(selector);
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, [selector]);

  // Always return something, never conditionally call createPortal
  if (!mounted || !ref.current) {
    return null;
  }

  return createPortal(children, ref.current);
};

export default ClientOnlyPortal;
