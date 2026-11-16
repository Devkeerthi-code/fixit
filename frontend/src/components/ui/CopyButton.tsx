import { useState } from "react";
import { toast } from "../../lib/toast";
import { Button } from "./Button";
import { Icon } from "./Icon";

export function CopyButton({ value, what }: { value: string; what: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast(`${what} copied. Paste it in your hostel group.`);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(`Couldn't copy. Select the code and copy it by hand.`, "err");
    }
  };
  return (
    <Button variant="outline" size="small" onClick={() => void copy()} aria-label={`Copy ${what.toLowerCase()}`}>
      <Icon name={copied ? "check" : "copy"} />
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
