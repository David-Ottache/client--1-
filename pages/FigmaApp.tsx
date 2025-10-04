import { useEffect, useState } from "react";
import Layout from "@/components/app/Layout";
import JsonRenderer from "@/components/json/JsonRenderer";

const JSON_URL = "https://cdn.builder.io/o/assets%2Ffe9fd683ebc34eeab1db912163811d62%2F6695bc0ffcee46d79f336be1af5a5699?alt=media&token=e53edd02-3e70-4f31-b79f-3a296eceda65&apiKey=fe9fd683ebc34eeab1db912163811d62";

export default function FigmaApp() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(JSON_URL);
        if (!res.ok) throw new Error(`Failed to fetch JSON: ${res.status}`);
        const json = await res.json();
        if (mounted) setData(json);
      } catch (e: any) {
        if (mounted) setError(String(e?.message || e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Layout>
      {loading && (
        <div className="p-4 text-sm text-neutral-600">Loading design…</div>
      )}
      {error && (
        <div className="p-4 text-sm text-red-600" role="alert">{error}</div>
      )}
      {!loading && !error && data && (
        <div className="p-2">
          <JsonRenderer data={data} />
        </div>
      )}
    </Layout>
  );
}
