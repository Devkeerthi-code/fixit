import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCategories, useMe, useTicketCount } from "../../api/queries";
import type { Me } from "../../api/types";
import { Headline } from "../../components/ui/Headline";
import { blockLabel, NOT_CLOSED_STATUSES, plural } from "../../lib/format";
import { ReportSection } from "../report/ReportForm";
import { BlockBand } from "./BlockBand";
import { MyTickets } from "./MyTickets";
import { Nearby } from "./Nearby";

function Hero({ me }: { me: Me }) {
  const open = useTicketCount({ mine: true, status: NOT_CLOSED_STATUSES });
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap">
        <Headline as="h1" size="hero" id="hero-title" lines={["Your hostel,", "looked", "_after._"]} />
        <div className="hero__meta">
          <div className="room-card">
            <p className="label">( your room )</p>
            <p className="room-card__value">{me.room?.label ?? "Not set"}</p>
            <p className="room-card__facts">
              {me.room ? `${blockLabel(me.room.blockName)} · ${me.hostel?.name ?? ""}` : <Link to="/profile">Add your room so complaints fill it in</Link>}
              <br />
              {open.isSuccess ? `${plural(open.data, "open ticket")}` : " "}
            </p>
          </div>
          <p className="hero__lede">
            Something broken in your room? Tell us in under thirty seconds. You'll see who is on it and when they're coming, without chasing anyone on WhatsApp.
          </p>
        </div>
      </div>
      <svg className="notch" viewBox="0 0 120 44" aria-hidden="true" preserveAspectRatio="none">
        <path d="M0 0H120C88 0 68 6 60 44 52 6 32 0 0 0Z" />
      </svg>
    </section>
  );
}

/** The hostel's own categories, in the gold serif marquee. */
function Marquee() {
  const { data } = useCategories();
  const names = (data ?? []).filter((c) => c.active).map((c) => c.name);
  if (!names.length) return null;
  const line = (
    <span>
      {names.map((n, i) => (i % 2 ? <em key={n}>{n} </em> : <span key={n}>{n} </span>))}
    </span>
  );
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {line}
        {line}
      </div>
    </div>
  );
}

function useHashScroll() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (!el) return;
    el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }, [hash]);
}

export function ResidentHome() {
  const { data: me } = useMe();
  useHashScroll();
  if (!me) return null;
  return (
    <>
      <Hero me={me} />
      <BlockBand blockName={me.room?.blockName ?? null} hostelName={me.hostel?.name ?? "your hostel"} roomLabel={me.room?.label ?? null} />
      <Nearby me={me} />
      <Marquee />
      <ReportSection me={me} />
      <MyTickets />
    </>
  );
}
