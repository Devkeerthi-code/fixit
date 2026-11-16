import { Link } from "react-router-dom";
import { useMe } from "../api/queries";
import { Headline } from "../components/ui/Headline";
import { homePathFor } from "../lib/roleHome";

export function NotFoundPage() {
  const { data: me } = useMe();
  return (
    <section className="wrap desk-head" aria-labelledby="nf-title">
      <p className="label">( 404 )</p>
      <Headline as="h1" size="desk" id="nf-title" lines={["This room", "_isn't on_", "the map."]} />
      <p className="lede">The link may be old, or the ticket belongs to another hostel.</p>
      <Link className="btn btn--gold mt-8" to={homePathFor(me)}>
        Back to FixIt
      </Link>
    </section>
  );
}
