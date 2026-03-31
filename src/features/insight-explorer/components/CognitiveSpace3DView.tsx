import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition, type MutableRefObject } from 'react';
import { Billboard, OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { CognitiveSpace3DNodeViewModel, CognitiveSpace3DViewModel } from '../types';

type CognitiveSpace3DViewProps = {
  model: CognitiveSpace3DViewModel;
};

type DomainId = 'energy' | 'discipline' | 'social';

type DomainEvent = {
  id: string;
  label: string;
  color: string;
  glow: string;
  size: number;
  orbitRadius: number;
  orbitSpeed: number;
  phase: number;
  labelDistance: number;
  labelLift: number;
  labelSideOffset: number;
  labelFontSize: number;
  labelMaxWidth: number;
};

type SurfacePatch = {
  id: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  color: string;
  glow: string;
  opacity: number;
  glowOpacity: number;
  pulseSpeed: number;
  pulsePhase: number;
};

type DomainPlanetModel = {
  id: DomainId;
  label: string;
  color: string;
  glow: string;
  ring: string;
  orbitRadius: number;
  orbitScale: [number, number];
  orbitTilt: [number, number, number];
  orbitSpeed: number;
  phase: number;
  heightAmplitude: number;
  size: number;
  events: DomainEvent[];
};

type DomainConfig = Omit<DomainPlanetModel, 'events' | 'size'> & {
  baseSize: number;
};

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 6.8, 27);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const PLANET_LABEL_LAYOUTS: Record<DomainId, { distance: number; lift: number; sideBias: number }> = {
  energy: { distance: 1.62, lift: 1.14, sideBias: -0.92 },
  discipline: { distance: 1.72, lift: 0.96, sideBias: 0.98 },
  social: { distance: 1.54, lift: 0.42, sideBias: 0.86 },
};

const DOMAIN_CONFIGS: Record<DomainId, DomainConfig> = {
  energy: {
    id: 'energy',
    label: 'ENERGY',
    color: '#5be4ff',
    glow: '#16caff',
    ring: '#8feeff',
    orbitRadius: 12.4,
    orbitScale: [1.18, 0.74],
    orbitTilt: [0.14, 0.06, 0.1],
    orbitSpeed: 0.085,
    phase: 2.52,
    heightAmplitude: 1.34,
    baseSize: 3.08,
  },
  discipline: {
    id: 'discipline',
    label: 'DISCIPLINE',
    color: '#ff8f54',
    glow: '#ff5c33',
    ring: '#ffc49a',
    orbitRadius: 15.9,
    orbitScale: [1.24, 0.64],
    orbitTilt: [-0.11, 0.18, -0.08],
    orbitSpeed: -0.062,
    phase: 0.36,
    heightAmplitude: 1.1,
    baseSize: 3.42,
  },
  social: {
    id: 'social',
    label: 'SOCIAL',
    color: '#9d7cff',
    glow: '#7b58ff',
    ring: '#d9ceff',
    orbitRadius: 13.3,
    orbitScale: [0.96, 0.88],
    orbitTilt: [0.08, -0.22, 0.16],
    orbitSpeed: 0.078,
    phase: -1.28,
    heightAmplitude: 1.02,
    baseSize: 3.18,
  },
};

const hashString = (value: string) =>
  value.split('').reduce((acc, char) => ((acc * 31) ^ char.charCodeAt(0)) >>> 0, 7);

const createSeededRandom = (seed: number) => {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};

const tintColor = (value: string, saturationShift = 0, lightnessShift = 0) => {
  const color = new THREE.Color(value);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  color.setHSL(
    hsl.h,
    THREE.MathUtils.clamp(hsl.s + saturationShift, 0, 1),
    THREE.MathUtils.clamp(hsl.l + lightnessShift, 0, 1),
  );
  return `#${color.getHexString()}`;
};

const createSurfacePatches = ({
  seedKey,
  radius,
  palette,
  glowColor,
  count,
}: {
  seedKey: string;
  radius: number;
  palette: string[];
  glowColor: string;
  count: number;
}): SurfacePatch[] => {
  const random = createSeededRandom(hashString(seedKey));

  return Array.from({ length: count }, (_, index) => {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const radial = radius * (0.72 + random() * 0.18);
    const baseScale = THREE.MathUtils.lerp(radius * 0.09, radius * 0.22, random());

    return {
      id: `${seedKey}:patch:${index}`,
      position: [
        Math.sin(phi) * Math.cos(theta) * radial,
        Math.cos(phi) * radial,
        Math.sin(phi) * Math.sin(theta) * radial,
      ],
      scale: [
        baseScale * (1.3 + random() * 1.1),
        baseScale * (0.46 + random() * 0.45),
        baseScale * (0.62 + random() * 0.55),
      ],
      rotation: [random() * Math.PI, random() * Math.PI, random() * Math.PI],
      color: palette[Math.floor(random() * palette.length)] ?? palette[0] ?? glowColor,
      glow: tintColor(glowColor, 0.08, 0.16),
      opacity: THREE.MathUtils.lerp(0.24, 0.48, random()),
      glowOpacity: THREE.MathUtils.lerp(0.08, 0.18, random()),
      pulseSpeed: 0.8 + random() * 1.1,
      pulsePhase: random() * Math.PI * 2,
    };
  });
};

const GLSL_NOISE = `
float hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise3d(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash13(i + vec3(0.0, 0.0, 0.0)), hash13(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(hash13(i + vec3(0.0, 1.0, 0.0)), hash13(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(hash13(i + vec3(0.0, 0.0, 1.0)), hash13(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(hash13(i + vec3(0.0, 1.0, 1.0)), hash13(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y
    ),
    f.z
  );
}

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 5; i++) {
    value += amplitude * noise3d(p);
    p = p * 2.02 + vec3(17.1, 9.2, 13.7);
    amplitude *= 0.52;
  }

  return value;
}

float ridgedFbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 4; i++) {
    float n = noise3d(p);
    value += amplitude * (1.0 - abs(n * 2.0 - 1.0));
    p = p * 2.37 + vec3(5.4, 12.7, 8.6);
    amplitude *= 0.55;
  }

  return value;
}
`;

