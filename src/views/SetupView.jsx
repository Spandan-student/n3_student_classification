import { useState } from "react";
import { ModelFileButton } from "../components/Controls.jsx";

/** Shown until a trained model is available. */
export default function SetupView({ problems, fileName, onLoad }) {
  const [dragging, setDragging] = useState(false);

  const onDrop = async (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    try {
      onLoad(JSON.parse(await file.text()), file.name);
    } catch {
      onLoad(null, file.name);
    }
  };

  return (
    <div className="setup">
      <section
        className={`card dropzone${dragging ? " is-dragging" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <p className="overline">One step left</p>
        <h2>Load the trained model</h2>
        <p className="setup-lead">
          This dashboard makes predictions with the K-Means model trained in the notebook. It needs the model file the
          notebook exports.
        </p>
        <ol className="steps">
          <li>Run <code>N3_Student_Segmentation.ipynb</code>. Section 10.3 writes <code>outputs/segmentation_model.json</code> and bundles it in <code>N3_outputs.zip</code>.</li>
          <li>Choose that file below, or drop it anywhere on this card. It stays in this browser.</li>
          <li>To make it permanent, copy the file to <code>dashboard/public/model.json</code> and reload.</li>
        </ol>
        <ModelFileButton onLoad={onLoad}>Choose segmentation_model.json</ModelFileButton>

        {problems.length > 0 && (
          <div className="error" role="alert">
            <strong>{fileName ? `"${fileName}" could not be used.` : "The model file could not be used."}</strong>
            <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
      </section>
    </div>
  );
}
