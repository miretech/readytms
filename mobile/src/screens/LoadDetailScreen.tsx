import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLoadsForDriver,
  updateLoadStatus,
  uploadPodPhoto,
  type MobileDriver,
  type MobileLoad,
} from "../api";
import { takePhotoBase64, isNativeApp } from "../native";

const NEXT_STATUS: Record<string, string> = {
  Assigned: "PickedUp",
  Pending: "PickedUp",
  PickedUp: "InTransit",
  InTransit: "Delivered",
};

const STATUS_LABEL: Record<string, string> = {
  Assigned: "Mark as Picked Up",
  Pending: "Mark as Picked Up",
  PickedUp: "Mark as In Transit",
  InTransit: "Mark as Delivered",
};

export function LoadDetailScreen({
  loadId,
  driver,
  onBack,
}: {
  loadId: string;
  driver: MobileDriver;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const { data: loads = [] } = useQuery<MobileLoad[]>({
    queryKey: ["mobile-loads", driver.id],
    queryFn: () => getLoadsForDriver(driver.id),
  });
  const load = loads.find((l) => l.id === loadId);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => updateLoadStatus(loadId, newStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mobile-loads", driver.id] });
    },
  });

  async function handlePhoto() {
    setUploadError(null);
    if (!isNativeApp()) {
      setUploadError("Camera is only available in the installed app.");
      return;
    }
    setUploading(true);
    try {
      const base64 = await takePhotoBase64();
      if (!base64) {
        setUploadError("Photo was cancelled.");
        return;
      }
      const filename = `POD-${load?.loadNumber || loadId}-${Date.now()}.jpg`;
      await uploadPodPhoto(loadId, base64, filename);
      qc.invalidateQueries({ queryKey: ["mobile-loads", driver.id] });
    } catch (err: any) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!load) {
    return (
      <div className="screen">
        <header className="header">
          <button className="icon" onClick={onBack} aria-label="Back">
            ←
          </button>
          <div className="strong">Load</div>
          <span />
        </header>
        <div className="muted">Load not found.</div>
      </div>
    );
  }

  const nextStatus = NEXT_STATUS[load.status];
  const podCount = Array.isArray(load.podAttachments) ? load.podAttachments.length : 0;

  return (
    <div className="screen">
      <header className="header">
        <button className="icon" onClick={onBack} aria-label="Back">
          ←
        </button>
        <div className="strong">#{load.loadNumber}</div>
        <span className={`badge status-${load.status.toLowerCase()}`}>{load.status}</span>
      </header>

      <section className="card">
        <div className="section-title">Pickup</div>
        <div className="strong">{load.pickupLocation}</div>
        <div className="muted small">
          {new Date(load.pickupDate).toLocaleDateString()}
        </div>
      </section>

      <section className="card">
        <div className="section-title">Delivery</div>
        <div className="strong">{load.deliveryLocation}</div>
        <div className="muted small">
          {new Date(load.deliveryDate).toLocaleDateString()}
        </div>
      </section>

      <section className="card">
        <div className="row-between">
          <div>
            <div className="muted small">Rate</div>
            <div className="strong">${parseFloat(load.rate).toLocaleString()}</div>
          </div>
          {load.weight && (
            <div>
              <div className="muted small">Weight</div>
              <div className="strong">{load.weight.toLocaleString()} lbs</div>
            </div>
          )}
        </div>
        {load.brokerName && (
          <div style={{ marginTop: 12 }}>
            <div className="muted small">Broker</div>
            <div>{load.brokerName}</div>
          </div>
        )}
        {load.commodity && (
          <div style={{ marginTop: 8 }}>
            <div className="muted small">Commodity</div>
            <div>{load.commodity}</div>
          </div>
        )}
      </section>

      {load.notes && (
        <section className="card">
          <div className="section-title">Notes</div>
          <div className="small" style={{ whiteSpace: "pre-wrap" }}>
            {load.notes}
          </div>
        </section>
      )}

      <section className="actions">
        {nextStatus && (
          <button
            className="primary"
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate(nextStatus)}
          >
            {statusMutation.isPending ? "Saving…" : STATUS_LABEL[load.status]}
          </button>
        )}
        <button
          className="secondary"
          onClick={handlePhoto}
          disabled={uploading || !isNativeApp()}
        >
          {uploading ? "Uploading…" : podCount > 0 ? `Upload another POD (${podCount} on file)` : "Take POD photo"}
        </button>
        {uploadError && <div className="error small">{uploadError}</div>}
        {!isNativeApp() && (
          <div className="muted small">
            Camera + photo upload require the installed app.
          </div>
        )}
      </section>
    </div>
  );
}
