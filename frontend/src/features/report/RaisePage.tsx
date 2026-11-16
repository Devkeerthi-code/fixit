import { useMe } from "../../api/queries";
import { ReportSection } from "./ReportForm";

/** Wardens and staff can raise tickets too, without the resident home around the form. */
export function RaisePage() {
  const { data: me } = useMe();
  if (!me) return null;
  return <ReportSection me={me} />;
}
