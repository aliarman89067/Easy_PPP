"use client";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { env } from "@/data/env/client";
import { CopyCheckIcon, CopyIcon, CopyXIcon } from "lucide-react";
import { useState } from "react";

// COPIED STATE TYPES
type CopiedState = "idle" | "copied" | "error";
export default function AddToSiteProductModalContent({ id }: { id: string }) {
  // STATES
  const [copiedState, setCopiedState] = useState<CopiedState>("idle");

  //   ICON COMPONENT
  const Icon = getCopyIcon(copiedState);

  //   CODE SNIPPET
  const code = `<script src="${env.NEXT_PUBLIC_SERVER_URL}/api/products/${id}/banner"></script>`;

  //   COPY CODE FUNCTION
  function handleCopyCode() {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopiedState("copied");
        setTimeout(() => {
          setCopiedState("idle");
        }, 2000);
      })
      .catch(() => {
        setCopiedState("error");
        setTimeout(() => {
          setCopiedState("idle");
        }, 2000);
      });
  }
  return (
    <DialogContent className="max-w-max">
      <DialogHeader>
        <DialogTitle className="text-2xl">Start Earning PPP Sales!</DialogTitle>
        <DialogDescription>
          All you need to do is copy the below script into your site and your
          customers will start seeing PPP discounts!
        </DialogDescription>
      </DialogHeader>
      <pre className="mb-4 overflow-x-auto p-4 bg-secondary rounded max-w-screen-xl text-secondary-foreground">
        <code>{code}</code>
      </pre>
      <div className="flex gap-2">
        <Button onClick={handleCopyCode}>
          <Icon className="size-4 mr-2" />
          {getChildren(copiedState)}
        </Button>
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      </div>
    </DialogContent>
  );
}

function getCopyIcon(copiedState: CopiedState) {
  switch (copiedState) {
    case "idle":
      return CopyCheckIcon;
    case "copied":
      return CopyIcon;
    case "error":
      return CopyXIcon;
  }
}

function getChildren(copiedState: CopiedState) {
  switch (copiedState) {
    case "idle":
      return "Copy Code";
    case "copied":
      return "Copied!";
    case "error":
      return "Error";
  }
}
