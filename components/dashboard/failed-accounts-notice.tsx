import { Notice } from "@/components/ui/notice";

type Props = { readonly failed: { accountId: string; name: string }[] };

/** Accounts SnapTrade couldn't read this time. Usually a temporary rate limit, so say how to recover. */
export function FailedAccountsNotice({ failed }: Props) {
  return (
    <>
      {failed.map((account) => (
        <Notice key={account.accountId} tone="error">
          We couldn&apos;t read {account.name} right now. SnapTrade limits how often an account can be read (about 10 requests a minute), so wait a minute and refresh. Nothing is shown for it until it loads, rather than guessing.
        </Notice>
      ))}
    </>
  );
}
