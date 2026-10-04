// Prediction logic for the K-Means segmentation model exported by the notebook
// (outputs/segmentation_model.json). It repeats, in the browser, the three steps the
// notebook uses to score a student: build features -> standardise -> nearest centre.

export const SCHEMA_PREFIX = "n3-segmentation-model/";

// Raw inputs collected by the form, in the order the notebook exports them
export const INPUT_FIELDS = ["G1", "G2", "failures", "studytime", "absences", "Dalc", "Walc", "goout"];

// How each model feature is derived from the raw inputs (same as engineer() in the notebook)
const DERIVE = {
  grade_avg: (v) => (v.G1 + v.G2) / 2,
  failures: (v) => v.failures,
  studytime: (v) => v.studytime,
  absences_log: (v) => Math.log1p(v.absences),
  alcohol: (v) => (v.Dalc + v.Walc) / 2,
  goout: (v) => v.goout,
};

const isNum = (x) => typeof x === "number" && Number.isFinite(x);

/** Returns a list of problems; an empty list means the file can be used. */
export function validateModel(m) {
  const problems = [];
  if (!m || typeof m !== "object") return ["The file does not contain a JSON object."];
  if (typeof m.schema !== "string" || !m.schema.startsWith(SCHEMA_PREFIX)) {
    problems.push('Missing or unknown "schema" - expected a file exported by Section 10.3 of the notebook.');
  }
  if (!Array.isArray(m.features) || m.features.length === 0) {
    problems.push('"features" is missing.');
  } else {
    for (const f of m.features) {
      if (!DERIVE[f.key]) problems.push(`Feature "${f.key}" is not one this dashboard knows how to compute.`);
      if (!isNum(f.mean) || !isNum(f.scale)) problems.push(`Feature "${f.key}" has no scaler mean / scale.`);
    }
  }
  if (!Array.isArray(m.segments) || m.segments.length < 2) {
    problems.push('"segments" must list at least two segments.');
  } else if (Array.isArray(m.features)) {
    for (const s of m.segments) {
      if (!Array.isArray(s.center) || s.center.length !== m.features.length || !s.center.every(isNum)) {
        problems.push(`Segment "${s.id}" has no valid centre.`);
      }
    }
  }
  if (!m.cohort || !m.cohort.means) problems.push('"cohort" statistics are missing.');
  if (!m.indices || !m.indices.performance || !m.indices.engagement) problems.push('"indices" are missing.');
  return problems;
}

export function deriveFeatures(inputs) {
  const out = {};
  for (const key of Object.keys(DERIVE)) out[key] = DERIVE[key](inputs);
  return out;
}

/** Score one student. `inputs` holds the eight raw fields listed in INPUT_FIELDS. */
export function predict(model, inputs) {
  const raw = deriveFeatures(inputs);
  const z = model.features.map((f) => (raw[f.key] - f.mean) / (f.scale || 1));
  const distances = model.segments.map((s) => Math.hypot(...s.center.map((c, i) => c - z[i])));

  const order = distances.map((_, i) => i).sort((a, b) => distances[a] - distances[b]);
  const segment = order[0];
  const runnerUp = order[1];
  // 0 = exactly on the boundary between two segments, 1 = sitting on the segment centre
  const margin = distances[runnerUp] > 0 ? 1 - distances[segment] / distances[runnerUp] : 0;

  const zBy = Object.fromEntries(model.features.map((f, i) => [f.key, z[i]]));
  const perfRaw = (zBy.grade_avg ?? 0) - (zBy.failures ?? 0);
  const engRaw = (zBy.studytime ?? 0) - (zBy.absences_log ?? 0) - (zBy.alcohol ?? 0) - (zBy.goout ?? 0);
  const { performance: p, engagement: e } = model.indices;

  return {
    raw,
    z,
    distances,
    segment,
    runnerUp,
    margin,
    borderline: margin < 0.15,
    performance: (perfRaw - p.mean) / (p.std || 1),
    engagement: (engRaw - e.mean) / (e.std || 1),
  };
}

/** Start the form at the average student of the training cohort. */
export function defaultInputs(model) {
  const m = model.cohort.means;
  const clamp = (v, lo, hi) => Math.min(Math.max(Math.round(v), lo), hi);
  return {
    G1: clamp(m.G1 ?? 11, 0, 20),
    G2: clamp(m.G2 ?? 11, 0, 20),
    failures: clamp(m.failures ?? 0, 0, 3),
    studytime: clamp(m.studytime ?? 2, 1, 4),
    absences: clamp(m.absences ?? 4, 0, 93),
    Dalc: clamp(m.Dalc ?? 1, 1, 5),
    Walc: clamp(m.Walc ?? 2, 1, 5),
    goout: clamp(m.goout ?? 3, 1, 5),
  };
}

/** Re-score the notebook's own test cases to confirm this code reproduces its assignments. */
export function selfCheck(model) {
  const cases = Array.isArray(model.test_cases) ? model.test_cases : [];
  let passed = 0;
  for (const c of cases) if (predict(model, c.inputs).segment === c.expected) passed += 1;
  return { total: cases.length, passed };
}

/** Risk reading of a segment, based on what happened to its members in the training cohort. */
export function riskLevel(segment) {
  const lift = segment.risk_vs_average;
  if (isNum(lift) && lift > 1 && segment.priority === 1) {
    return { level: "critical", label: "Highest priority for early support" };
  }
  if (isNum(lift) && lift > 1) return { level: "warning", label: "Above-average risk" };
  return { level: "good", label: "Below-average risk" };
}

// What to show for each feature in "student vs cohort" comparisons, in the units people recognise
export const RAW_VIEW = {
  grade_avg: { value: (v) => (v.G1 + v.G2) / 2, cohort: "grade_avg", digits: 1, cohortDigits: 1, unit: "/ 20" },
  failures: { value: (v) => v.failures, cohort: "failures", digits: 0, cohortDigits: 2, unit: "" },
  studytime: { value: (v) => v.studytime, cohort: "studytime", digits: 0, cohortDigits: 2, unit: "of 4" },
  absences_log: { value: (v) => v.absences, cohort: "absences", digits: 0, cohortDigits: 1, unit: "" },
  alcohol: { value: (v) => (v.Dalc + v.Walc) / 2, cohort: "alcohol", digits: 1, cohortDigits: 2, unit: "of 5" },
  goout: { value: (v) => v.goout, cohort: "goout", digits: 0, cohortDigits: 2, unit: "of 5" },
};
