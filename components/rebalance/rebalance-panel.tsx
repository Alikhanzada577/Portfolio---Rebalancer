"use client";

import Link from "next/link";
import { PreviewResult } from "@/components/rebalance/preview-result";
import { useRebalancePreview } from "@/components/rebalance/use-rebalance-preview";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

type Props = { readonly accountId: string; /** True while another rebalance on this account is still running. */ readonly blocked: boolean };

/** The interactive half of the rebalance page: preview button, errors, and the preview itself. */
export function RebalancePanel({ accountId, blocked }: Props) {
  const { busy, preview, failure, remainingMs, expired, runPreview, confirm } = useRebalancePreview(accountId);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button onClick={runPreview} disabled={blocked || busy !== null}>
          {busy === "preview" ? "Checking prices and fees…" : preview ? "Preview again" : "Preview rebalance"}
        </Button>
      </div>

      {failure && (
        <Notice tone="error">
          {failure.message}{" "}
          {failure.runId && (
            <Link className="font-medium underline" href={`/runs/${failure.runId}`}>
              View it
            </Link>
          )}{" "}
          {failure.reauth && (
            <a className="font-medium underline" href="/api/auth/login">
              Sign in again
            </a>
          )}
        </Notice>
      )}

      {preview && <PreviewResult preview={preview} busy={busy === "execute"} expired={expired} remainingMs={remainingMs} onConfirm={confirm} />}
    </div>
  );
}
