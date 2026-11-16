import type { HostelSettings } from "../../api/types";
import { CopyButton } from "../../components/ui/CopyButton";

export function InviteCodes({ settings }: { settings: HostelSettings }) {
  return (
    <div className="codes">
      <div className="code">
        <p className="code__k">Resident code</p>
        <div className="code__row">
          <p className="code__v">{settings.residentInviteCode}</p>
          <CopyButton value={settings.residentInviteCode} what="Resident code" />
        </div>
        <p className="code__hint">Share with residents. They pick their own room when they join.</p>
      </div>
      <div className="code">
        <p className="code__k">Staff code</p>
        <div className="code__row">
          <p className="code__v">{settings.staffInviteCode}</p>
          <CopyButton value={settings.staffInviteCode} what="Staff code" />
        </div>
        <p className="code__hint">Only for plumbers, electricians, IT and housekeeping. Then set what each one handles under Setup, Team.</p>
      </div>
    </div>
  );
}
