export type NumericBounds = {
  min: number;
  max: number;
};

export type CognitiveWeightInput = {
  frequency: number;
  lastSeenAt: string;
  intensity: number;
};

const RECENCY_WINDOW_DAYS = 21;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const clamp01 = (value: number) => clamp(value, 0, 1);

export const resolveNumericBounds = (values: number[], fallback = 1): NumericBounds => {
  const finiteValues = values.filter((value) => Number.isFinite(value));

  if (finiteValues.length === 0) {
    return { min: fallback, max: fallback };
  }

  return {
    min: Math.min(...finiteValues),
    max: Math.max(...finiteValues),
  };
};

const lerp = (start: number, end: number, amount: number) => start + (end - start) * amount;

const daysSince = (timestamp: string) => {
  const time = new Date(timestamp).getTime();

  if (!Number.isFinite(time)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, (Date.now() - time) / (1000 * 60 * 60 * 24));
};

export const getRecencyScore = (timestamp: string) => {
  const elapsedDays = daysSince(timestamp);

  if (!Number.isFinite(elapsedDays)) {
    return 0;
  }

  return 1 - clamp01(elapsedDays / RECENCY_WINDOW_DAYS);
};

export const scaleRecencyOpacity = (timestamp: string, minOpacity: number, maxOpacity: number) =>
  lerp(minOpacity, maxOpacity, getRecencyScore(timestamp));

export const formatLastSeenLabel = (timestamp: string) => {
  const elapsedDays = daysSince(timestamp);

  if (!Number.isFinite(elapsedDays)) {
    return 'last seen recently';
  }

  return `last seen ${Math.floor(elapsedDays)}d ago`;
};

export const normalizeWeight = (value: number, minValue: number, maxValue: number, fallback = 0.5) => {
  if (!Number.isFinite(value) || !Number.isFinite(minValue) || !Number.isFinite(maxValue)) return fallback;
  if (maxValue <= minValue) return fallback;
  return clamp01((value - minValue) / (maxValue - minValue));
};

export const computeCognitiveWeight = (
  input: CognitiveWeightInput,
  frequencyBounds: NumericBounds,
  intensityBounds: NumericBounds,
) => {
  const frequency = lerp(0.38, 1, normalizeWeight(input.frequency, frequencyBounds.min, frequencyBounds.max, 0.5));
  const recency = lerp(0.3, 1, getRecencyScore(input.lastSeenAt));
  const intensity = lerp(0.42, 1, normalizeWeight(input.intensity, intensityBounds.min, intensityBounds.max, 0.5));

  return {
    raw: frequency * recency * intensity,
    frequency,
    recency,
    intensity,
  };
};

export const scaleNodeSize = (weight: number, bounds: NumericBounds) => {
  const normalized = normalizeWeight(weight, bounds.min, bounds.max);

  return {
    width: Math.round(lerp(198, 286, normalized)),
    height: Math.round(lerp(84, 118, normalized)),
    normalized,
  };
};

export const scaleNodeGlow = (weight: number, bounds: NumericBounds) => {
  const normalized = normalizeWeight(weight, bounds.min, bounds.max);

  return {
    opacity: lerp(0.12, 0.36, normalized),
    blur: Math.round(lerp(18, 42, normalized)),
    spread: Math.round(lerp(0, 8, normalized)),
    isDominantWeight: normalized >= 0.72,
    normalized,
  };
};

export const scaleNodePositionInfluence = (weight: number, bounds: NumericBounds) =>
  normalizeWeight(weight, bounds.min, bounds.max, 0);

export const scaleEdgeStrength = (weight: number, bounds: NumericBounds) =>
  lerp(1.15, 4.1, normalizeWeight(weight, bounds.min, bounds.max));

export const scaleEdgeConfidence = (confidence: number | null | undefined, fallback = 0.78) => {
  if (confidence == null || !Number.isFinite(confidence)) return fallback;
  return lerp(0.24, 1, clamp01(confidence));
};

export const formatFrequencyBadge = (frequency: number) => `${Math.max(0, Math.round(frequency))}x`;
