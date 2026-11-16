import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Icon } from "../../components/ui/Icon";
import { MAX_PHOTOS, PhotoError, resizePhoto } from "../../lib/imageResize";
import { toast } from "../../lib/toast";

export interface Photo {
  id: string;
  file: File;
  url: string;
}

interface Props {
  photos: Photo[];
  onChange: (next: Photo[]) => void;
  labelId: string;
}

/** Up to three photos, each shrunk on the phone before it is ever uploaded. */
export function PhotoPicker({ photos, onChange, labelId }: Props) {
  const [busy, setBusy] = useState(0);
  const latest = useRef(photos);
  latest.current = photos;

  useEffect(() => {
    const ref = latest;
    return () => ref.current.forEach((p) => URL.revokeObjectURL(p.url));
  }, []);

  const add = async (e: ChangeEvent<HTMLInputElement>) => {
    const room = MAX_PHOTOS - photos.length;
    const picked = [...(e.target.files ?? [])].slice(0, room);
    e.target.value = "";
    if (!picked.length) return;
    setBusy(picked.length);
    const added: Photo[] = [];
    for (const file of picked) {
      try {
        const small = await resizePhoto(file);
        added.push({ id: `${Date.now()}-${added.length}-${file.name}`, file: small, url: URL.createObjectURL(small) });
      } catch (err) {
        toast(err instanceof PhotoError ? err.message : "Couldn't add that photo. Try another one.", "err");
      }
    }
    setBusy(0);
    if (added.length) onChange([...latest.current, ...added].slice(0, MAX_PHOTOS));
  };

  const remove = (id: string) => {
    const gone = photos.find((p) => p.id === id);
    if (gone) URL.revokeObjectURL(gone.url);
    onChange(photos.filter((p) => p.id !== id));
  };

  const free = MAX_PHOTOS - photos.length - busy;
  return (
    <div className="photos" role="group" aria-labelledby={labelId}>
      {photos.map((p, i) => (
        <div key={p.id} className="photo">
          <img src={p.url} alt={`Photo ${i + 1} you added`} />
          <button type="button" className="photo__remove" onClick={() => remove(p.id)} aria-label={`Remove photo ${i + 1}`}>
            <Icon name="close" />
          </button>
        </div>
      ))}
      {Array.from({ length: busy }, (_, i) => (
        <div key={`busy-${i}`} className="photo">
          <span className="photo__busy" role="status">Shrinking</span>
        </div>
      ))}
      {free > 0 && (
        <label className="photo">
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void add(e)} disabled={busy > 0} />
          <span className="photo__add">
            <Icon name={photos.length ? "plus" : "camera"} />
            <span>Add photo {photos.length + busy + 1}</span>
          </span>
        </label>
      )}
      {Array.from({ length: Math.max(0, free - 1) }, (_, i) => (
        <span key={`slot-${i}`} className="photo" aria-hidden="true">
          <span className="photo__add opacity-50" />
        </span>
      ))}
    </div>
  );
}