const PLANET_SURFACE_VERTEX_SHADER = `
uniform float uTime;
uniform float uSeed;
uniform float uDetail;

varying vec3 vWorldPosition;
varying vec3 vNormalDir;
varying vec3 vObjectDir;
varying float vElevation;

${GLSL_NOISE}

void main() {
  vec3 sampleDir = normalize(position + vec3(uSeed * 0.01));
  float swell = fbm(sampleDir * (2.8 + uDetail * 1.4) + vec3(uTime * 0.06, -uTime * 0.04, uTime * 0.03) + uSeed);
  float ridges = ridgedFbm(sampleDir * (4.8 + uDetail * 2.0) - vec3(uTime * 0.03) + uSeed * 1.7);
  float displacement = (swell - 0.5) * 0.12 + (ridges - 0.5) * 0.08;
  vec3 transformed = position + normal * displacement;
  vec4 world = modelMatrix * vec4(transformed, 1.0);

  vWorldPosition = world.xyz;
  vNormalDir = normalize(normalMatrix * normal);
  vObjectDir = normalize(position);
  vElevation = displacement;

  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const PLANET_SURFACE_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uSeed;
uniform float uHover;
uniform float uSelected;
uniform float uDetail;
uniform vec3 uBaseColor;
uniform vec3 uShadowColor;
uniform vec3 uHighlightColor;
uniform vec3 uGlowColor;
uniform vec3 uRimColor;

varying vec3 vWorldPosition;
varying vec3 vNormalDir;
varying vec3 vObjectDir;
varying float vElevation;

${GLSL_NOISE}

void main() {
  vec3 normal = normalize(vNormalDir);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 sampleDir = normalize(vObjectDir + vec3(uSeed * 0.01));

  float swirls = fbm(sampleDir * (3.1 + uDetail * 1.5) + vec3(uTime * 0.08, -uTime * 0.06, uTime * 0.04) + uSeed);
  float ridges = ridgedFbm(sampleDir * (5.9 + uDetail * 1.8) - vec3(uTime * 0.04, -uTime * 0.03, uTime * 0.02) + uSeed * 1.6);
  float veins = fbm(sampleDir * (9.2 + uDetail * 1.2) + vec3(0.0, uTime * 0.02, -uTime * 0.03) + uSeed * 2.3);

  float surfaceMask = smoothstep(0.2, 0.82, swirls);
  float highlightMask = smoothstep(0.46, 0.96, ridges);
  float glowMask = smoothstep(0.62, 0.98, ridges + veins * 0.18);

  vec3 color = mix(uShadowColor, uBaseColor, surfaceMask);
  color = mix(color, uHighlightColor, highlightMask * 0.5);
  color += uGlowColor * glowMask * (0.16 + 0.1 * uHover + 0.08 * uSelected);

  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.25);
  color += uRimColor * fresnel * (0.34 + 0.2 * uHover + 0.24 * uSelected);

  float light = dot(normal, normalize(vec3(0.35, 0.7, 0.6))) * 0.5 + 0.5;
  color *= mix(0.62, 1.18, light);
  color += uGlowColor * vElevation * 0.08;

  gl_FragColor = vec4(color, 1.0);
}
`;

const SOLAR_SURFACE_VERTEX_SHADER = `
uniform float uTime;
uniform float uSeed;

varying vec3 vWorldPosition;
varying vec3 vNormalDir;
varying vec3 vObjectDir;
varying float vHeat;

${GLSL_NOISE}

void main() {
  vec3 sampleDir = normalize(position + vec3(uSeed * 0.01));
  float plasma = fbm(sampleDir * 4.2 + vec3(uTime * 0.18, -uTime * 0.12, uTime * 0.08) + uSeed);
  float ridges = ridgedFbm(sampleDir * 7.6 - vec3(uTime * 0.08) + uSeed * 2.1);
  float displacement = (plasma - 0.5) * 0.14 + (ridges - 0.5) * 0.07;
  vec3 transformed = position + normal * displacement;
  vec4 world = modelMatrix * vec4(transformed, 1.0);

  vWorldPosition = world.xyz;
  vNormalDir = normalize(normalMatrix * normal);
  vObjectDir = normalize(position);
  vHeat = plasma;

  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const SOLAR_SURFACE_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uSeed;
uniform vec3 uInnerColor;
uniform vec3 uOuterColor;
uniform vec3 uFlareColor;
uniform vec3 uRimColor;

varying vec3 vWorldPosition;
varying vec3 vNormalDir;
varying vec3 vObjectDir;
varying float vHeat;

${GLSL_NOISE}

void main() {
  vec3 normal = normalize(vNormalDir);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 sampleDir = normalize(vObjectDir + vec3(uSeed * 0.01));

  float plasma = fbm(sampleDir * 5.2 + vec3(uTime * 0.22, -uTime * 0.18, uTime * 0.14) + uSeed);
  float veins = ridgedFbm(sampleDir * 10.6 - vec3(uTime * 0.12, -uTime * 0.08, uTime * 0.04) + uSeed * 1.9);
  float spark = fbm(sampleDir * 15.0 + vec3(uTime * 0.3, uTime * 0.12, -uTime * 0.16) + uSeed * 2.7);

  vec3 color = mix(uInnerColor, uOuterColor, smoothstep(0.2, 0.9, plasma));
  color += uFlareColor * smoothstep(0.62, 1.0, veins + spark * 0.16) * 0.42;

  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.4);
  color += uRimColor * fresnel * 0.48;

  float light = dot(normal, normalize(vec3(0.2, 0.85, 0.48))) * 0.5 + 0.5;
  color *= mix(0.72, 1.2, light);
  color += uFlareColor * vHeat * 0.12;

  gl_FragColor = vec4(color, 1.0);
}
`;

const SKYDOME_VERTEX_SHADER = `
varying vec3 vDirection;

void main() {
  vDirection = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKYDOME_FRAGMENT_SHADER = `
uniform float uTime;

varying vec3 vDirection;

${GLSL_NOISE}

void main() {
  vec3 dir = normalize(vDirection);
  float vertical = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

  vec3 color = mix(vec3(0.006, 0.01, 0.03), vec3(0.02, 0.04, 0.09), vertical);

  float milkyBand = exp(-pow((dir.y + dir.x * 0.16 - 0.04) * 7.0, 2.0));
  float nebulaA = fbm(dir * 4.8 + vec3(uTime * 0.01, -uTime * 0.008, uTime * 0.005));
  float nebulaB = fbm(dir.zyx * 6.4 - vec3(uTime * 0.006, -uTime * 0.012, uTime * 0.008) + 9.2);
  float dust = fbm(dir * 15.0 + vec3(0.0, uTime * 0.003, -uTime * 0.004));

  color += mix(vec3(0.04, 0.1, 0.22), vec3(0.1, 0.28, 0.46), nebulaA) * milkyBand * 0.26;
  color += mix(vec3(0.12, 0.04, 0.16), vec3(0.38, 0.14, 0.32), nebulaB) * smoothstep(0.35, 0.86, nebulaB) * 0.14;
  color += vec3(0.18, 0.16, 0.24) * pow(dust, 4.0) * milkyBand * 0.08;

  gl_FragColor = vec4(color, 1.0);
}
`;

const NEBULA_RIBBON_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const NEBULA_RIBBON_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uSeed;
uniform float uOpacity;
uniform vec3 uColorA;
uniform vec3 uColorB;

varying vec2 vUv;

${GLSL_NOISE}

void main() {
  vec2 uv = vUv;
  vec3 samplePoint = vec3(uv * vec2(4.0, 1.8), uSeed);

  float clouds = fbm(samplePoint + vec3(uTime * 0.02, -uTime * 0.01, 0.0));
  float wisps = ridgedFbm(samplePoint * 1.8 - vec3(uTime * 0.01, 0.0, uTime * 0.015));
  float centerFade = exp(-pow((uv.y - 0.5) * 3.3, 2.0));
  float edgeFade = smoothstep(0.02, 0.24, uv.x) * (1.0 - smoothstep(0.76, 0.98, uv.x));
  float alpha = smoothstep(0.28, 0.84, clouds) * centerFade * edgeFade * 0.44;

  vec3 color = mix(uColorA, uColorB, wisps);
  color += uColorB * pow(max(clouds - 0.55, 0.0), 2.0) * 0.4;

  gl_FragColor = vec4(color, alpha * uOpacity);
}
`;

