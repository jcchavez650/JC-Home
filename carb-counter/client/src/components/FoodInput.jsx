import { useRef, useState } from "react";
import { Camera, ForkKnife, X } from "@phosphor-icons/react";
import { fileToCompressedImage } from "../api.js";

export default function FoodInput({ onSubmit }) {
  const [mode, setMode] = useState("photo");
  const [preview, setPreview] = useState(null);
  const [image, setImage] = useState(null);
  const [description, setDescription] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);

  const canSubmitPhoto = Boolean(image);
  const canSubmitManual = description.trim().length > 0;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { base64, mediaType } = await fileToCompressedImage(file);
      setImage({ base64, mediaType });
      setPreview(`data:${mediaType};base64,${base64}`);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  function clearPhoto() {
    setImage(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (mode === "photo" && canSubmitPhoto) {
      onSubmit({
        imageBase64: image.base64,
        mediaType: image.mediaType,
        description: description.trim() || undefined,
        weightGrams: weightGrams ? Number(weightGrams) : undefined,
      });
    } else if (mode === "manual" && canSubmitManual) {
      onSubmit({
        description: description.trim(),
        weightGrams: weightGrams ? Number(weightGrams) : undefined,
      });
    }
  }

  return (
    <form className="card food-input" onSubmit={handleSubmit}>
      <div className="tab-row" role="tablist" aria-label="Input method">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "photo"}
          className={`tab ${mode === "photo" ? "tab-active" : ""}`}
          onClick={() => setMode("photo")}
        >
          <Camera size={20} weight="bold" aria-hidden />
          Photo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "manual"}
          className={`tab ${mode === "manual" ? "tab-active" : ""}`}
          onClick={() => setMode("manual")}
        >
          <ForkKnife size={20} weight="bold" aria-hidden />
          Manual
        </button>
      </div>

      {mode === "photo" ? (
        <div className="field-group">
          {preview ? (
            <div className="photo-preview">
              <img src={preview} alt="Selected food preview" />
              <button
                type="button"
                className="icon-button remove-photo"
                onClick={clearPhoto}
                aria-label="Remove photo"
              >
                <X size={18} weight="bold" aria-hidden />
              </button>
            </div>
          ) : (
            <label className="photo-dropzone">
              <Camera size={32} weight="bold" aria-hidden />
              <span>Take or upload a photo of your food</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                hidden
              />
            </label>
          )}
          <label className="field">
            <span>Anything the photo won't show? (optional)</span>
            <input
              type="text"
              placeholder="e.g. homemade, extra cheese"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>
      ) : (
        <div className="field-group">
          <label className="field">
            <span>What are you eating?</span>
            <input
              type="text"
              placeholder="e.g. grilled chicken breast"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Weight in grams (optional)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="e.g. 150"
              value={weightGrams}
              onChange={(e) => setWeightGrams(e.target.value)}
            />
          </label>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={busy || (mode === "photo" ? !canSubmitPhoto : !canSubmitManual)}
      >
        Analyze Food
      </button>
    </form>
  );
}
