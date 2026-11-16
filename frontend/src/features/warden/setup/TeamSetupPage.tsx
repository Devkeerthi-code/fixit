import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { hostelApi } from "../../../api/hostel";
import { keys, useCategories, useLayout, useMe } from "../../../api/queries";
import type { BlockView, CategoryView, SkillInput, StaffView } from "../../../api/types";
import { Button } from "../../../components/ui/Button";
import { Switch } from "../../../components/ui/Switch";
import { EmptyState, ErrorState, Skeleton } from "../../../components/ui/States";
import { cx } from "../../../lib/cx";
import { toast, toastError } from "../../../lib/toast";

/** categoryId -> blocks it covers; an empty list means "every block". Absent means "not their job". */
type SkillMap = Record<number, number[]>;

function toSkillMap(skills: StaffView["skills"]): SkillMap {
  const map: SkillMap = {};
  skills.forEach((s) => {
    const list = map[s.categoryId] ?? [];
    if (s.blockId !== null) list.push(s.blockId);
    map[s.categoryId] = list;
  });
  return map;
}

function toSkillInputs(map: SkillMap): SkillInput[] {
  const out: SkillInput[] = [];
  Object.entries(map).forEach(([cat, blocks]) => {
    if (!blocks.length) out.push({ categoryId: Number(cat), blockId: null });
    blocks.forEach((b) => out.push({ categoryId: Number(cat), blockId: b }));
  });
  return out;
}

function SkillRow({ cat, blocks, value, onChange }: { cat: CategoryView; blocks: BlockView[]; value: number[] | undefined; onChange: (v: number[] | undefined) => void }) {
  const on = value !== undefined;
  const toggleBlock = (id: number) => {
    const list = value ?? [];
    onChange(list.includes(id) ? list.filter((b) => b !== id) : [...list, id]);
  };
  return (
    <div className="skill">
      <Switch small label={cat.name} checked={on} onChange={(e) => onChange(e.target.checked ? [] : undefined)} />
      {on && (
        <div className="skill__blocks" role="group" aria-label={`${cat.name}: which blocks`}>
          <label className="chip">
            <input type="checkbox" checked={value.length === 0} onChange={() => onChange([])} />
            <span>All blocks</span>
          </label>
          {blocks.map((b) => (
            <label key={b.id} className="chip">
              <input type="checkbox" checked={value.includes(b.id)} onChange={() => toggleBlock(b.id)} />
              <span>{b.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberCard({ member, categories, blocks, isMe }: { member: StaffView; categories: CategoryView[]; blocks: BlockView[]; isMe: boolean }) {
  const qc = useQueryClient();
  const [skills, setSkills] = useState<SkillMap>(() => toSkillMap(member.skills));
  const [dirty, setDirty] = useState(false);
  const saveSkills = useMutation({
    mutationFn: () => hostelApi.setSkills(member.id, { skills: toSkillInputs(skills) }),
    onSuccess: (team) => {
      qc.setQueryData(keys.team, team);
      setDirty(false);
      toast(`${member.name} will now get new tickets for what you picked.`);
    },
    onError: toastError,
  });
  const setActive = useMutation({
    mutationFn: (active: boolean) => hostelApi.setActive(member.id, active),
    onSuccess: (team, active) => {
      qc.setQueryData(keys.team, team);
      void qc.invalidateQueries({ queryKey: keys.staff });
      toast(active ? `${member.name} is active again.` : `${member.name} is deactivated and won't get new tickets.`);
    },
    onError: toastError,
  });
  const staff = member.role === "STAFF";
  return (
    <section className={cx("setup-card", !member.active && "is-inactive")} aria-labelledby={`m-${member.id}`}>
      <div className="setup-card__head">
        <div>
          <h3 id={`m-${member.id}`}>{member.name}</h3>
          <p className="member__meta">{member.role === "WARDEN" ? "Warden" : "Staff"} · {member.email}</p>
        </div>
        {!isMe && (
          <Switch small label={member.active ? "Active" : "Deactivated"} checked={member.active} disabled={setActive.isPending} onChange={(e) => setActive.mutate(e.target.checked)} />
        )}
      </div>
      {staff && (
        <>
          <div className="skills">
            {categories.map((c) => (
              <SkillRow
                key={c.id}
                cat={c}
                blocks={blocks}
                value={skills[c.id]}
                onChange={(v) => {
                  setDirty(true);
                  setSkills((s) => {
                    const rest = Object.fromEntries(Object.entries(s).filter(([k]) => Number(k) !== c.id));
                    return v === undefined ? rest : { ...rest, [c.id]: v };
                  });
                }}
              />
            ))}
          </div>
          <div className="form-actions">
            <Button variant="ink" size="small" disabled={!dirty} pending={saveSkills.isPending} onClick={() => saveSkills.mutate()}>Save what {member.name.split(" ")[0]} handles</Button>
            {Object.keys(skills).length === 0 && <span className="field__err text-xs">Handles nothing yet, so no tickets are auto-assigned to them.</span>}
          </div>
        </>
      )}
    </section>
  );
}

export function TeamSetupPage() {
  const team = useQuery({ queryKey: keys.team, queryFn: hostelApi.team });
  const categories = useCategories();
  const layout = useLayout();
  const { data: me } = useMe();
  if (team.isPending || categories.isPending || layout.isPending) return <Skeleton rows={3} label="Loading team" />;
  const error = team.error ?? categories.error ?? layout.error;
  if (team.isError || categories.isError || layout.isError) {
    return <ErrorState error={error} onRetry={() => { void team.refetch(); void categories.refetch(); void layout.refetch(); }} />;
  }
  const staffCount = team.data.filter((m) => m.role === "STAFF").length;
  return (
    <div className="setup">
      <p className="muted">New tickets go automatically to the active staff member who handles that category in that block, with the fewest open tickets.</p>
      {staffCount === 0 && (
        <EmptyState title={<>No staff <em>yet.</em></>} body="Share the staff code from Hostel and codes. Once they join, choose what each person handles here." />
      )}
      {team.data.map((m) => (
        <MemberCard key={m.id} member={m} categories={categories.data} blocks={layout.data} isMe={m.id === me?.id} />
      ))}
    </div>
  );
}