const createPlanetSurfaceMaterial = ({
  seed,
  baseColor,
  glowColor,
  ringColor,
  detail,
}: {
  seed: number;
  baseColor: string;
  glowColor: string;
  ringColor: string;
  detail: number;
}) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: seed * 0.0017 },
      uHover: { value: 0 },
      uSelected: { value: 0 },
      uDetail: { value: detail },
      uBaseColor: { value: new THREE.Color(baseColor) },
      uShadowColor: { value: new THREE.Color(tintColor(baseColor, -0.12, -0.18)) },
      uHighlightColor: { value: new THREE.Color(tintColor(baseColor, 0.04, 0.18)) },
      uGlowColor: { value: new THREE.Color(tintColor(glowColor, 0.04, 0.08)) },
      uRimColor: { value: new THREE.Color(tintColor(ringColor, 0.02, 0.18)) },
    },
    vertexShader: PLANET_SURFACE_VERTEX_SHADER,
    fragmentShader: PLANET_SURFACE_FRAGMENT_SHADER,
    transparent: false,
    depthWrite: true,
    toneMapped: false,
  });

const createSolarSurfaceMaterial = (seed: number) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: seed * 0.0014 },
      uInnerColor: { value: new THREE.Color('#fff6b9') },
      uOuterColor: { value: new THREE.Color('#ffbe49') },
      uFlareColor: { value: new THREE.Color('#ff7b1f') },
      uRimColor: { value: new THREE.Color('#ffe28f') },
    },
    vertexShader: SOLAR_SURFACE_VERTEX_SHADER,
    fragmentShader: SOLAR_SURFACE_FRAGMENT_SHADER,
    transparent: false,
    depthWrite: true,
    toneMapped: false,
  });

const createSkydomeMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: SKYDOME_VERTEX_SHADER,
    fragmentShader: SKYDOME_FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
  });

const createNebulaRibbonMaterial = ({
  seed,
  colorA,
  colorB,
  opacity,
}: {
  seed: number;
  colorA: string;
  colorB: string;
  opacity: number;
}) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: seed * 0.0021 },
      uOpacity: { value: opacity },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
    },
    vertexShader: NEBULA_RIBBON_VERTEX_SHADER,
    fragmentShader: NEBULA_RIBBON_FRAGMENT_SHADER,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

const sortNodes = (left: CognitiveSpace3DNodeViewModel, right: CognitiveSpace3DNodeViewModel) =>
  right.importance - left.importance || right.frequency - left.frequency || left.label.localeCompare(right.label);

const domainForNode = (node: CognitiveSpace3DNodeViewModel): DomainId => {
  if (node.kind === 'state' || node.kind === 'context') return 'energy';
  if (node.kind === 'entity' && (node.subtype === 'PERSON' || node.subtype === 'LOCATION')) return 'social';
  if (node.kind === 'entity' && (node.subtype === 'TOOL' || node.subtype === 'PROJECT')) return 'discipline';
  if (node.kind === 'activity') return 'discipline';
  return 'social';
};

const eventPaletteForNode = (
  node: CognitiveSpace3DNodeViewModel,
  domainId: DomainId,
): {
  color: string;
  glow: string;
} => {
  if (node.kind === 'activity') {
    return { color: '#ffd26f', glow: '#ff9b32' };
  }

  if (node.kind === 'entity') {
    if (node.subtype === 'PERSON') return { color: '#ff9cc3', glow: '#ff5c8c' };
    if (node.subtype === 'LOCATION') return { color: '#8fd4ff', glow: '#3f9dff' };
    if (node.subtype === 'TOOL') return { color: '#7cf0d5', glow: '#22c6aa' };
    if (node.subtype === 'PROJECT') return { color: '#ffe08e', glow: '#ffb552' };
  }

  if (node.kind === 'state') {
    if (node.subtype === 'CONFIDENCE') return { color: '#87f1ff', glow: '#31d2ff' };
    if (node.subtype === 'UNCERTAINTY') return { color: '#c5b3ff', glow: '#8a61ff' };
  }

  if (node.kind === 'context') {
    if (node.subtype === 'LIKE') return { color: '#ffd09a', glow: '#ff9858' };
    if (node.subtype === 'DISLIKE') return { color: '#ff9a85', glow: '#ff604c' };
  }

  return {
    color: tintColor(DOMAIN_CONFIGS[domainId].color, 0.1, 0.08),
    glow: tintColor(DOMAIN_CONFIGS[domainId].glow, 0.1, 0.14),
  };
};

const buildDomainPlanets = (model: CognitiveSpace3DViewModel): DomainPlanetModel[] => {
  const sourceNodes = model.nodes.filter((node) => node.id !== 'self');
  const grouped: Record<DomainId, CognitiveSpace3DNodeViewModel[]> = {
    energy: [],
    discipline: [],
    social: [],
  };

  sourceNodes.forEach((node) => {
    grouped[domainForNode(node)].push(node);
  });

  return (Object.keys(DOMAIN_CONFIGS) as DomainId[])
    .map((domainId) => {
    const config = DOMAIN_CONFIGS[domainId];
    const selected = [...grouped[domainId]].sort(sortNodes).slice(0, 8);

    const maxImportance = Math.max(...selected.map((node) => node.importance), 1);
    const size = (config.baseSize + Math.min(selected.length, 8) * 0.06) * 0.72;

    return {
      ...config,
      size,
      events: selected.map((node, index) => {
        const seed = hashString(node.id);
        const normalizedImportance = THREE.MathUtils.clamp(node.importance / maxImportance, 0, 1);
        const ringBand = Math.floor(index / 2);
        const bandSlot = index % 2;
        const labelLengthFactor = THREE.MathUtils.clamp(node.label.length / 18, 0, 1.2);
        const labelFontSize =
          THREE.MathUtils.lerp(0.13, 0.165, normalizedImportance) * THREE.MathUtils.lerp(1, 0.88, labelLengthFactor);
        const palette = eventPaletteForNode(node, domainId);

        return {
          id: node.id,
          label: node.label,
          color: tintColor(palette.color, 0.08, 0.1),
          glow: tintColor(palette.glow, 0.08, 0.14),
          size: THREE.MathUtils.lerp(0.2, 0.5, normalizedImportance),
          orbitRadius: size + 1.44 + ringBand * 1.04 + bandSlot * 0.62,
          orbitSpeed: (index % 2 === 0 ? 1 : -1) * (0.18 + (seed % 7) * 0.01),
          phase: (index / Math.max(selected.length, 1)) * Math.PI * 2 + ((seed % 360) / 360) * Math.PI,
          labelDistance: 0.58 + ringBand * 0.1 + labelLengthFactor * 0.2,
          labelLift: 0.18 + ringBand * 0.05 + (index % 3) * 0.04,
          labelSideOffset: (seed % 2 === 0 ? 1 : -1) * (0.2 + (index % 3) * 0.08 + labelLengthFactor * 0.06),
          labelFontSize,
          labelMaxWidth: THREE.MathUtils.lerp(3.8, 5.4, labelLengthFactor),
        };
      }),
    };
    })
    .filter((planet) => planet.events.length > 0);
};

