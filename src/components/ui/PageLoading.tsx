import { MastheadLoading } from "./Masthead";

export function PageLoading({ message = "Setting today’s newspaper" }: { message?: string }) {
  return <div className="opening-edition" role="status" aria-label={message}>
    <MastheadLoading />
    <div className="opening-status">
      <span className="opening-rule" aria-hidden="true" />
      <p>{message}</p>
    </div>
  </div>;
}
