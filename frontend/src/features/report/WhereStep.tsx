import type { UseFormReturn } from "react-hook-form";
import type { BlockView, Me } from "../../api/types";
import { Field } from "../../components/ui/Field";
import { Icon } from "../../components/ui/Icon";
import { RoomPicker } from "../../components/ui/RoomPicker";
import { Switch } from "../../components/ui/Switch";
import { cx } from "../../lib/cx";
import { blockLabel } from "../../lib/format";
import type { ReportValues } from "./schema";

interface Props {
  me: Me;
  form: UseFormReturn<ReportValues>;
  blocks: BlockView[];
}

/** Room comes from the profile; a common area needs the block and, optionally, where in it. */
export function WhereStep({ me, form, blocks }: Props) {
  const { watch, setValue, register, formState } = form;
  const common = watch("commonArea");
  const blockId = watch("blockId");
  const roomId = watch("roomId");
  const errors = formState.errors;
  const set = { shouldValidate: formState.isSubmitted, shouldDirty: true };

  return (
    <fieldset className="step">
      <legend className="step__legend">
        <span className="step__n">02</span> Where
      </legend>
      <div className="where">
        {me.room ? (
          <div className={cx("where__room", common && "is-off")}>
            <Icon name="pin" />
            <div>
              <p className="where__value">{me.room.label} · {blockLabel(me.room.blockName)}</p>
              <p className="where__hint">From your profile</p>
            </div>
          </div>
        ) : (
          <p className="where__hint">{common ? "Common areas don't need a room." : "No room on your profile yet. Pick it below, or add it in Profile."}</p>
        )}
        <Switch
          label="It's in a common area"
          checked={common}
          onChange={(e) => {
            setValue("commonArea", e.target.checked, set);
            if (e.target.checked && !blockId) setValue("blockId", me.room?.blockId ?? blocks[0]?.id ?? null, set);
          }}
        />
        {!common && !me.room && (
          <div className="where__extra">
            <RoomPicker
              blocks={blocks}
              blockId={blockId}
              roomId={roomId}
              onChange={(b, r) => {
                setValue("blockId", b, set);
                setValue("roomId", r, set);
              }}
            />
            {errors.roomId && <p className="field__err">{errors.roomId.message}</p>}
          </div>
        )}
        {common && (
          <div className="where__extra where__extra--two">
            <Field label="Block" error={errors.blockId?.message}>
              {(p) => (
                <select
                  {...p}
                  className="input"
                  value={blockId ?? ""}
                  onChange={(e) => setValue("blockId", e.target.value ? Number(e.target.value) : null, set)}
                >
                  <option value="">Choose a block</option>
                  {blocks.map((b) => (
                    <option key={b.id} value={b.id}>{blockLabel(b.name)}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Where exactly" optional="optional" error={errors.locationNote?.message}>
              {(p) => <input {...p} className="input" maxLength={80} placeholder="e.g. 2nd floor washroom" {...register("locationNote")} />}
            </Field>
          </div>
        )}
      </div>
    </fieldset>
  );
}