const OrbitTrack = memo(({ planet }: { planet: DomainPlanetModel }) => (
  <group rotation={[Math.PI / 2 + planet.orbitTilt[0], planet.orbitTilt[1], planet.orbitTilt[2]]}>
    <mesh scale={[planet.orbitScale[0], planet.orbitScale[1], 1]}>
      <torusGeometry args={[planet.orbitRadius, 0.02, 10, 240]} />
      <meshBasicMaterial color={planet.ring} transparent opacity={0.18} depthWrite={false} />
    </mesh>
    <mesh scale={[planet.orbitScale[0], planet.orbitScale[1], 1]}>
      <torusGeometry args={[planet.orbitRadius, 0.07, 10, 240]} />
      <meshBasicMaterial
        color={planet.glow}
        transparent
        opacity={0.04}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  </group>
));

OrbitTrack.displayName = 'OrbitTrack';

const Starfield = memo(() => {
  const starsRef = useRef<THREE.Points>(null);
  const hazeRef = useRef<THREE.Points>(null);

  const starsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1500 * 3);
    const colors = new Float32Array(1500 * 3);
    const color = new THREE.Color();

    for (let index = 0; index < 1500; index += 1) {
      const radius = 28 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.cos(phi) * 0.75;
      positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      color.set(index % 5 === 0 ? '#ffd6b2' : index % 3 === 0 ? '#bdd3ff' : '#ffffff');
      color.offsetHSL(0, 0, (Math.random() - 0.5) * 0.12);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, []);

  const hazeGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(320 * 3);

    for (let index = 0; index < 320; index += 1) {
      const radius = 10 + Math.random() * 18;
      const angle = Math.random() * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[index * 3 + 2] = Math.sin(angle) * radius;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  useEffect(() => {
    return () => {
      starsGeometry.dispose();
      hazeGeometry.dispose();
    };
  }, [hazeGeometry, starsGeometry]);

  useFrame((state, delta) => {
    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.003;
      starsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.03) * 0.05;
    }

    if (hazeRef.current) {
      hazeRef.current.rotation.y -= delta * 0.01;
      hazeRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.06) * 0.06;
    }
  });

  return (
    <>
      <points ref={starsRef} geometry={starsGeometry}>
        <pointsMaterial
          size={0.12}
          sizeAttenuation
          transparent
          opacity={0.98}
          depthWrite={false}
          vertexColors
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
      <points ref={hazeRef} geometry={hazeGeometry}>
        <pointsMaterial
          size={0.22}
          sizeAttenuation
          transparent
          opacity={0.15}
          color="#8fdfff"
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </>
  );
});

Starfield.displayName = 'Starfield';

const NebulaClouds = memo(() => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.004;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.4;
  });

  return (
    <group ref={groupRef}>
      {[
        { position: [-16, 6, -20] as [number, number, number], scale: [2, 0.8, 1.4] as [number, number, number], radius: 6.8, color: '#2a9dff', opacity: 0.05 },
        { position: [13, -1, -18] as [number, number, number], scale: [1.8, 0.7, 1.3] as [number, number, number], radius: 6.1, color: '#ff5d4f', opacity: 0.045 },
        { position: [0, 11, -26] as [number, number, number], scale: [2.3, 0.85, 1.8] as [number, number, number], radius: 8.4, color: '#7ce7ff', opacity: 0.05 },
        { position: [-2, -8, -18] as [number, number, number], scale: [2, 0.6, 1.5] as [number, number, number], radius: 6.5, color: '#8e73ff', opacity: 0.05 },
      ].map((cloud, index) => (
        <mesh key={index} position={cloud.position} scale={cloud.scale}>
          <sphereGeometry args={[cloud.radius, 32, 32]} />
          <meshBasicMaterial
            color={cloud.color}
            transparent
            opacity={cloud.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
});

NebulaClouds.displayName = 'NebulaClouds';

const Skydome = memo(() => {
  const material = useMemo(() => createSkydomeMaterial(), []);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh>
      <sphereGeometry args={[88, 48, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
});

Skydome.displayName = 'Skydome';

const NebulaRibbon = memo(
  ({
    position,
    rotation,
    scale,
    seedKey,
    colorA,
    colorB,
    opacity = 1,
  }: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    seedKey: string;
    colorA: string;
    colorB: string;
    opacity?: number;
    }) => {
    const material = useMemo(
      () => createNebulaRibbonMaterial({ seed: hashString(seedKey), colorA, colorB, opacity }),
      [colorA, colorB, opacity, seedKey],
    );

    useEffect(() => {
      return () => {
        material.dispose();
      };
    }, [material]);

    useFrame((state) => {
      material.uniforms.uTime.value = state.clock.elapsedTime;
    });

    return (
      <mesh position={position} rotation={rotation} scale={scale}>
        <planeGeometry args={[34, 12, 1, 1]} />
        <primitive object={material} attach="material" />
      </mesh>
    );
  },
);

NebulaRibbon.displayName = 'NebulaRibbon';

const HorizonPlanet = memo(() => {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z += delta * 0.02;
    ringRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.18) * 0.015);
  });

  return (
    <group position={[-34, -28, -42]} rotation={[0.16, 0.38, -0.12]}>
      <mesh>
        <sphereGeometry args={[16.2, 48, 48]} />
        <meshStandardMaterial
          color="#22345f"
          emissive="#0a1530"
          emissiveIntensity={0.38}
          roughness={0.9}
          metalness={0.02}
        />
      </mesh>

      <mesh position={[3.1, 2.2, 13.8]}>
        <sphereGeometry args={[1.5, 18, 18]} />
        <meshBasicMaterial
          color="#d8ebff"
          transparent
          opacity={0.25}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <mesh ref={ringRef} rotation={[Math.PI / 2 + 0.18, 0, 0.24]}>
        <torusGeometry args={[19.6, 0.16, 20, 180]} />
        <meshBasicMaterial
          color="#6cb7ff"
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
});

HorizonPlanet.displayName = 'HorizonPlanet';

const CosmicBackdrop = memo(() => (
  <>
    <Skydome />
    <NebulaRibbon
      position={[-8, 7, -34]}
      rotation={[0.16, 0.34, -0.22]}
      scale={[1.8, 0.95, 1]}
      seedKey="nebula-ribbon-a"
      colorA="#2e78ff"
      colorB="#7be6ff"
    />
    <NebulaRibbon
      position={[15, -4, -28]}
      rotation={[-0.14, -0.4, 0.18]}
      scale={[1.7, 0.82, 1]}
      seedKey="nebula-ribbon-b"
      colorA="#6f2dff"
      colorB="#ff7c54"
    />
    <NebulaRibbon
      position={[3, -10, -24]}
      rotation={[0.08, 0.1, -0.08]}
      scale={[1.45, 0.58, 1]}
      seedKey="nebula-ribbon-c"
      colorA="#ff9448"
      colorB="#ffd6ad"
      opacity={0.85}
    />
  </>
));

CosmicBackdrop.displayName = 'CosmicBackdrop';

const SurfacePatchLayer = memo(
  ({
    patches,
    emphasis,
  }: {
    patches: SurfacePatch[];
    emphasis: number;
  }) => (
    <group>
      {patches.map((patch) => (
        <SurfacePatchBlob key={patch.id} patch={patch} emphasis={emphasis} />
      ))}
    </group>
  ),
);

SurfacePatchLayer.displayName = 'SurfacePatchLayer';

const SurfacePatchBlob = memo(
  ({
    patch,
    emphasis,
  }: {
    patch: SurfacePatch;
    emphasis: number;
  }) => {
    const groupRef = useRef<THREE.Group>(null);
    const glowRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
      if (!groupRef.current || !glowRef.current) return;

      const pulse = 1 + Math.sin(state.clock.elapsedTime * patch.pulseSpeed + patch.pulsePhase) * 0.08 * emphasis;
      groupRef.current.scale.setScalar(pulse);
      glowRef.current.rotation.z += delta * 0.1;
    });

    return (
      <group ref={groupRef} position={patch.position} rotation={patch.rotation}>
        <mesh ref={glowRef} scale={[patch.scale[0] * 1.6, patch.scale[1] * 1.9, patch.scale[2] * 1.6]}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color={patch.glow}
            transparent
            opacity={patch.glowOpacity * emphasis}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        <mesh scale={patch.scale}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color={patch.color}
            transparent
            opacity={patch.opacity * emphasis}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>
    );
  },
);

