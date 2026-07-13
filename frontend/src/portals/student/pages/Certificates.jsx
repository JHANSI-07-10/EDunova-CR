import { Download, ScrollText, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, EmptyState, Loader } from "../components/Common";
import api from "../lib/api";

export default function Certificates() {
  const [items, setItems] = useState(null);
  const [hasPendingFees, setHasPendingFees] = useState(false);
  const [feesLoading, setFeesLoading] = useState(true);

  useEffect(() => {
    setFeesLoading(true);
    api.get("/student/fees/")
      .then(({ data }) => {
        setHasPendingFees(data.pending && data.pending.length > 0);
      })
      .catch(() => {})
      .finally(() => setFeesLoading(false));

    api.get("/student/certificates/").then(({ data }) => setItems(data)).catch(() => setItems([]));
  }, []);

  if (feesLoading || !items) return <Loader rows={3} />;

  if (hasPendingFees) {
    return (
      <Card className="max-w-md mx-auto mt-12 p-8 text-center border-t-4 border-danger">
        <Lock size={48} className="text-danger mx-auto mb-4" />
        <h3 className="font-heading text-lg font-bold text-ink-primary mb-2">Certificates Downloads Locked</h3>
        <p className="text-sm text-ink-secondary mb-6 leading-relaxed">
          Access to downloading student certificates is locked due to pending fees. Please clear your outstanding balance to unlock downloads.
        </p>
        <a href="/student/fees" className="inline-flex items-center justify-center bg-academic-blue text-white rounded-xl py-2.5 px-6 text-sm font-semibold hover:bg-academic-blue/90 transition-colors shadow-md">
          Pay Pending Fees
        </a>
      </Card>
    );
  }
  if (!items.length) return <EmptyState label="No certificates issued yet." />;

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {items.map((c) => (
        <Card key={c.id} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-academic-gold/20 text-amber-600 flex items-center justify-center">
              <ScrollText size={18} />
            </div>
            <div>
              <p className="text-sm font-medium">{c.certificate_type}</p>
              <p className="text-xs text-ink-secondary">Issued {c.issued_date}</p>
            </div>
          </div>
          <a
            href={c.file_url}
            target="_blank"
            rel="noreferrer"
            className="text-academic-blue"
            title="Download"
          >
            <Download size={18} />
          </a>
        </Card>
      ))}
    </div>
  );
}
