"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="empty-state"><span className="masthead">The Modern Times</span><h1>Let’s try that edition again.</h1><p>Something interrupted the page. Please try again.</p><button className="dark-button" onClick={reset}>Try again</button></div>;
}