SurfacePatchBlob.displayName = 'SurfacePatchBlob';

const GlowingLabel = memo(
  ({
    text,
    fontSize,
    color,
    glowColor,
    maxWidth,
  }: {
    text: string;
    fontSize: number;
    color: string;
    glowColor: string;
    maxWidth?: number;
  }) => {
    const width = Math.max(Math.min(text.length * fontSize * 0.58, maxWidth ?? fontSize * 7.6), fontSize * 2.4);
    const height = fontSize * 1.12;

    return (
      <group>
        <mesh position={[0, 0, -0.08]}>
          <planeGeometry args={[width * 1.18, height * 1.55]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={0.1}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        <mesh position={[0, 0, -0.04]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial
            color="#020611"
            transparent
            opacity={0.42}
            depthWrite={false}
          />
        </mesh>

        <Text
          fontSize={fontSize}
          color={color}
          anchorX="center"
          anchorY="middle"
          maxWidth={maxWidth}
          outlineColor="#01030c"
          outlineWidth={fontSize * 0.12}
          letterSpacing={0.05}
        >
          {text}
        </Text>
      </group>
    );
  },
);

GlowingLabel.displayName = 'GlowingLabel';

const ConnectedBillboardLabel = memo(
  ({
    text,
    fontSize,
    color,
    glowColor,
    maxWidth,
    radius,
    distance = 1.2,
    lift = 0.5,
    sideBias = 0.35,
    connectorOpacity = 0.24,
    connectorThickness = 0.02,
    dotSize = 0.06,
  }: {
    text: string;
    fontSize: number;
    color: string;
    glowColor: string;
    maxWidth?: number;
    radius: number;
    distance?: number;
    lift?: number;
    sideBias?: number;
    connectorOpacity?: number;
    connectorThickness?: number;
    dotSize?: number;
  }) => {
    const { camera } = useThree();
    const labelAnchorRef = useRef<THREE.Group>(null);
    const connectorRef = useRef<THREE.Mesh>(null);
    const cameraLocal = useRef(new THREE.Vector3());
    const frontDirection = useRef(new THREE.Vector3());
    const sideDirection = useRef(new THREE.Vector3());
    const labelTarget = useRef(new THREE.Vector3());
    const connectorStart = useRef(new THREE.Vector3());
    const connectorVector = useRef(new THREE.Vector3());
    const connectorMidpoint = useRef(new THREE.Vector3());
    const connectorQuaternion = useRef(new THREE.Quaternion());

    useFrame((_, delta) => {
      if (!labelAnchorRef.current || !connectorRef.current || !labelAnchorRef.current.parent) return;

      cameraLocal.current.copy(camera.position);
      labelAnchorRef.current.parent.worldToLocal(cameraLocal.current);
      if (cameraLocal.current.lengthSq() < 0.0001) {
        cameraLocal.current.set(0, 0, 1);
      }

      frontDirection.current.copy(cameraLocal.current).normalize();
      sideDirection.current.crossVectors(WORLD_UP, frontDirection.current);
      if (sideDirection.current.lengthSq() < 0.0001) {
        sideDirection.current.set(sideBias >= 0 ? 1 : -1, 0, 0);
      } else {
        sideDirection.current.normalize();
      }

      labelTarget.current.copy(frontDirection.current).multiplyScalar(radius + distance);
      labelTarget.current.addScaledVector(WORLD_UP, lift);
      labelTarget.current.addScaledVector(sideDirection.current, sideBias);

      const easing = 1 - Math.exp(-delta * 8);
      labelAnchorRef.current.position.lerp(labelTarget.current, easing);

      connectorStart.current.copy(frontDirection.current).multiplyScalar(radius * 0.94);
      connectorVector.current.copy(labelAnchorRef.current.position).sub(connectorStart.current);
      const connectorLength = Math.max(connectorVector.current.length(), 0.0001);
      connectorMidpoint.current.copy(connectorStart.current).addScaledVector(connectorVector.current, 0.5);
      connectorRef.current.position.copy(connectorMidpoint.current);
      connectorQuaternion.current.setFromUnitVectors(WORLD_UP, connectorVector.current.normalize());
      connectorRef.current.quaternion.copy(connectorQuaternion.current);
      connectorRef.current.scale.set(1, connectorLength, 1);
    });

    return (
      <>
        <mesh ref={connectorRef}>
          <cylinderGeometry args={[connectorThickness, connectorThickness * 1.35, 1, 12, 1, true]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={connectorOpacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        <group ref={labelAnchorRef}>
          <Billboard>
            <group>
              <mesh position={[-dotSize * 2.8, 0, -0.03]}>
                <sphereGeometry args={[dotSize, 12, 12]} />
                <meshBasicMaterial
                  color={glowColor}
                  transparent
                  opacity={0.82}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                  toneMapped={false}
                />
              </mesh>

              <GlowingLabel text={text} fontSize={fontSize} color={color} glowColor={glowColor} maxWidth={maxWidth} />
            </group>
          </Billboard>
        </group>
      </>
    );
  },
);

ConnectedBillboardLabel.displayName = 'ConnectedBillboardLabel';

const SelfCore = memo(() => {
  const groupRef = useRef<THREE.Group>(null);
  const solarMaterial = useMemo(() => createSolarSurfaceMaterial(hashString('self-core:shader')), []);
  const surfacePatches = useMemo(
    () =>
      createSurfacePatches({
        seedKey: 'self-core',
        radius: 2.05,
        palette: ['#fff1af', '#ffd96f', '#ffbf53', '#ff9d38'],
        glowColor: '#ffbf53',
        count: 12,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      solarMaterial.dispose();
    };
  }, [solarMaterial]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.26) * 0.03;
    groupRef.current.scale.setScalar(pulse);
    groupRef.current.rotation.y += delta * 0.05;
    solarMaterial.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <group>
      <pointLight color="#ffd86b" intensity={3.9} distance={28} decay={2.05} />
      <pointLight color="#ff9b36" intensity={1.4} distance={18} decay={2.2} />

      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[2.05, 48, 48]} />
          <primitive object={solarMaterial} attach="material" />
        </mesh>

        <SurfacePatchLayer patches={surfacePatches} emphasis={1.14} />

        <mesh position={[0.72, 0.64, 1.42]}>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.86}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>

      <ConnectedBillboardLabel
        text="YOU"
        fontSize={1.12}
        color="#fffbed"
        glowColor="#ffca58"
        maxWidth={4.4}
        radius={2.05}
        distance={1.48}
        lift={0.94}
        sideBias={0.34}
        connectorOpacity={0.28}
        connectorThickness={0.028}
        dotSize={0.08}
      />
    </group>
  );
});

SelfCore.displayName = 'SelfCore';

const EventNode = memo(
  ({
    event,
    isSelected,
  }: {
    event: DomainEvent;
    isSelected: boolean;
  }) => {
    const groupRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Group>(null);
    const labelAnchorRef = useRef<THREE.Group>(null);
    const connectorRef = useRef<THREE.Mesh>(null);
    const radialDirection = useRef(new THREE.Vector3());
    const tangentDirection = useRef(new THREE.Vector3());
    const labelTarget = useRef(new THREE.Vector3());
    const connectorDirection = useRef(new THREE.Vector3());
    const connectorMidpoint = useRef(new THREE.Vector3());
    const connectorQuaternion = useRef(new THREE.Quaternion());

    useFrame((state, delta) => {
      if (
        !groupRef.current ||
        !bodyRef.current ||
        !labelAnchorRef.current ||
        !connectorRef.current
      ) {
        return;
      }

      const angle = event.phase + state.clock.elapsedTime * event.orbitSpeed;
      groupRef.current.position.set(
        Math.cos(angle) * event.orbitRadius,
        Math.sin(angle * 1.4 + event.phase) * 0.28,
        Math.sin(angle) * event.orbitRadius,
      );
      bodyRef.current.rotation.y += delta * 0.8;
      bodyRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.6 + event.phase) * 0.08;
      const targetScale = isSelected ? 1.12 : 1;
      const nextScale = THREE.MathUtils.lerp(bodyRef.current.scale.x, targetScale, 1 - Math.exp(-delta * 6));
      bodyRef.current.scale.setScalar(nextScale);

      radialDirection.current.copy(groupRef.current.position);
      if (radialDirection.current.lengthSq() < 0.0001) {
        radialDirection.current.set(1, 0, 0);
      }
      radialDirection.current.normalize();

      tangentDirection.current.set(-radialDirection.current.z, 0, radialDirection.current.x);
      if (tangentDirection.current.lengthSq() < 0.0001) {
        tangentDirection.current.set(event.labelSideOffset >= 0 ? 1 : -1, 0, 0);
      } else {
        tangentDirection.current.normalize();
      }

      labelTarget.current.copy(radialDirection.current).multiplyScalar(event.labelDistance + event.size);
      labelTarget.current.addScaledVector(tangentDirection.current, event.labelSideOffset);
      labelTarget.current.addScaledVector(WORLD_UP, event.labelLift);

      const labelEasing = 1 - Math.exp(-delta * 10);
      labelAnchorRef.current.position.lerp(labelTarget.current, labelEasing);
      labelAnchorRef.current.scale.setScalar(
        THREE.MathUtils.lerp(labelAnchorRef.current.scale.x, isSelected ? 1.04 : 1, 1 - Math.exp(-delta * 7)),
      );

      connectorDirection.current.copy(labelAnchorRef.current.position);
      const connectorLength = Math.max(connectorDirection.current.length(), 0.0001);
      connectorMidpoint.current.copy(connectorDirection.current).multiplyScalar(0.5);
      connectorRef.current.position.copy(connectorMidpoint.current);
      connectorQuaternion.current.setFromUnitVectors(WORLD_UP, connectorDirection.current.normalize());
      connectorRef.current.quaternion.copy(connectorQuaternion.current);
      connectorRef.current.scale.set(isSelected ? 1.08 : 1, connectorLength, isSelected ? 1.08 : 1);

      const connectorMaterial = connectorRef.current.material as THREE.MeshBasicMaterial;
      connectorMaterial.opacity = THREE.MathUtils.lerp(
        connectorMaterial.opacity,
        isSelected ? 0.3 : 0.18,
        1 - Math.exp(-delta * 7),
      );
    });

    return (
      <group ref={groupRef}>
        <group ref={bodyRef}>
          <mesh>
            <sphereGeometry args={[event.size, 20, 20]} />
            <meshPhysicalMaterial
              color={event.color}
              emissive={tintColor(event.glow, 0.04, 0.08)}
              emissiveIntensity={isSelected ? 1.2 : 0.7}
              roughness={0.28}
              metalness={0.04}
              clearcoat={0.52}
              clearcoatRoughness={0.22}
            />
          </mesh>

          <mesh position={[event.size * 0.34, event.size * 0.26, event.size * 0.7]}>
            <sphereGeometry args={[event.size * 0.14, 12, 12]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.78}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </group>

        <mesh ref={connectorRef}>
          <cylinderGeometry args={[0.012, 0.02, 1, 10, 1, true]} />
          <meshBasicMaterial
            color={event.glow}
            transparent
            opacity={0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>

        <group ref={labelAnchorRef}>
          <Billboard>
            <group>
              <mesh position={[-0.12, 0, -0.03]}>
                <sphereGeometry args={[0.04, 10, 10]} />
                <meshBasicMaterial
                  color={event.glow}
                  transparent
                  opacity={0.78}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                  toneMapped={false}
                />
              </mesh>

              <GlowingLabel
                text={event.label}
                fontSize={isSelected ? event.labelFontSize * 1.05 : event.labelFontSize}
                color="#eefcff"
                glowColor={event.glow}
                maxWidth={event.labelMaxWidth}
              />
            </group>
          </Billboard>
        </group>
      </group>
    );
  },
);

EventNode.displayName = 'EventNode';

const DomainPlanet = memo(
  ({
    planet,
    selectedDomainId,
    hoveredDomainId,
    registerPlanet,
    onHover,
    onSelect,
  }: {
    planet: DomainPlanetModel;
    selectedDomainId: DomainId | null;
    hoveredDomainId: DomainId | null;
    registerPlanet: (id: DomainId, object: THREE.Object3D | null) => void;
    onHover: (id: DomainId | null) => void;
    onSelect: (id: DomainId) => void;
  }) => {
    const orbitRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Group>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const isSelected = selectedDomainId === planet.id;
    const isHovered = hoveredDomainId === planet.id;
    const labelLayout = PLANET_LABEL_LAYOUTS[planet.id];
    const surfaceMaterial = useMemo(
      () =>
        createPlanetSurfaceMaterial({
          seed: hashString(`${planet.id}:${planet.label}:shader`),
          baseColor: planet.color,
          glowColor: planet.glow,
          ringColor: planet.ring,
          detail: planet.id === 'discipline' ? 1.18 : planet.id === 'social' ? 0.96 : 1.08,
        }),
      [planet.color, planet.glow, planet.id, planet.label, planet.ring],
    );
    const surfacePatches = useMemo(
      () =>
        createSurfacePatches({
          seedKey: `${planet.id}:${planet.label}`,
          radius: planet.size,
          palette: [
            tintColor(planet.color, 0.02, 0.16),
            tintColor(planet.color, -0.08, -0.04),
            tintColor(planet.glow, 0.04, 0.12),
            tintColor(planet.ring, -0.02, 0.08),
          ],
          glowColor: planet.glow,
          count: 10,
        }),
      [planet.color, planet.glow, planet.id, planet.label, planet.ring, planet.size],
    );

    useEffect(() => {
      return () => {
        surfaceMaterial.dispose();
      };
    }, [surfaceMaterial]);

    useEffect(() => {
      if (bodyRef.current) {
        bodyRef.current.userData.zoomRadius = planet.size;
      }

      registerPlanet(planet.id, bodyRef.current);
      return () => {
        registerPlanet(planet.id, null);
      };
    }, [planet.id, planet.size, registerPlanet]);

    useFrame((state, delta) => {
      if (!orbitRef.current || !bodyRef.current || !ringRef.current) return;

      const angle = planet.phase + state.clock.elapsedTime * planet.orbitSpeed;
      orbitRef.current.position.set(
        Math.cos(angle) * planet.orbitRadius * planet.orbitScale[0],
        Math.sin(angle * 1.2) * planet.heightAmplitude,
        Math.sin(angle) * planet.orbitRadius * planet.orbitScale[1],
      );

      bodyRef.current.rotation.y += delta * 0.18;
      bodyRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.18 + planet.phase) * 0.04;

      const targetScale = isSelected ? 1.12 : isHovered ? 1.05 : 1;
      const nextScale = THREE.MathUtils.lerp(bodyRef.current.scale.x, targetScale, 1 - Math.exp(-delta * 6));
      bodyRef.current.scale.setScalar(nextScale);

      const ringMaterial = ringRef.current.material as THREE.MeshBasicMaterial;
      const targetHover = isHovered ? 1 : 0;
      const targetSelected = isSelected ? 1 : 0;

      surfaceMaterial.uniforms.uTime.value = state.clock.elapsedTime;
      surfaceMaterial.uniforms.uHover.value = THREE.MathUtils.lerp(
        surfaceMaterial.uniforms.uHover.value as number,
        targetHover,
        1 - Math.exp(-delta * 5),
      );
      surfaceMaterial.uniforms.uSelected.value = THREE.MathUtils.lerp(
        surfaceMaterial.uniforms.uSelected.value as number,
        targetSelected,
        1 - Math.exp(-delta * 5),
      );

      ringMaterial.opacity = THREE.MathUtils.lerp(
        ringMaterial.opacity,
        isSelected ? 0.3 : isHovered ? 0.22 : 0.14,
        1 - Math.exp(-delta * 5),
      );

      ringRef.current.rotation.z += delta * 0.12;
    });

    return (
      <group rotation={planet.orbitTilt}>
        <group ref={orbitRef}>
        <group
          ref={bodyRef}
          onPointerOver={(event) => {
            event.stopPropagation();
            onHover(planet.id);
          }}
          onPointerOut={(event) => {
            event.stopPropagation();
            onHover(null);
          }}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(planet.id);
          }}
        >
          <pointLight color={planet.glow} intensity={1.4} distance={12} decay={2.2} />

          <mesh ref={ringRef} rotation={[Math.PI / 2 + 0.42, 0, 0]}>
            <torusGeometry args={[planet.size * 1.48, planet.size * 0.045, 22, 140]} />
            <meshBasicMaterial
              color={planet.ring}
              transparent
              opacity={0.14}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>

          <mesh>
            <sphereGeometry args={[planet.size, 40, 40]} />
            <primitive object={surfaceMaterial} attach="material" />
          </mesh>

          <SurfacePatchLayer patches={surfacePatches} emphasis={isSelected ? 1.2 : isHovered ? 1.05 : 0.92} />

          <mesh position={[planet.size * 0.35, planet.size * 0.3, planet.size * 0.74]}>
            <sphereGeometry args={[planet.size * 0.08, 14, 14]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.72}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>

          {planet.events.map((event) => (
            <EventNode key={event.id} event={event} isSelected={isSelected} />
          ))}
        </group>

          <ConnectedBillboardLabel
            text={planet.label}
            fontSize={planet.id === 'discipline' ? 0.72 : 0.78}
            color="#f8fdff"
            glowColor={planet.glow}
            maxWidth={7.6}
            radius={planet.size}
            distance={labelLayout.distance}
            lift={labelLayout.lift}
            sideBias={labelLayout.sideBias}
            connectorOpacity={isSelected ? 0.28 : 0.22}
            connectorThickness={0.026}
            dotSize={0.075}
          />
        </group>
      </group>
    );
  },
);

