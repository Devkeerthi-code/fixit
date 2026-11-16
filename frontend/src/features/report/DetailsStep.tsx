import { useId } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Field } from "../../components/ui/Field";
import { cx } from "../../lib/cx";
import { PRIORITIES, PRIORITY_HINT, PRIORITY_LABEL } from "../../lib/format";
import { PhotoPicker, type Photo } from "./PhotoPicker";
import type { ReportValues } from "./schema";

interface Props {
  form: UseFormReturn<ReportValues>;
  categoryName: string;
  photos: Photo[];
  onPhotos: (p: Photo[]) => void;
}


export function DetailsStep({ form, categoryName, photos, onPhotos }: Props) {
  const { register, watch, formState } = form;
  const length = watch("description").length;
  const prioId = useId();
  const photoId = useId();
  return (
    <fieldset className="step">
      <legend className="step__legend">
        <span className="step__n">03</span> What's wrong
      </legend>
      <div className="step__body">
        <Field label="Describe it in a line or two" hint={`${length} / 1000`} error={formState.errors.description?.message}>
          {(p) => (
            <textarea
              {...p}
              className="input input--area"
              rows={3}
              maxLength={1000}
              placeholder={`e.g. what's broken, since when, and anything the ${categoryName.toLowerCase()} team should bring`}
              {...register("description")}
            />
          )}
        </Field>

        <div className="field" role="radiogroup" aria-labelledby={prioId}>
          <span className="field__label" id={prioId}>How urgent is it?</span>
          <div className="seg">
            {PRIORITIES.map((p) => (
              <label key={p} className={cx("seg__opt", p === "URGENT" && "seg__opt--urgent")}>
                <input type="radio" value={p} {...register("priority")} />
                <span>
                  <b>{PRIORITY_LABEL[p]}</b>
                  <small>{PRIORITY_HINT[p]}</small>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label" id={photoId}>
            Photos <span className="field__opt">optional, up to 3</span>
          </span>
          <PhotoPicker photos={photos} onChange={onPhotos} labelId={photoId} />
        </div>
      </div>
    </fieldset>
  );
}
