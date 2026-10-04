# Student Segmentation Dashboard

A React dashboard that places a student in one of the segments found by the K-Means model in
`N3_Student_Segmentation.ipynb`, and shows what that segment means.

It has no backend. The notebook exports the trained model as a JSON file (scaler, segment
centres, segment statistics), and the dashboard applies it in the browser.

## 1. Get the trained model

Run the notebook. Section 10.3 writes `outputs/segmentation_model.json` and bundles the whole
`outputs/` folder into `N3_outputs.zip` (on Colab the zip downloads automatically).

Then do one of the following:

- **Permanent:** copy `segmentation_model.json` to `dashboard/public/model.json`.
- **Quick:** start the dashboard and choose the file on the "Load the trained model" screen.
  It is remembered in that browser only.

If both exist, `public/model.json` is used.

## 2. Run the dashboard

Requires Node.js 18 or newer.

```bash
cd dashboard
npm install
npm run dev
```

Open the address printed in the terminal (normally http://localhost:5173).

To publish it, run `npm run build` and upload the `dist/` folder to any static host
(Netlify, Vercel, GitHub Pages). Add `public/model.json` before building so the model ships
with the site.

## What it shows

| Tab | Contents |
|---|---|
| **Predict** | Enter a student's grades, failures, study time, absences, going-out and alcohol levels. The dashboard shows the predicted segment, how students in that segment fared on the final grade, suggested support, the distance to every segment centre, a feature-by-feature comparison with the cohort, and the student's position among the training cohort. A "borderline" flag appears when the student is almost as close to a second segment. |
| **Segments** | Size, signature, outcomes and suggested support for every segment; the signature heatmap; failure rate by segment; the segment map. |
| **Model** | Evidence behind the model: silhouette and stability for each k, sensitivity to modelling choices, which features separate the segments, and how a prediction is computed. |

## How a prediction is made

The same three steps as `predict_segment()` in the notebook:

1. Build six features: average of G1 and G2, past failures, study time, log(1 + absences),
   mean of workday and weekend alcohol use, going out.
2. Standardise each with the training cohort's mean and standard deviation.
3. Assign the nearest segment centre (Euclidean distance).

The model file includes 40 students with the segment the notebook gave them. On load the
dashboard re-scores them; the **Dashboard self-check** tile on the Model tab should read `40 / 40`.

## Project layout

```
src/lib/model.js         prediction logic and model-file validation
src/views/               Predict, Segments, Model and the load-model screen
src/components/          charts (SVG / HTML, no chart library), form controls, UI pieces
src/styles.css           design tokens (light and dark) and all styling
public/model.json        the trained model (you add this)
```

Segment colours and shapes follow the same order as the notebook's figures (S1 blue circle,
S2 orange square, S3 green triangle, …), so charts in both places can be read together.