DomainPlanet.displayName = 'DomainPlanet';

const CameraRig = ({
  selectedDomainId,
  domainRefs,
}: {
  selectedDomainId: DomainId | null;
  domainRefs: MutableRefObject<Map<DomainId, THREE.Object3D>>;
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const desiredTarget = useRef(DEFAULT_CAMERA_TARGET.clone());
  const desiredPosition = useRef(DEFAULT_CAMERA_POSITION.clone());
  const focusPosition = useRef(new THREE.Vector3());
  const focusOffset = useRef(new THREE.Vector3());
  const isInteractingRef = useRef(false);
  const shouldReturnRef = useRef(false);
  const lastSelectedRef = useRef<DomainId | null>(null);

  useEffect(() => {
    if (lastSelectedRef.current && !selectedDomainId) {
      shouldReturnRef.current = true;
    }

    if (selectedDomainId) {
      shouldReturnRef.current = false;
    }

    lastSelectedRef.current = selectedDomainId;
  }, [selectedDomainId]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (isInteractingRef.current) {
      controls.update();
      return;
    }

    if (selectedDomainId) {
      const activeDomain = domainRefs.current.get(selectedDomainId);
      if (!activeDomain) {
        controls.update();
        return;
      }

      activeDomain.getWorldPosition(focusPosition.current);
      const zoomRadius = typeof activeDomain.userData.zoomRadius === 'number' ? activeDomain.userData.zoomRadius : 4;
      focusOffset.current.set(0, zoomRadius * 0.7 + 1.8, zoomRadius * 3 + 5.4);

      desiredTarget.current.copy(focusPosition.current);
      desiredPosition.current.copy(focusPosition.current).add(focusOffset.current);
    } else if (shouldReturnRef.current) {
      desiredTarget.current.copy(DEFAULT_CAMERA_TARGET);
      desiredPosition.current.copy(DEFAULT_CAMERA_POSITION);

      if (
        camera.position.distanceTo(DEFAULT_CAMERA_POSITION) < 0.08 &&
        controls.target.distanceTo(DEFAULT_CAMERA_TARGET) < 0.08
      ) {
        shouldReturnRef.current = false;
      }
    } else {
      controls.update();
      return;
    }

    const easing = 1 - Math.exp(-delta * 4.2);
    controls.target.lerp(desiredTarget.current, easing);
    camera.position.lerp(desiredPosition.current, easing);
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate
      enablePan
      enableZoom
      enableDamping
      dampingFactor={0.08}
      minDistance={8}
      maxDistance={54}
      zoomSpeed={0.9}
      panSpeed={0.55}
      rotateSpeed={0.72}
      screenSpacePanning={false}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      onStart={() => {
        isInteractingRef.current = true;
      }}
      onEnd={() => {
        isInteractingRef.current = false;
      }}
    />
  );
};

const SceneContent = ({
  domains,
  selectedDomainId,
  hoveredDomainId,
  onHover,
  onSelect,
}: {
  domains: DomainPlanetModel[];
  selectedDomainId: DomainId | null;
  hoveredDomainId: DomainId | null;
  onHover: (id: DomainId | null) => void;
  onSelect: (id: DomainId) => void;
}) => {
  const domainRefs = useRef(new Map<DomainId, THREE.Object3D>());

  const registerPlanet = useCallback((id: DomainId, object: THREE.Object3D | null) => {
    if (object) {
      domainRefs.current.set(id, object);
    } else {
      domainRefs.current.delete(id);
    }
  }, []);

  return (
    <>
      <PerspectiveCamera makeDefault position={[DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.y, DEFAULT_CAMERA_POSITION.z]} fov={38} />
      <CameraRig selectedDomainId={selectedDomainId} domainRefs={domainRefs} />

      <fog attach="fog" args={['#030711', 16, 48]} />
      <ambientLight intensity={0.42} color="#dbe8ff" />
      <hemisphereLight intensity={0.56} color="#a5d2ff" groundColor="#010309" />
      <directionalLight position={[12, 12, 10]} intensity={0.9} color="#ffffff" />
      <directionalLight position={[-16, -8, -10]} intensity={0.28} color="#77d4ff" />
      <pointLight position={[0, 0, 0]} intensity={0.85} distance={26} color="#95e8ff" />

      <CosmicBackdrop />
      <NebulaClouds />
      <Starfield />

      {domains.map((planet) => (
        <OrbitTrack key={`${planet.id}:track`} planet={planet} />
      ))}

      <SelfCore />

      {domains.map((planet) => (
        <DomainPlanet
          key={planet.id}
          planet={planet}
          selectedDomainId={selectedDomainId}
          hoveredDomainId={hoveredDomainId}
          registerPlanet={registerPlanet}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </>
  );
};

export const CognitiveSpace3DView = ({ model }: CognitiveSpace3DViewProps) => {
  const [selectedDomainId, setSelectedDomainId] = useState<DomainId | null>(null);
  const [hoveredDomainId, setHoveredDomainId] = useState<DomainId | null>(null);
  const [isPending, startTransition] = useTransition();

  const domains = useMemo(() => buildDomainPlanets(model), [model]);
  const selectedDomain = domains.find((domain) => domain.id === selectedDomainId) ?? null;

  return (
    <section className="relative h-[78vh] min-h-[680px] overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(67,193,255,0.12),transparent_24%),radial-gradient(circle_at_80%_20%,rgba(255,125,84,0.08),transparent_20%),linear-gradient(180deg,rgba(2,7,16,0.98),rgba(1,5,10,1))] shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.1)_0.6px,transparent_0.6px)] [background-size:18px_18px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />

      <div className="absolute left-5 top-5 z-10 flex flex-wrap gap-2">
        {[
          'Wheel to zoom',
          'Drag to orbit',
          'Right drag to pan',
          'Click a planet to focus',
          'Click empty space to reset',
        ].map((hint) => (
          <span
            key={hint}
            className="rounded-full border border-white/10 bg-[rgba(5,10,18,0.5)] px-3 py-1 text-[0.68rem] uppercase tracking-[0.18em] text-slate-200 backdrop-blur-xl"
          >
            {hint}
          </span>
        ))}
      </div>

      <div className="pointer-events-none absolute left-1/2 top-5 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-[rgba(5,10,18,0.45)] px-4 py-2 text-[0.74rem] font-medium uppercase tracking-[0.28em] text-slate-100 backdrop-blur-xl">
        Cognitive Space Simulation
      </div>

      <div className="pointer-events-none absolute bottom-5 right-5 z-10 rounded-[24px] border border-white/10 bg-[rgba(5,10,18,0.45)] px-4 py-3 text-right backdrop-blur-xl">
        <p className="text-[0.62rem] uppercase tracking-[0.22em] text-slate-400">Focus</p>
        <p className="mt-1 text-sm font-medium text-white">{selectedDomain ? selectedDomain.label : 'WHOLE SYSTEM'}</p>
      </div>

      <div className={`h-full transition-opacity duration-300 ${isPending ? 'opacity-75' : 'opacity-100'}`}>
        <Canvas
          dpr={[1, 1.8]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          onContextMenu={(event) => event.preventDefault()}
          onPointerMissed={() =>
            startTransition(() => {
              setSelectedDomainId(null);
              setHoveredDomainId(null);
            })
          }
        >
          <SceneContent
            domains={domains}
            selectedDomainId={selectedDomainId}
            hoveredDomainId={hoveredDomainId}
            onHover={setHoveredDomainId}
            onSelect={(id) =>
              startTransition(() => {
                setSelectedDomainId((current) => (current === id ? null : id));
                setHoveredDomainId(null);
              })
            }
          />
        </Canvas>
      </div>
    </section>
  );
};
