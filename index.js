/*remap

_SYNTAX,a
false,0
true,1
null,0
const,let
Infinity,1e9

_MISC,a
_index,a
_position,b
_isStartFinish,c
_vertices,d
_indices,e
_checkpoints,f
_splinePoints,g
_boostPads,h
_padRadius,i
_idx,j
_padOffset,k

_AUDIO,a
_module,a
_loop,b
_samples,c
_buffer,d
_gainNode,e
_timer,f

_CAR,a
_name,a
_accentColor,b
_carVAO,c
_laneOffset,d
_baseOffset,e
_targetOffset,f
_acceleration,g
_braking,h
_maxSpeed,i
_turnSpeed,j
_yaw,k
_pitch,l
_roll,m
_speed,n
_racePosition,o
_lap,p
_audio,q
_currentLapTime,r
_points,s
_finished,t
_skill,u
_steer,v
_lastYaw,w
_nextCheckpointIdx,x
_lastIdx,y
_nextPad,z
_progress,A
_uid,C

_CARS/PARTICLES
_x,X
_y,Y
_z,Z

_PARTICLES,a
_vx,a
_vy,b
_vz,c
_life,d
_size,e
_color,f

_TRACKDEFS,a
_trackName,a
_radius,b
_numPoints,c
_hillAmp1,d
_hillAmp2,e
_seed,f
_trackWidth,g
_checkPointCount,h
_aiCarCount,i
_aiSpeed,j
_aiSkill,k
_numberOfLaps,l
_boosterCount,m
_gradient,n

_SHADERS,a
_vUv,A
_aColor,B
_vColor,C
_aPos,D
_uPos,E
_vPos,G
_pt,I
_worldPos,J
_skyY,K
_uCamEye,L
_uCamLook,M
_uSky,O
_uRot,R
_uLean,S
_rel,T
_diff,U
_depth,V
_fogColor,W
_fog,X
_lightDir,Y
_light,Z

*/

onkeydown = e => keys[e.key.toLowerCase()] = true;
onkeyup = e => keys[e.key.toLowerCase()] = false;

const PREGAME_MENU  = 0;
const MAIN_MENU     = 1;
const OPTIONS_MENU  = 2;
const INSTANT_MENU  = 3;
const CAMPAIGN_MENU = 4;
const HUD_MENU      = 5;
const ENDGAME_MENU  = 6;

//#region GEOMETRY

const addQuad = (verts, indices, cx, cy, cz, size, color) => {
  const vStart = verts.length / 6;
  const s = size / 2;
  verts.push(
    cx - s, cy, cz - s, ...color,
    cx + s, cy, cz - s, ...color,
    cx + s, cy, cz + s, ...color,
    cx - s, cy, cz + s, ...color
  );
  indices.push(vStart, vStart + 1, vStart + 2, vStart, vStart + 2, vStart + 3);
};

const addBox = (verts, indices, cx, cy, cz, w, h, d, R = 0, color, U, F) => {

  const BOX_BASE = [
    -0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    0.5,-0.5,-0.5, -0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5,
    -0.5, 0.5,-0.5, -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,  0.5, 0.5,-0.5,
    -0.5,-0.5,-0.5,  0.5,-0.5,-0.5,  0.5,-0.5, 0.5, -0.5,-0.5, 0.5,
    0.5,-0.5, 0.5,  0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5, 0.5, 0.5,
    -0.5,-0.5,-0.5, -0.5,-0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5,-0.5
  ];

  const vStart = verts.length / 6;

  // If R is a rotation angle (number), compute the standard Y-rotation basis vectors.
  if (typeof R === 'number') {
    const c = Math.cos(R), s = Math.sin(R);
    R = [c, 0, s]; U = [0, 1, 0]; F = [-s, 0, c];
  }

  for (let i = 0; i < 24; i++) {
    const lx = BOX_BASE[i * 3] * w;
    const ly = BOX_BASE[i * 3 + 1] * h;
    const lz = BOX_BASE[i * 3 + 2] * d;

    // Transform local box space using basis vectors R, U, F.
    verts.push(
      cx + lx * R[0] + ly * U[0] + lz * F[0],
      cy + lx * R[1] + ly * U[1] + lz * F[1],
      cz + lx * R[2] + ly * U[2] + lz * F[2],
      ...color
    );
  }

  for (let i = 0; i < 6; i++) {
    const o = vStart + i * 4;
    indices.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
};

// Generates spline control points for closed-loop racetrack.
const generateTrack = (baseRadius, numPoints, hillAmplitude1, hillAmplitude2) => {

  controlPoints = [];

  const cx = cy = 0;

  // Wave Frequencies: Determines bend density around the 360° circle.
  const f1 = 2 + randomFloat(); // Primary layout wave (~2 to 3 major turns).
  const f2 = 3 + randomFloat(); // Secondary layout wave (~3 to 4 minor chicanes).

  // Phase Shifts (0 to ~2π): Offsets wave starting positions for unique layouts.
  const p1 = randomFloat() * 6;
  const p2 = randomFloat() * 6;

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2; // Step angle uniformly around the full circle in radians.
    let v = Math.sin(angle * f1 + p1) * 520 + Math.sin(angle * f2 + p2) * 280; // Radial perturbation: Superimpose major turn wave + minor chicane wave.
    if (v < 0) v *= 1.1; // Asymmetry: Sharpen inward turns (hairpins) slightly more than outward curves.
    const r = Math.max(850, baseRadius + v); // Final radius with safety clamp to prevent self-intersecting center pinches.
    const y = Math.sin(angle * 2 + p1) * hillAmplitude1 + Math.cos(angle * 5 + p2) * hillAmplitude2; // Vertical elevation: Overlapping waves create seamless looping hills.
    controlPoints.push([cx + Math.cos(angle) * r, y, cy + Math.sin(angle) * r]); // Polar-to-Cartesian 3D coordinate conversion [X, Y, Z].
  }

  // return controlPoints;
};

// build track mesh.
const buildTrackMesh = (earlyExit = false) => {
  
  const catmullRom = (p0, p1, p2, p3, t) => {
    const t2 = t * t, t3 = t2 * t;
    const c0 = -t + 2 * t2 - t3;
    const c1 = 2 - 5 * t2 + 3 * t3;
    const c2 = t + 4 * t2 - 3 * t3;
    const c3 = -t2 + t3;
    return p0.map((v, i) => 0.5 * (v * c0 + p1[i] * c1 + p2[i] * c2 + p3[i] * c3));
  };

  const segmentsPerSpan = 30;

  const N = controlPoints.length;
  splinePoints = [];

  for (let i = 0; i < N; i++) {
    const p0 = controlPoints[(i - 1 + N) % N];
    const p1 = controlPoints[i];
    const p2 = controlPoints[(i + 1) % N];
    const p3 = controlPoints[(i + 2) % N];
    for (let s = 0; s < segmentsPerSpan; s++) {
      splinePoints.push(catmullRom(p0, p1, p2, p3, s / segmentsPerSpan));
    }
  }

  totalSplinePoints = splinePoints.length; // Set global variable.

  if (earlyExit) return; // Exit early if generating an instant race track.

  const vertices = [];
  const indices = [];

  for (let i = 0; i < totalSplinePoints; i++) {
    const prev = splinePoints[(i - 1 + totalSplinePoints) % totalSplinePoints];
    const next = splinePoints[(i + 1) % totalSplinePoints];
    const curr = splinePoints[i];

    const dx = next[0] - prev[0], dz = next[2] - prev[2];
    const len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len, nz = dx / len;

    for (let k = 0; k < 7; k++) {
      const fracLeft = (k / 7 - 0.5) * 2;
      const fracRight = ((k + 1) / 7 - 0.5) * 2;
      const color = ROYGBIV[k];

      vertices.push(curr[0] + nx * halfTrack * fracLeft, curr[1], curr[2] + nz * halfTrack * fracLeft, ...color);
      vertices.push(curr[0] + nx * halfTrack * fracRight, curr[1], curr[2] + nz * halfTrack * fracRight, ...color);

      const idx = (i * 7 + k) * 2;
      const nextIdx = (((i + 1) % totalSplinePoints) * 7 + k) * 2;

      indices.push(idx, idx + 1, nextIdx, nextIdx, idx + 1, nextIdx + 1);
    }
  }

  trackData = {
    _vertices: new Float32Array(vertices),
    _indices: new Uint16Array(indices),
    _splinePoints: splinePoints
  };
};

// Build checkpoints.
// Note: Are the really good enough? They could be more "rainbow" themed, especially the start/finish line!!
const buildCheckpointsMesh = checkPointCount => {
  const vertices = [], indices = [];
  const _checkpoints = [];
  const step = (totalSplinePoints / checkPointCount) || 0;

  for (let i = 0; i < checkPointCount; i++) {
    const _index = i * step;
    const _position = splinePoints[_index];
    const next = splinePoints[(_index + 1) % totalSplinePoints];

    const dx = next[0] - _position[0];
    const dz = next[2] - _position[2];
    const len = Math.hypot(dx, dz) || 1;

    // Basis Vectors along track orientation.
    const F = [dx / len, 0, dz / len]; // Forward.
    const U = [0, 1, 0];               // Up.
    const R = [F[2], 0, -F[0]];        // Right (perpendicular across track).

    // const rotY = Math.atan2(dx, dz);
    const _isStartFinish = (i === 0);
    // checkpoints.push({ _index: idx, pos: curr, rotY, isStartFinish });
    _checkpoints.push({ _index, _position, _isStartFinish});

    const thickness = 24;
    const gateWidth = trackWidth + 120;
    const gateHeight = trackWidth + 26; // TRACK_WIDTH + 50 - thickness.

    const colPillar = _isStartFinish ? [0.25, 0.25, 0.3] : [0.1, 0.8, 0.95];
    const colTop = _isStartFinish ? [0.95, 0.85, 0.15] : [0.2, 0.95, 1.0];
    const colBottom = _isStartFinish ? [0.2, 0.2, 0.2] : [0.05, 0.65, 0.85];

    const halfW = gateWidth / 2;
    const halfH = gateHeight / 2;
    const baseY = _position[1] - halfH;

    [
      [-halfW, halfH, 0, thickness, gateHeight + thickness, thickness, colPillar], // Left Pillar.
      [ halfW, halfH, 0, thickness, gateHeight + thickness, thickness, colPillar], // Right Pillar.
      [ 0, gateHeight + thickness, 0, gateWidth + thickness, thickness, thickness, colTop], // Top Crossbar.
      [ 0, -thickness, 0, gateWidth + thickness, thickness, thickness, colBottom] // Bottom Crossbar.
    ].forEach(([lx, ly, lz, w, h, d, col]) => {
      addBox(
        vertices, indices,
        _position[0] + lx * R[0], baseY + ly, _position[2] + lx * R[2],
        w, h, d, R, col, U, F
      );
    });
  }

  return {
    _vertices: new Float32Array(vertices),
    _indices: new Uint16Array(indices),
    _checkpoints
  };
};

// Create booster pad meshes.
const buildBoostPadsMesh = boosterCount => {
  const vertices = [], indices = [];
  const _boostPads = [];
  const step = totalSplinePoints / boosterCount;

  const padWidth = trackWidth / 7;  // Exactly 1 rainbow stripe wide.
  const padLength = trackWidth / 3; // Extended length along track direction.
  const padHeight = 0.3; // Thin flush strip above asphalt.

  for (let b = 0; b < boosterCount; b++) {
    // Step along track points.
    const _idx = Math.floor((b + 0.5) * step) % totalSplinePoints;
    const curr = splinePoints[_idx];
    const next = splinePoints[(_idx + 1) % totalSplinePoints];

    const dx = next[0] - curr[0];
    const dy = next[1] - curr[1];
    const dz = next[2] - curr[2];
    const len = Math.hypot(dx, dy, dz) || 1;
    const lenXZ = Math.hypot(dx, dz) || 1;

    // 3D Basis vectors incorporating track slope/pitch.
    const F = [dx / len, dy / len, dz / len];
    const R = [dz / lenXZ, 0, -dx / lenXZ];
    const U = [
      -dx * dy / (len * lenXZ),
      lenXZ / len,
      -dz * dy / (len * lenXZ)
    ];

    // Pick a random rainbow lane (0 to 6) and align pad center to that stripe.
    const laneIndex = Math.floor(randomFloat() * 7);
    const laneFrac = (laneIndex + 0.5) / 7 - 0.5;
    const lateralOffset = laneFrac * trackWidth;

    // Center coordinates slightly above surface to prevent Z-fighting.
    const padX = curr[0] + R[0] * lateralOffset + U[0] * 0.3;
    const padY = curr[1] + R[1] * lateralOffset + U[1] * 0.3;
    const padZ = curr[2] + R[2] * lateralOffset + U[2] * 0.3;

    addBox(
      vertices, indices,
      padX, padY, padZ,
      padWidth, padHeight, padLength,
      R, ROYGBIV[COLOR_GOLD], U, F
    );

    _boostPads.push({ x: padX, y: padY, z: padZ, _padRadius: padWidth * 0.95, _idx, _padOffset: lateralOffset });

  }

  return {
    _vertices: new Float32Array(vertices), 
    _indices: new Uint16Array(indices), 
    _boostPads
  };
};

// Fluff up the clouds.
const buildOuterCloudsMesh = e => {

  const maxDistance = 1e4;
  const yRange =  [-1300, 1300]; // No lower, or menu clouds look wonky (well wonkier LOL).

  const vertices = [];
  const indices = [];

  const minY = yRange[0], maxY = yRange[1];
  const minDist = (trackWidth / 2) + 350;

  for (let i = 0; i < totalSplinePoints; i += 3) {
    const pt = splinePoints[i];
    const distFromCenter = Math.hypot(pt[0], pt[2]) || 1;
    const outX = pt[0] / distFromCenter, outZ = pt[2] / distFromCenter;

    const cloudDist = minDist + Math.random() * Math.max(0, maxDistance - minDist);
    const cloudX = pt[0] + outX * cloudDist;
    const cloudZ = pt[2] + outZ * cloudDist;
    const cloudY = minY + Math.random() * (maxY - minY);

    const subBoxes = 2 + (Math.random() * 4) || 0;
    for (let b = 0; b < subBoxes; b++) {
      const bx = cloudX + (Math.random() - 0.5) * 140;
      const by = cloudY + (Math.random() - 0.5) * 50;
      const bz = cloudZ + (Math.random() - 0.5) * 140;

      const scaleMult = 1.0 + (cloudDist / 1200);
      const bw = (100 + Math.random() * 140) * scaleMult;
      const bh = (40 + Math.random() * 70) * scaleMult;
      const bd = (90 + Math.random() * 120) * scaleMult;

      const shade = 0.90 + Math.random() * 0.10;
      addBox(vertices, indices, bx, by, bz, bw, bh, bd, 0, [shade, shade * 0.98, shade * 1.02]);
      
      // boxes.push({ x: bx, z: bz, w: bw, d: bd });
    }
  }

  return { _vertices: new Float32Array(vertices), _indices: new Uint16Array(indices) };
  // return { _vertices: new Float32Array(vertices), _indices: new Uint16Array(indices), boxes };
};

// Erect my namesakes!
const buildInnerCliffMesh = e => {
  const vertices = [];
  const indices = [];
  // const boxes = [];

  // Note: Possibly could prune/tweak to save bytes.
  const stonePalette = [
    [0.46, 0.48, 0.52], 
    [0.52, 0.48, 0.55], 
    [0.66, 0.48, 0.45], 
    [0.40, 0.42, 0.46], 
    [0.60, 0.54, 0.52], 
  ];

  const innerOffsetDist = trackWidth / 2 + 180; // Distance inward from track center.
  const minPillarSpacing = 150; // Minimum space between pillars along inner ring.

  let lastPlacedX = lastPlacedZ = -1e9;

  for (let i = 0; i < totalSplinePoints; i++) {
    const prev = splinePoints[(i - 1 + totalSplinePoints) % totalSplinePoints];
    const next = splinePoints[(i + 1) % totalSplinePoints];
    const curr = splinePoints[i];

    // Calculate local track direction (tangent).
    const dx = next[0] - prev[0];
    const dz = next[2] - prev[2];
    const len = Math.hypot(dx, dz) || 1;

    // Determine inward vector perpendicular to track direction.
    let nx = -dz / len;
    let nz = dx / len;
    const dotProduct = (curr[0] * nx + curr[2] * nz);
    if (dotProduct > 0) {
      nx = -nx;
      nz = -nz;
    }

    // Compute position on the "inner track" offset line.
    const cliffX = curr[0] + nx * innerOffsetDist;
    const cliffZ = curr[2] + nz * innerOffsetDist;

    // Enforce minimum arc-length distance spacing along the inner ring.
    const distFromLast = Math.hypot(cliffX - lastPlacedX, cliffZ - lastPlacedZ);
    if (distFromLast < minPillarSpacing) {
      continue; // Skip if too close to the previous pillar.
    }

    // Box size & corner radius.
    const bw = 70 + Math.random() * 75;
    const bd = 70 + Math.random() * 75;
    const boxRadius = Math.hypot(bw, bd) / 2; // Max distance from box center to its corners.

    // Track Safety Distance Check: ensure pillar won't encroach on ANY track point.
    const minSafeDist = (trackWidth / 2) + boxRadius + 30; // 30 unit safety buffer.
    const minSafeDistSq = minSafeDist * minSafeDist;

    let encroaches = false;
    for (let s = 0; s < totalSplinePoints; s++) {
      const sp = splinePoints[s];
      const sdx = cliffX - sp[0];
      const sdz = cliffZ - sp[2];
      if (sdx * sdx + sdz * sdz < minSafeDistSq) {
        encroaches = true;
        break; // Pillar center is too close to track segment s.
      }
    }

    if (encroaches) {
      continue; // Skip this pillar to keep track apex clear.
    }

    lastPlacedX = cliffX;
    lastPlacedZ = cliffZ;

    // Spawn safe pillar.
    const bh = 1400 + Math.random() * 800;
    const by = -1500 + bh / 2;

    const baseCol = stonePalette[Math.floor(Math.random() * stonePalette.length)];
    const shade = 0.85 + Math.random() * 0.25;
    const color = [baseCol[0] * shade, baseCol[1] * shade, baseCol[2] * shade];

    const rotY = Math.random() * 7;

    addBox(vertices, indices, cliffX, by, cliffZ, bw, bh, bd, rotY, color);
    // boxes.push({ x: cliffX, z: cliffZ, w: bw, d: bd });
  }

  return { _vertices: new Float32Array(vertices), _indices: new Uint16Array(indices) };
  // return { _vertices: new Float32Array(vertices), _indices: new Uint16Array(indices), boxes };
};

// Create a mesh from the given data.
const createCarMesh = accentIdx => {
 const accentColor = ROYGBIV[accentIdx];

  const vertices = [], indices = [];

  [
    [-3, -2, -5, 3, 2, 4, 0, ROYGBIV[COLOR_PURPLE]], // rb_foot.
    [3, -2, -5, 3, 2, 4, 0, ROYGBIV[COLOR_PURPLE]], // lb_foot.
    [3, -2, 2, 3, 2, 4, 0, ROYGBIV[COLOR_PURPLE]], // lf_foot.
    [-3, -2, 2, 3, 2, 4, 0, ROYGBIV[COLOR_PURPLE]], // rf_foot.
    
    [-3, 1, 2, 3, 4, 4, 0, ROYGBIV[COLOR_WHITE]], // rf_leg.
    [3, 1, 2, 3, 4, 4, 0, ROYGBIV[COLOR_WHITE]], // lf_leg.
    [-3, 1, -5, 3, 4, 4, 0, ROYGBIV[COLOR_WHITE]], // rb_leg.
    [3, 1, -5, 3, 4, 4, 0, ROYGBIV[COLOR_WHITE]], // lb_leg.

    [0, 5, -1, 9, 6, 11, 0, ROYGBIV[COLOR_WHITE]], // torso.
    [0, 6, -9, 2, 4, 3, 0, accentColor], // tail_end.
    [0, 8, -7, 2, 4, 4, 0, accentColor], // tail_top.

    [0, 7, 4, 5, 7, 5, 0, ROYGBIV[COLOR_WHITE]], // neck.

    [0, 14, 5, 5, 8, 8, 0, ROYGBIV[COLOR_WHITE]], // head.
    [3, 18, 3, 1, 3, 2, 0, ROYGBIV[COLOR_WHITE]], // lear.
    [-3, 18, 3, 1, 3, 2, 0, ROYGBIV[COLOR_WHITE]], // rear.
    [0, 13, 10, 5, 4, 4, 0, ROYGBIV[COLOR_WHITE]], // snout.
    [0, 19, 7, 1, 5, 1, 0, ROYGBIV[COLOR_GOLD]], // horn.
    [0, 16, 7, 6, 2, 2, 0, ROYGBIV[COLOR_BLACK]], // eyes.
    [0, 15, 3, 3, 8, 5, 0, accentColor], // mane.

  ].forEach(data => {
    addBox(vertices, indices, ...data);
  });

  return { _vertices: new Float32Array(vertices), _indices: new Uint16Array(indices) };
};

// Build the mesh for the endgame scene (which is very lame, but an endgame scene nontheless).
const buildPodiumMesh = e => {

  const vertices = [], indices = [];

  const SIZE = 24;
  [//x      y    z  w     h   d
    [0,     -5,  0, SIZE, 30, SIZE, 0, ROYGBIV[COLOR_WHITE]], // Middle (1st).
    [SIZE,  -10, 0, SIZE, 20, SIZE, 0, ROYGBIV[COLOR_WHITE]], // Left (2nd.)
    [-SIZE, -10, 0, SIZE, 20, SIZE, 0, ROYGBIV[COLOR_WHITE]], // Right (3rd).
  ].forEach(data => {
    addBox(vertices, indices, ...data);
  });

  return { _vertices: new Float32Array(vertices), _indices: new Uint16Array(indices) };
};

//#endregion





//#region WEBGL
// GL constants.
const STATIC_DRAW           = 35044;
const FLOAT                 = 5126;
const ARRAY_BUFFER          = 34962;
const ELEMENT_ARRAY_BUFFER  = 34963;
const VERTEX_SHADER         = 35633;
const FRAGMENT_SHADER       = 35632;
const DEPTH_TEST            = 2929;
const TRIANGLES             = 4;
const UNSIGNED_SHORT        = 5123;
const BLEND                 = 3042;
const SRC_ALPHA             = 770;
const ONE                   = 1;
const DYNAMIC_DRAW          = 35048;

const gl = c.getContext`webgl2`;

const skyVsSource=`#version 300 es\nout vec2 _vUv;void main(){vec2 p=vec2((gl_VertexID == 2)?3.0:-1.0,(gl_VertexID == 1)?3.0:-1.0);_vUv=p*0.5+0.5;gl_Position=vec4(p,0.9999,1.0);}`;
const skyFsSource = `#version 300 es\nprecision highp float;uniform vec3 _uSky[2];in vec2 _vUv;out vec4 fragColor;void main(){fragColor=vec4(mix(_uSky[0],_uSky[1],_vUv.y),1.0);}`;
const vsSource = `#version 300 es\nlayout(location=0) in vec3 _aPos;layout(location=1) in vec3 _aColor;uniform vec3 _uPos,_uCamEye,_uCamLook;uniform vec2 _uRot,_uLean;out vec3 _vColor;out vec3 _worldPos;void main(){_vColor=_aColor;vec3 p=_aPos;float h=max(0.0,p.y+2.0);float h2=h*h;p.x+=_uLean.x*h2*0.015;float _pt=_uRot.x+_uLean.y*h2*0.0025,sx=sin(_pt),cx=cos(_pt);p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);float sy=sin(_uRot.y),cy=cos(_uRot.y);p=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);_worldPos=p+_uPos;vec3 F=normalize(_uCamLook-_uCamEye);vec3 R=normalize(cross(F,vec3(0,1,0)));vec3 U=cross(R,F);vec3 _rel=_worldPos-_uCamEye;vec3 _vPos=vec3(dot(_rel,R),dot(_rel,U),dot(_rel,F));gl_Position=vec4(_vPos.x*0.974,_vPos.y*1.732,_vPos.z*1.00025-2.0,_vPos.z);}`;
const fsSource = `#version 300 es\nprecision highp float;in vec3 _vColor;in vec3 _worldPos;uniform vec3 _uSky[2];out vec4 fragColor;void main(){vec3 N=normalize(cross(dFdx(_worldPos),dFdy(_worldPos)));vec3 _lightDir=normalize(vec3(-0.4,0.8,-0.5));float _diff=max(dot(N,_lightDir),0.0);float _light=0.70+0.30*_diff;float _depth=gl_FragCoord.z/gl_FragCoord.w;float _fog=clamp((_depth-500.0)/4500.0,0.0,1.0);float _skyY=clamp(gl_FragCoord.y/1080.0,0.0,1.0);vec3 _fogColor=mix(_uSky[0],_uSky[1],_skyY);fragColor=vec4(mix(_vColor*_light,_fogColor,_fog),1.0);}`;

const createProgram = (vs, fs) => {
  const p = gl.createProgram();
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    gl.attachShader(p, s);
  };
  compile(VERTEX_SHADER, vs);
  compile(FRAGMENT_SHADER, fs);
  gl.linkProgram(p);
  return p;
};

const createBufferObject = mesh => {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer();
  gl.bindBuffer(ARRAY_BUFFER, vbo);
  gl.bufferData(ARRAY_BUFFER, mesh._vertices, STATIC_DRAW);

  const ebo = gl.createBuffer();
  gl.bindBuffer(ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(ELEMENT_ARRAY_BUFFER, mesh._indices, STATIC_DRAW);

  gl.vertexAttribPointer(0, 3, FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(1, 3, FLOAT, false, 24, 12);
  gl.enableVertexAttribArray(1);

  return { vao, count: mesh._indices.length };
};

const skyProgram = createProgram(skyVsSource, skyFsSource);
const sceneProgram = createProgram(vsSource, fsSource);

const uSkyLoc = gl.getUniformLocation(skyProgram, '_uSky');
const uSceneSkyLoc = gl.getUniformLocation(sceneProgram, '_uSky');

const uPos = gl.getUniformLocation(sceneProgram, '_uPos');
const uRot = gl.getUniformLocation(sceneProgram, '_uRot');
const uCamEye = gl.getUniformLocation(sceneProgram, '_uCamEye');
const uCamLook = gl.getUniformLocation(sceneProgram, '_uCamLook');
const uLeanLoc = gl.getUniformLocation(sceneProgram, '_uLean');

gl.viewport(0, 0, 1920, 1080);
//#endregion





//#region AUDIO

// This sound system is a modified version of ZzFXM (https://github.com/keithclark/ZzFXM), which also includes ZzFX (https://github.com/.KilledByAPixel/ZzFX).

const menuMusicModule = [
  [ // Instruments.
    [0.49,,261.63,,0.21,0.09,5,1,,,,,.25,,,,,0.9,0.02],
    [0.23,,261.63,,0.13,0.08,5,0.4,,,,,,,,,,0.7,0.02],
    [0.42,,130.815,,0.11,0.05,2,0.8,,,,,,,,,,0.85,0.02],
    [0.99,,209,,,0.04,,1,,,-52.25,0.012,,.45,,,,0.03,0.03],
    [0.54,,988,,,0.02,4,1,-10,,,,,.675,,,,0.03,0.01],
    [0.42,,130.815,,0.11,0.054,2,0.8,-0.30,,,,,,,,,0.85,0.02],
    [1.00,,2091,,,0.04,,1,,,-25.1,0.018,,.45,,,,0.03,0.03],
    [0.90,,380,,,0.04,4,1,-10,,,,,.5625,,,,0.03,0.03],
  ],
  [ // Patterns.

  [ // A (verse)
    [0 ,0,17,0,0,17,17,0,0,17,20,0,24,0,20,0,0,0,25,0,0,22,29,0,0,22,22,0,25,0,22],
    [1 ,0,0,17,20,0,13,17,20,17,20,24,0,24,0,24,27,24,0,25,29,0,0,25,29,0,0,22,25,22,0,22,25,22],
    [2 ,0,13,0,20,0,13,0,20,20,20,0,27,0,20,0,27,27,22,0,29,0,22,0,29,29,18,0,25,0,18,0,25,25],
    [3 ,0,1,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,1],
    [4 ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,0,32],
  ],
  [ // B (contrast)
    [0 ,0,0,0,0,13,17,0,0,17,20,0,0,24,27,0,0,20,0,0,0,25,29,0,0,29,22,0,0,22,18,0,0,18],
    [1 ,0,0,0,17,0,0,0,17,0,20,0,24,0,0,0,24,0,0,0,25,0,29,0,25,0,0,0,22,0,25,0,22],
    [2 ,0,13,0,0,20,0,20,0,20,20,0,0,27,0,27,0,27,22,0,0,29,0,29,0,29,18,0,0,25,0,25],
    // [3],
    [3 ,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [4 ,0,0,0,32,0,0,0,32,0,0,0,0,0,0,0,0,0,0,0,32,0,0,0,0,0,0,0,32,0,32,0,32],
    [4 ,0,13,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,22],
    // [1,0,13],
    [5 ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,25],
    [6 ,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [7 ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14],
  ],
],
  [0,0,1,0], // Sequence.
  87 // BPM.
];

const campaignMusicModule = [
  [ // Instruments.
    [0.46,,261.63,0.005,0.19,0.07,5,1,,,,,0.3,,,,,0.9,0.02,0.18],
    [0.23,,261.63,0.005,0.11,0.09,5,0.4,,,,,,,,,,0.7,0.02],
    [0.51,,130.815,,0.05,0.02,5,1,,,,,,,,,,1,0.02],
    [0.77,,38,,0.01,0.05,4,1,-1,,,,,0.45,,,,0.03,0.03],
    [0.85,,209,,0.01,0.05,,1,,,-52.25,0.01,,0.45,,,,0.03,0.03],
    [0.46,,988,,,0.02,4,1,-1,,,,,0.68,,,,0.03,0.01],
  ],
  [ // Patterns.

  [ // A (verse)
    [0,0,16,0,0,21,12,0,0,16,21,0,0,19,0,0,21,0,17,0,0,21,21,0,0,24,23,0,0,23,0,0,19],
    [1,0,0,0,0,0,0,0,0,0,0,24,28,0,28,24,0,0,0,0,0,0,21,0,0,0,19,23,26,0,26,23],
    [2,0,12,0,0,19,12,0,0,19,21,0,0,28,21,0,0,28,17,0,0,24,17,0,0,24,19,0,0,26,19,0,0,26],
    [3],
    [4,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [5,0,0,0,32,0,32,0,32,0,0,0,0,0,32,0,32,0,0,0,0,0,32,0,32,0,0,0,32,0,32],
  ],
  [ // B (contrast)
    [0,0,12,0,19,0,12,0,0,0,19,0,19,19,0,19,0,0,12,0,19,0,12,0,0,0,17,0,21,24,0,21],
    [1,0,12,19,0,0,12,19,16,0,0,26,23,0,19,0,23,0,0,28,0,0,0,28,24,0,17,24,0,0,17,24,21],
    [2,0,12,0,0,19,0,19,0,19,19,0,0,26,0,26,0,26,21,0,0,28,0,28,0,28,17,0,0,24,0,24,0,24],
    [3],
    [4,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,1],
    [5,0,0,0,0,0,32,0,32,0,0,0,32,0,32,0,0,0,0,0,32,0,32,0,32,0,0,0,32,0,32,0,32],
  ],
  [ // C (bridge)
    [0,0,12,0,0,19,0,0,0,0,21,0,0,0,0,0,17,0,12,0,0,16,0,0,0,0,19,0,0,0,0,0,23],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,21,0,0,0,0,0,0,0,16,0,0,0,0,0,0,0,23],
    [2,0,12,0,0,19,0,19,0,19,17,0,0,24,0,24,0,24,12,0,0,19,0,19,0,19,19,0,0,26,0,26,0,26],
    [3],
    [4,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [5,0,0,0,0,0,0,0,0,0,0,0,32,0,0,0,0,0,0,0,32,0,0,0,32,0,0,0,32,0,32,0,32],
  ],
],
  [0,0,1,0,0,2,1,0], // Sequence.
  120 // BPM.
];

const endgameMusicModule = [
[
  [0.52,0.01,261.63,0.005,0.18,0.08,5,0.5,,,,,,,,,,0.9,0.02],
  [0.18,0.01,261.63,0.02,0.17,0.13,,1,,,,,,,,,,0.5,0.03],
  [0.63,0.01,130.815,,0.2,0.08,,1,,,,,,,,,,0.8,0.02],
  [0.78,,35,,0.01,0.09,4,1,-8,,,,,0.5,,,,0.05,0.04],
  [0.52,0.01,261.63,0.005,0.18,0.08,5,0.5,,,,,0.31,,,,,0.9,0.02,0.2],
  [0.18,0.01,261.63,0.02,0.17,0.13,,1,,,,,0.31,,,,,0.5,0.03,0.2],
  [0.63,0.01,130.815,,0.2,0.08,,1,-0.3,,,,,,,,,0.8,0.02],
  [0.86,,192.5,,0.01,0.09,,1,,,-25.1,0.02,,0.5,,,,0.05,0.04],
  [0.86,,192.5,,0.01,0.09,,1,,,-48.13,0.01,,0.5,,,,0.05,0.04],
  [0.47,,91,,,0.03,4,1,-8,,,,,0.75,,,,0.05,0.01],
], [
  [ // A (verse)
    [0,0,0,0,19,12,0,19,0,0,17,0,23,0,24,0,24,0,0,0,23,21,0,23,0,0,12,0,23,0,12,0,19],
    [1,0,0,16,19,16,12,16,19,16,0,21,24,21,17,0,0,21,19,23,0,23,19,0,26,23,12,16,19,16,0,16,19,16],
    [2,0,12,0,19,0,12,0,0,0,17,0,24,0,17,0,24,0,19,0,26,0,19,0,26,0,12,0,19,0,12,0,19],
    [3],
    [4,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,23],
    [5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,21],
    [6,0,0,0,0,0,0,0,19],
    [7,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [8,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [9,0,0,0,0,0,0,0,0,0,0,0,32,0,32,0,0,0,0,0,32,0,32,0,32,0,0,0,32,0,0,0,32],
  ],
  [ // B (contrast)
    [0,0,0,19,0,19,17,0,16,0,19,0,28,0,23,0,0,0,0,31,0,19,28,0,21,0,17,0,28,0,24],
    [1,0,0,12,16,0,0,19,16,16,0,19,0,23,0,26,23,23,0,0,24,0,0,28,0,24,17,17,0,21,0,24,21,21],
    [2,0,12,0,19,0,12,0,19,19,19,0,26,0,19,0,26,26,21,0,28,0,21,0,28,28,17,0,24,0,17,0,24],
    [3],
    [4,0,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,24],
    [5,0,12],
    [6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,24],
    [7,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [8,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [9,0,0,0,32,0,32,0,32,0,0,0,0,0,0,0,32,0,0,0,32,0,0,0,0,0,0,0,32],
  ],

], [0,1,0,1,0],
122
];

let sounds = [];

let currentMusic;

let musicToStop = [];
let renderingInstrument;

// ZzFX by Frank Force (modified).

let zzfxVolume = 1;

let zzfxAudioContext;

const zzfxSampleRate = 44100;

// Create the `AudioContext` object which enables audio output.
const createAudioContext = e => {
  zzfxAudioContext = new AudioContext();
  enableAudio(options.S);
};

// Play an array of samples.
const playSamples = (...samples) => {

  const audioBuffer = zzfxAudioContext.createBuffer(samples.length, samples[0].length, zzfxSampleRate);
  const audioBufferSourceNode = zzfxAudioContext.createBufferSource();
  const gainNode = zzfxAudioContext.createGain();

  samples.map((d, i) => audioBuffer.getChannelData(i).set(d));
  audioBufferSourceNode.buffer = audioBuffer;
  audioBufferSourceNode.connect(gainNode); // `AudioBufferSourceNode` is connected to a `GainNode`.
  gainNode.connect(zzfxAudioContext.destination); // `GainNode` is connected to the `AudioContext` for granular volume control.
  audioBufferSourceNode.start();

  return [audioBufferSourceNode, gainNode];
};

// Build an array of samples.
const newSound = (
  volume = 1, 
  randomness = 0,
  frequency = 220,
  attack = 0,
  sustain = 0,
  release = .1,
  shape = 0,
  shapeCurve = 1,
  slide = 0, 
  deltaSlide = 0, 
  pitchJump = 0, 
  pitchJumpTime = 0, 
  repeatTime = 0, 
  noise = 0,
  modulation = 0,
  bitCrush = 0,
  delay = 0,
  sustainVolume = 1,
  decay = 0,
  tremolo = 0,
  filter = 0
) => {
  // init parameters
  let sampleRate = zzfxSampleRate,
    PI2 = Math.PI*2, 
    abs = Math.abs, 
    sign = v => v<0?-1:1, 
    startSlide = slide *= 500 * PI2 / sampleRate / sampleRate,
    startFrequency = frequency *= 1 * PI2 / sampleRate,
    modOffset = 0, // modulation offset  
    repeat = 0,  // repeat offset
    crush = 0,   // bit crush offset
    jump = 1,    // pitch jump timer
    length,    // sample length
    _samples = [],    // sample buffer
    t = 0,     // sample time
    i = 0,     // sample index 
    s = 0,     // sample value
  f,       // wave frequency

  // biquad LP/HP filter
  quality = 2, w = PI2 * abs(filter) * 2 / sampleRate,
  cos = Math.cos(w), alpha = Math.sin(w) / 2 / quality,
  a0 = 1 + alpha, a1 = -2*cos / a0, a2 = (1 - alpha) / a0,
  b0 = (1 + sign(filter) * cos) / 2 / a0, 
  b1 = -(sign(filter) + cos) / a0, b2 = b0,
  x2 = 0, x1 = 0, y2 = 0, y1 = 0;

  // scale by sample rate
  const minAttack = 9; // prevent pop if attack is 0
  attack = attack * sampleRate || minAttack;
  decay *= sampleRate;
  sustain *= sampleRate;
  release *= sampleRate;
  delay *= sampleRate;
  deltaSlide *= 500 * PI2 / sampleRate**3;
  modulation *= PI2 / sampleRate;
  pitchJump *= PI2 / sampleRate;
  pitchJumpTime *= sampleRate;
  repeatTime = repeatTime * sampleRate | 0;
  volume *= zzfxVolume;

  // generate waveform
  for(length = attack + decay + sustain + release + delay | 0;
    i < length; _samples[i++] = s * volume) {
    if (!(++crush%(bitCrush*100|0))) {
      s = shape? shape>1? shape>2? shape>3? shape>4? // wave shape
        (t/PI2%1 < shapeCurve/2? 1 : -1) :     // 5 square duty
        Math.sin(t**3) :               // 4 noise
        Math.max(Math.min(Math.tan(t),1),-1):    // 3 tan
        1-(2*t/PI2%2+2)%2:             // 2 saw
        1-4*abs(Math.round(t/PI2)-t/PI2):      // 1 triangle
        Math.sin(t);                 // 0 sin

      s = (repeatTime ?
          1 - tremolo + tremolo*Math.sin(PI2*i/repeatTime) // tremolo
          : 1) *
        (shape>4?s:sign(s)*abs(s)**shapeCurve) * // shape curve
        (i < attack ? i/attack :         // attack
        i < attack + decay ?           // decay
        1-((i-attack)/decay)*(1-sustainVolume) : // decay falloff
        i < attack  + decay + sustain ?      // sustain
        sustainVolume :              // sustain volume
        i < length - delay ?           // release
        (length - i - delay)/release *       // release falloff
        sustainVolume :              // release volume
        0);                    // post release

      s = delay ? s/2 + (delay > i ? 0 :       // delay
        (i<length-delay? 1 : (length-i)/delay) * // release delay 
        _samples[i-delay|0]/2/volume) : s;        // sample delay

      if (filter)                  // apply filter
        s = y1 = b2*x2 + b1*(x2=x1) + b0*(x1=s) - a2*y2 - a1*(y2=y1);
    }

    f = (frequency += slide += deltaSlide) *// frequency
      Math.cos(modulation*modOffset++);   // modulation
    t += f + f*noise*Math.sin(i**5);    // noise

    if (jump && ++jump > pitchJumpTime) { 
      frequency += pitchJump;
      startFrequency += pitchJump;
      jump = 0;
    } 

    if (repeatTime && !(++repeat % repeatTime)) { 
      frequency = startFrequency;
      slide = startSlide;
      jump ||= 1;
    }
  }

  if (!renderingInstrument) { // Save it to the sounds array if it wasn't created as an instrument.
    sounds.push({
      _samples
    });
  }

  return _samples;
};

// ZzFX Music Renderer v2.0.3 by Keith Clark and Frank Force (modified).
const renderMusic = (
  instruments,
  patterns,
  sequence,
  BPM = 125
) => {
  renderingInstrument = 1;

  const beatLength = (zzfxSampleRate / BPM * 60) >> 2;

  let channelCount = 0;
  for (const pat of patterns) {
    if (pat.length > channelCount) channelCount = pat.length;
  }
  if (channelCount === 0 || sequence.length === 0) return [[], []];

  // Pattern length = MAX channel length, not channel-0 length. Authoring
  // tools that trim trailing zeros per channel for compact storage can
  // leave channel 0 shorter than its siblings; using channel 0's length
  // for the pattern boundary makes longer sibling channels overshoot,
  // which silently mixes adjacent patterns' edges together. With max-
  // channel-length, no channel can overshoot its allotted pattern span.

  const patternMaxLens = patterns.map((pat) => {
    let m = 0;
    for (const ch of pat) if (ch && ch.length > m) m = ch.length;
    return m;
  });

  let totalSteps = 0;
  for (const patternIndex of sequence) {
    totalSteps += (patternMaxLens[patternIndex] ?? 2) - 2;
  }
  const totalSamples = totalSteps * beatLength;
  if (totalSamples <= 0) return [[], []];

  const leftChannelBuffer = new Array(totalSamples).fill(0);
  const rightChannelBuffer = new Array(totalSamples).fill(0);
  const sampleCache = {};

  for (let channelIndex = 0; channelIndex < channelCount; channelIndex++) {
    let sampleBuffer = [];
    let sampleOffset = 0;
    let notFirstBeat = 0;
    let instrument = 0;
    let panning = 0;
    let attenuation = 0;
    let outSampleOffset = 0;

    sequence.forEach((patternIndex, sequenceIndex) => {
      const patternChannel = patterns[patternIndex]?.[channelIndex] || [0, 0, 0];

      const canonicalLen = patternMaxLens[patternIndex] ?? 2;
      const nextSampleOffset =
        outSampleOffset +
        (canonicalLen - 2 - (notFirstBeat ? 0 : 1)) * beatLength;

      const isSequenceEnd = sequenceIndex === sequence.length - 1;
      let k = outSampleOffset;

      // Inner loop iterates the PATTERN's canonical row count, not
      // the current channel's length. Trimmed-trailing-zeros channels
      // still get their rest rows walked, so any active note's
      // release tail keeps writing across rows it would have written
      // in the un-trimmed source. Matches DAW-side renderer behavior.
      for (
        let i = 2;
        i < canonicalLen + (isSequenceEnd ? 1 : 0);
        notFirstBeat = ++i
      ) {

        const note = patternChannel[i] ?? 0;

        const stop =
          (i === canonicalLen + (isSequenceEnd ? 1 : 0) - 1 && isSequenceEnd) ||
          instrument !== (patternChannel[0] || 0) ||
          note ||
          0;

        for (
          let j = 0;
          j < beatLength && notFirstBeat;
          j++ > beatLength - 99 && stop
            ? (attenuation += (attenuation < 1 ? 1 : 0) / 99)
            : 0
        ) {
          const sample = ((1 - attenuation) * (sampleBuffer[sampleOffset++] ?? 0)) / 2 || 0;
          leftChannelBuffer[k] = leftChannelBuffer[k] - sample * panning + sample;
          rightChannelBuffer[k] = rightChannelBuffer[k++] + sample * panning + sample;
        }

        if (note) {
          attenuation = note % 1;

          panning = patternChannel[1] ?? 0;

          const noteInt = note | 0;
          if (noteInt) {
            sampleOffset = 0;
            instrument = patternChannel[0] || 0;
            const cacheKey = `${instrument}|${noteInt}`;
            if (!sampleCache[cacheKey]) {
              const instrumentParameters = [...(instruments[instrument] ?? [])];
              if (instrumentParameters[2] !== undefined) {
                instrumentParameters[2] *= 2 ** ((noteInt - 12) / 12);
              }
              sampleCache[cacheKey] =
                noteInt > 0 ? newSound(...instrumentParameters) : [];
            }
            sampleBuffer = sampleCache[cacheKey];
          }
        }
      }

      outSampleOffset = nextSampleOffset;
    });
  }
  renderingInstrument = 0;

  return [leftChannelBuffer, rightChannelBuffer];
};

// Play the sound with the given id, at the given volume.
const playSound = (id, vol = 1) => {
  if (options.S) {

    const sound = sounds[id];
    const oldGainNode = sound._gainNode;

    const [buffer, gainNode] = playSamples(sound._samples);
    gainNode.gain.value = vol;

    sound._buffer = buffer;
    sound._gainNode = gainNode;

    if(oldGainNode) oldGainNode.gain.linearRampToValueAtTime(0, zzfxAudioContext.currentTime + .01);
  }
};

// Play the given music object.
const playMusic = musicObject => {
  currentMusic = musicObject;

  if (options.M) {

    let samples = musicObject._samples;
    // if (!samples) samples = renderMusic(...musicObject.module);

    const [buffer, gainNode] = playSamples(...samples);

    gainNode.gain.value = 0;
    gainNode.gain.linearRampToValueAtTime(.10, zzfxAudioContext.currentTime + 1); // Fade to full volume over 1 second.

    buffer.loop = musicObject._loop;

    musicObject._buffer = buffer;
    musicObject._gainNode = gainNode;
    musicObject._samples = samples;
  }
};

// Stop the given music object.
const stopMusic = musicObject => {
  if (musicObject && musicObject._gainNode) {
    musicObject._gainNode.gain.linearRampToValueAtTime(0, zzfxAudioContext.currentTime + 1); // Fade to silent over .01 seconds.
    musicObject._timer = 1; // The music will be stopped after 1 second.
    musicToStop.push(musicObject);
  }
};

// Enable the audio according to the given state.
const enableAudio = state => {
  if (zzfxAudioContext) (state || options.S) ? zzfxAudioContext.resume() : zzfxAudioContext.suspend();
};


// Initialize car audio for engine sounds.
const initCarAudio = car => {
  if (!zzfxAudioContext) return;

  const osc = zzfxAudioContext.createOscillator();
  const gain = zzfxAudioContext.createGain();
  const panner = zzfxAudioContext.createStereoPanner ? zzfxAudioContext.createStereoPanner() : null;

  osc.type = 'sawtooth';
  osc.frequency.value = 40; // Idle engine pitch (Hz).
  gain.gain.value = 0;       // Start muted.

  // Connect graph: Osc -> Panner -> Gain -> Destination.
  if (panner) {
    osc.connect(panner);
    panner.connect(gain);
  } else {
    osc.connect(gain); // Fallback if StereoPanner is unsupported.
  }
  gain.connect(zzfxAudioContext.destination);

  osc.start();

  car._audio = { osc, gain, panner };
};

// Play a sound effect according to the distance from the player car.
const playSpatialFX = (id, car) => {
  const dist = Math.hypot(car._x - playerCar._x, car._z - playerCar._z);
  if (dist < 500) playSound(id, 1 - dist / 500);
};

const menuMusicObject = {_module: menuMusicModule, _loop: 1};
const campaignMenuMusicObject = {_module: campaignMusicModule, _loop: 1};
const endgameModuleObject = {_module: endgameMusicModule, _loop: 0};

menuMusicObject._samples = renderMusic(...menuMusicObject._module);
campaignMenuMusicObject._samples = renderMusic(...campaignMenuMusicObject._module);
endgameModuleObject._samples = renderMusic(...endgameModuleObject._module);

//#endregion





//#region RNG
// Random number generator.
let randomState;

// Get a random float between 0.0 and 0.999...
let randomFloat = () => {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 4294967296;
};

// Get a random integer in given range (inclusive).
let randomInt = (min, max) => ~~(randomFloat() * (max - min + 1)) + min;
//#endregion





//#region OPTIONS
const NAMESPACE = 'com.antix.unicorn'; // Persistent data filename.

let options;

// Save options to local storage.
const saveoptions = () => localStorage.setItem(NAMESPACE, JSON.stringify(options));

// Reset options to default and save them to local storage.
const resetoptions = () => {
  options = {
		L: 'a', // Steer left.
		R: 'd', // Steer right.
		A: 'w', // Accelerate.
		B: 's', // Brake.
    N: 'PLAYER', 
		M: true, // Music.
		S: true, // Sound effects.
    T: [18e3, 18e3, 18e3, 18e3, 18e3, 18e3, 18e3, ], // Best lap times for the 7 rainbow cup tracks.
  };

  saveoptions(); // Save options to local storage.
};

(!(options = localStorage.getItem(NAMESPACE))) ? resetoptions() : options = JSON.parse(options); // Load options , creating new options if not found.
//#endregion

// Set 1080p dimensions for both canvases.
c.width = u.width = 1920;
c.height = u.height = 1080;

let lastTime = 0;
const targetFPS = 60;
const interval = 1e3 / targetFPS; // ~16.66ms.

// Game modes.
const MODE_MENUS      = 0;
const MODE_PLAYING    = 1;
const MODE_COUNTDOWN  = 3;
const MODE_POSTRACE   = 4;

let gameMode = MODE_MENUS;

let instantRacing;

let playersEnabled;

// Key Listener.
const keys = {};

// AI car names.
const carNames = [
  'STARLIGHT', 
  'MISTY', 
  'THUNDER', 
  'DANCER', 
  'MELODY', 
  'CRYSTAL', 
];

const allCarNames = [0, ...carNames];

let accentColors = [0, 0, 0, 0, 0, 0, 0]; // Car color indices.

let pointsMap = {};

// Color indices.
const COLOR_RED     = 0;
const COLOR_ORANGE  = 1;
const COLOR_YELLOW  = 2;
const COLOR_GREEN   = 3;
const COLOR_BLUE    = 4;
const COLOR_INDIGO  = 5;
const COLOR_VIOLET  = 6;
const COLOR_BLACK   = 7;
const COLOR_WHITE   = 8;
const COLOR_GOLD    = 9;
const COLOR_PURPLE  = 10;

// RGB colors.
const ROYGBIV = [
  // Rainbow colors.
  [0.98, 0.48, 0.50], // Red.
  [0.98, 0.68, 0.42], // Orange.
  [0.98, 0.92, 0.45], // Yellow.
  [0.48, 0.88, 0.55], // Green.
  [0.42, 0.75, 0.98], // Blue.
  [0.55, 0.52, 0.92], // Indigo.
  [0.85, 0.52, 0.88], // Violet.

  // Colors used by unicorn model.
  [0.00, 0.00, 0.00], // Black (eyes).
  [1.00, 1.00, 1.00], // White (body).
  [1.00, 0.88, 0.20], // Gold (Horn).
  [0.80, 0.00, 0.80], // Purple (hooves).
];

let currentSky;

// Note: If low on bytes, this can be trimmed as currently the horizon color is the same for all palettes.
// Each track has 6 floats: [horizon R,G,B, zenith R,G,B].
const skyGradients = [
  [0.82, 0.91, 0.98,  0.91, 0.28, 0.23], // Red.
  [0.82, 0.91, 0.98,  1.00, 0.63, 0.3], // Orange.
  [0.82, 0.91, 0.98,  0.88, 0.89, 0.34], // Yellow.
  [0.82, 0.91, 0.98,  0.42, 0.93, 0.42], // Green.
  [0.82, 0.91, 0.98,  0.35, 0.65, 0.98], // Blue (used for menus).
  [0.82, 0.91, 0.98,  0.38, 0.00, 0.70], // Indigo.
  [0.82, 0.91, 0.98,  0.72, 0.56, 0.96], // Violet.

  // [0.03, 0.03, 0.04,  0.30, 0.10, 0.40], // Deep purple/blue bad.
  // [0.02, 0.02, 0.06,  0.10, 0.30, 0.50], // Dark blue transition.
  // [1.00, 0.60, 0.20,  0.80, 0.20, 0.10], // Orange to red.
  // [1.00, 0.80, 0.40,  0.60, 0.20, 0.60], // Warm pink/purple.
  // [0.95, 0.50, 0.70,  0.20, 0.30, 0.60], // Pink to deep purple.
];

// Car stuff.
const CAR_LENGTH = 12;
const CAR_HEIGHT = 12;
const CAR_WIDTH = 12;
const CAR_RADIUS = 6.5; // A tad more than half.

const BOOST_FALLOFF = 0.060;

let playerCar;
let aiCars;
let allCars;

let particles;

let nextCheckpointIdx;
let totalCheckpoints;

let minX, maxX, minZ, maxZ; // Track bounds.

let bestLapTimeBeaten;

// Camera.
let camDist;
let cameraTarget;
let camEye = [0, 0, 0];
let camLook = [0, 0, 0];

let endgameCamera;
let endgameYaw = 0;

let menuCameraRot = 0;
let menuPitch = 0;

const floatHeight = 3.0; // How many units above the track surface the cars hover.

// Create a new car.
const newCar = (
  _name, 
  _uid, 
  _laneOffset, 
  _acceleration, // Performance.
  _braking, 
  _maxSpeed, 
  _turnSpeed, 
  _skill, 
  _x, // Position.
  _y, 
  _z, 
  _yaw = 0, // Orientation.

  // The rest do not need to be passed by the caller.
  _pitch = 0,  // Orientation.
  _roll = 0, 
  _speed = 0, 
  _baseOffset = _laneOffset, 
  _targetOffset = _laneOffset, 
  _racePosition = 0,  // 1st, 2nd, 3rd, etc.
  _lap = 1, 
  _audio = null, 
  _currentLapTime = 0, 
  _points = 0,
  _finished = false, 
  _steer = 0, 
  _lastYaw = 0,
  _nextCheckpointIdx = 1, 
  _lastIdx = 0, 
  _nextPad = 0, 
  _progress = 0, 
  // _fly = false, 
  _accentColor = 0, 
  _carVAO = null, 
  _place = '-', 

) => 
({
  _name, 
  _uid, 
  _accentColor, 
  _carVAO, 
  _laneOffset,
  _baseOffset, 
  _targetOffset, 
  _acceleration,
  _braking, 
  _maxSpeed, 
  _turnSpeed, 
  _x,
  _y, 
  _z, 
  _yaw, 
  _pitch, 
  _roll, 
  _speed, 
  _racePosition, 
  _lap, 
  _audio, 
  _currentLapTime, 
  _points, 
  _finished, 
  _skill, 
  _steer, 
  _lastYaw, 
  _nextCheckpointIdx, 
  _lastIdx, 
  _nextPad, 
  _progress, 
  // _fly, 
  _place, 
});

// Note: Particles are currently kind of dogshit.
const newParticle = (
  _x, 
  _y, 
  _z, 
  _vx, 
  _vy, 
  _vz, 
  _life, 
  _size, 
  _color, 

) => {
  particles.push({
    _x, 
    _y, 
    _z, 
    _vx, 
    _vy, 
    _vz, 
    _life, 
    _size, 
    _color, 
  });
};

// Track definitions.
const trackDefs = [

  { // 1.
    _seed: 3, 

    _trackName: 'PONY PRAIRIE', 
    _radius: 900, // +50.
    _numPoints: 16, // +2.
    _trackWidth: 190, // -10.
    _aiSkill: .6, // +.05.
    _aiSpeed: 7, // +.1.
    _gradient: 0, // +1.

    _hillAmp1: 0, 
    _hillAmp2: 0, 

    _numberOfLaps: 2, 
    _aiCarCount: 6, 
    _boosterCount: 3, 
    _checkPointCount: 5, 
  }, 

  { // 2.
    _seed: 508734282, 

    _trackName: 'ROLLING MEADOWS', 
    _radius: 950, 
    _numPoints: 18, 
    _trackWidth: 180, 
    _aiSkill: .65, 
    _aiSpeed: 7.1, 
    _gradient: 1, 

    _hillAmp1: 30, 
    _hillAmp2: 15, 

    _numberOfLaps: 2, 
    _aiCarCount: 6, 
    _boosterCount: 3, 
    _checkPointCount: 5, 
  }, 

  { // 3.
    _seed: 1443149963, 

    _trackName: 'RAINBOW TRIANGLE', 
    _radius: 1e3,
    _numPoints: 20,
    _trackWidth: 170,
    _aiSkill: .7, 
    _aiSpeed: 7.2, 
    _gradient: 2, 

    _hillAmp1: 25,
    _hillAmp2: 30,

    _numberOfLaps: 3, 
    _aiCarCount: 6, 
    _boosterCount: 3, 
    _checkPointCount: 5,
  }, 

  { // 4.
    _seed: 82049198, 

    _trackName: 'STARFIRE STRAITS', 
    _radius: 1050,
    _numPoints: 22,
    _trackWidth: 160,
    _aiSkill: .75, 
    _aiSpeed: 7.3, 
    _gradient: 3, 

    _hillAmp1: 35,
    _hillAmp2: 45,

    _numberOfLaps: 3, 
    _aiCarCount: 6, 
    _boosterCount: 3, 
    _checkPointCount: 5,
  }, 

  { // 5.
    _seed: -274107259,

    _trackName: 'STARDUST COASTER', 
    _radius: 1100, 
    _numPoints: 24, 
    _trackWidth: 150, 
    _aiSkill: .8, 
    _aiSpeed: 7.4, 
    _gradient: 4, 

    _hillAmp1: 80, 
    _hillAmp2: 90, 

    _numberOfLaps: 4, 
    _aiCarCount: 6, 
    _boosterCount: 3, 
    _checkPointCount: 5, 
  }, 

  { // 6.
    _seed: 227259495, 

    _trackName: 'MOONSHINE MILE', 
    _radius: 1150, 
    _numPoints: 26, 
    _trackWidth: 140, 
    _aiSkill: .85, 
    _aiSpeed: 7.5, 
    _gradient: 5, 

    _hillAmp1: 30, 
    _hillAmp2: 45, 

    _numberOfLaps: 5, 
    _aiCarCount: 6, 
    _boosterCount: 3, 
    _checkPointCount: 5, 
  }, 

  { // 7.
    _seed: 1350335388, 

    _trackName: 'PRISM PEAK', 
    _radius: 1200, 
    _numPoints: 28, 
    _trackWidth: 130, 
    _aiSkill: .9, 
    _aiSpeed: 7.6, 
    _gradient: 6, 

    _hillAmp1: 35, 
    _hillAmp2: 40, 

    _numberOfLaps: 6, 
    _aiCarCount: 6, 
    _boosterCount: 3, 
    _checkPointCount: 5, 
  }, 

  // { // 8.
  //   _trackName: INSTANT_MENU, 
  // }, 

];

const MAX_TRACKS = 7;

let currentTrackIdx;
let currentTrack;

let trackWidth; // Width of the current track.
let halfTrack;
let maxEdgeDistance;

let numberOfLaps;

let finshedCarCount;
let cupCompleted;
let raceFinished;


const renderMenuClouds = e => {

  // return;

  menuCameraRot += 0.0005;
  menuPitch += 0.003;
  
  const lookX = Math.sin(menuCameraRot);
  const lookZ = Math.cos(menuCameraRot);
  const lookY = 100 + (Math.sin(menuPitch) * 100);
  
  gl.useProgram(sceneProgram);
  gl.uniform3fv(uSceneSkyLoc, currentSky);
  gl.uniform3fv(uCamEye, [lookX, 100, lookZ]);
  gl.uniform3fv(uCamLook, [lookX * 1e3, lookY, lookZ * 1e3]);

  gl.uniform3f(uPos, 0, 0, 0);
  gl.uniform2f(uRot, 0, 0);
  gl.uniform2f(uLeanLoc, 0, 0);
  gl.bindVertexArray(cloudVAO.vao);
  gl.drawElements(TRIANGLES, cloudVAO.count, UNSIGNED_SHORT, 0);
};

let controlPoints;
let trackData;
let splinePoints;
let totalSplinePoints;
let cloudData;
let cliffData;
let checkpointData;
let boostData;

let trackVAO;
let cloudVAO;
let cliffVAO;
let checkpointVAO;
let boostVAO;

let currentTrackVAOs = []; // Keep track of previous track objects.

const carVAOs = [];

for (let i = 0; i < 7; i++) {
  carVAOs.push(createBufferObject(createCarMesh(i)));
}

const podiumVAO = createBufferObject(buildPodiumMesh(130));

const emptyVAO = gl.createVertexArray();

// Particle VAO Setup.
const pVAO = gl.createVertexArray();
const pVBO = gl.createBuffer();
const pEBO = gl.createBuffer();

gl.bindVertexArray(pVAO);
gl.bindBuffer(ARRAY_BUFFER, pVBO);
gl.bindBuffer(ELEMENT_ARRAY_BUFFER, pEBO);

gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
gl.enableVertexAttribArray(0);

gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
gl.enableVertexAttribArray(1);

//gl.bindVertexArray(null); // Unbind to leave WebGL in a clean state.

gl.enable(DEPTH_TEST);





// Generate a new race track.
const newTrack = (t, trackOnly = false) => {

  currentTrack = t;

  currentSky = skyGradients[t._gradient];

  camDist = 75;

  numberOfLaps = t._numberOfLaps;
  finshedCarCount = 0;
  raceFinished = false;

  trackWidth = t._trackWidth;
  halfTrack = trackWidth / 2;
  maxEdgeDistance = halfTrack + (CAR_WIDTH / 2);

  particles = [];
  aiCars = [];

  allCars = [];

  // Clean up GPU memory from the last level.
  currentTrackVAOs.forEach(obj => gl.deleteVertexArray(obj.vao));
  currentTrackVAOs = [];

  randomState = t._seed;
  
  //beginclip
  console.log(`newTrack() randomState:${randomState} t._seed${t._seed}`)
  //endclip

  // Generate the new track.
  generateTrack(t._radius, t._numPoints, t._hillAmp1, t._hillAmp2);

  buildTrackMesh();

  if (trackOnly) return;

  cloudData = buildOuterCloudsMesh();
  cliffData = buildInnerCliffMesh();
  checkpointData = buildCheckpointsMesh(t._checkPointCount);
  boostData = buildBoostPadsMesh(t._boosterCount);

  trackVAO = createBufferObject(trackData);
  cloudVAO = createBufferObject(cloudData);
  cliffVAO = createBufferObject(cliffData);
  checkpointVAO = createBufferObject(checkpointData);
  boostVAO = createBufferObject(boostData);

  currentTrackVAOs.push(trackVAO, cloudVAO, cliffVAO, checkpointVAO, boostVAO);

  const startPosition = splinePoints[0], initP1 = splinePoints[1];
  const startYaw = Math.atan2(initP1[0] - startPosition[0], initP1[2] - startPosition[2]);
  const startLanes = [0, -18, 18, -36, 36, -54, 54]; // Max 6 ai cars!

  let uid = 0;

  playerCar = newCar(
    options.N, // Name.
    uid++, // uid.
    1, // laneOffset.
    0.14, // acceleration.
    0.10, // braking.
    7.5, // maxSpeed.
    0.030, // turnSpeed.
    0, // skill.
    startPosition[0], // x.
    startPosition[1], // y.
    startPosition[2], // z.
    startYaw,
  );

  // Create AI cars.
  for (let i = 0; i < t._aiCarCount; i++) {
    const offset = (Math.random() - 0.5) * (trackWidth - 50);

    aiCars.push(newCar(
      carNames[i], 
      uid++, // uid.
      offset, // laneOffset.
      0.14, // acceleration.
      0.10, // braking.
      currentTrack._aiSpeed, // maxSpeed.
      0.030, // turnSpeed.
      t._aiSkill, // sko;;/
      startPosition[0] + startLanes[i + 1], // x.
      startPosition[1], // y.
      startPosition[2], // z.
      startYaw,
    ));
  }

  const initialIdx = findClosestTrackPoint(playerCar._x, playerCar._z)._index;
  playerCar._lap = initialIdx > totalSplinePoints / 2 ? 0 : 1;
  playerCar._lastIdx = initialIdx;

  // Set AI colors & handle Lap 0 starting positions.
  aiCars.forEach((ai, i) => {
    const initialIdx = findClosestTrackPoint(ai._x, ai._z)._index;
    // If AI starts behind the finish line (high spline index), start on Lap 0.
    ai._lap = initialIdx > totalSplinePoints / 2 ? 0 : 1;
    ai._lastIdx = initialIdx;
    ai._color = ROYGBIV[i % ROYGBIV.length]; // Assign ROYGBIV color.
  });

  // Get track bounds (used for drawing minimap).
  minX = minZ = Infinity;
  maxX = maxZ = -Infinity;
  splinePoints.forEach(([x, y, z]) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  });

  nextCheckpointIdx = 1;
  totalCheckpoints = checkpointData._checkpoints.length;

  cameraTarget = playerCar;

  allCars = [playerCar, ...aiCars];

  allCars.forEach(car => {
    car._points = pointsMap[car._name] || 0;
    car._accentColor = accentColors[car._uid];
    car._carVAO = carVAOs[accentColors[car._uid]];
  });
};

// Continuous Segment Projection.
const findClosestTrackPoint = (x, z) => {
  let minDistSq = Infinity;
  let bestPoint = [0, 0, 0];
  let bestIdx = 0;

  for (let i = 0; i < totalSplinePoints; i++) {
    const p1 = splinePoints[i];
    const p2 = splinePoints[(i + 1) % totalSplinePoints];

    const dx = p2[0] - p1[0];
    const dz = p2[2] - p1[2];
    const lenSq = dx * dx + dz * dz || 1;

    let t = ((x - p1[0]) * dx + (z - p1[2]) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = p1[0] + t * dx;
    const projZ = p1[2] + t * dz;
    const projY = p1[1] + t * (p2[1] - p1[1]);

    const distSq = (x - projX) ** 2 + (z - projZ) ** 2;

    if (distSq < minDistSq) {
      minDistSq = distSq;
      bestPoint = [projX, projY, projZ];
      bestIdx = i;
    }
  }

  return {
    _point: bestPoint,
    _index: bestIdx,
    _dist: Math.sqrt(minDistSq)
  };
};

// Resolve collision between the given cars.
const resolveCollision = (a, b) => {
  const dx = b._x - a._x;
  const dz = b._z - a._z;
  const dist = Math.hypot(dx, dz);
  const minDist = CAR_RADIUS * 2;

  if (dist < minDist && dist > 0.001) {
    if (a === playerCar || b === playerCar) playSound(FX_COLLIDE);

    const nx = dx / dist;
    const nz = dz / dist;

    // Calculate speeds & impulse.
    const speedA = a._speed;
    const speedB = b._speed;
    const totalSpeed = Math.max(speedA + speedB, 1.0);
    const bounciness = 0.6;
    const impulse = totalSpeed * (1 + bounciness) * 0.25;

    // Direct Positional Shove.
    const push = (minDist - dist) * 0.5 + impulse * 0.6;
    a._x -= nx * push;
    a._z -= nz * push;
    b._x += nx * push;
    b._z += nz * push;

    // Forward Speed Re-projection (nose to tail bumps).
    const v1x = Math.sin(a._yaw) * speedA;
    const v1z = Math.cos(a._yaw) * speedA;
    const v2x = Math.sin(b._yaw) * speedB;
    const v2z = Math.cos(b._yaw) * speedB;

    const newV1x = v1x - impulse * nx;
    const newV1z = v1z - impulse * nz;
    const newV2x = v2x + impulse * nx;
    const newV2z = v2z + impulse * nz;

    a._speed = newV1x * Math.sin(a._yaw) + newV1z * Math.cos(a._yaw);
    b._speed = newV2x * Math.sin(b._yaw) + newV2z * Math.cos(b._yaw);

    // Create a few random sparks.
    for (let i = 0; i < 2; i++) {
      newParticle(
        (a._x + b._x) * 0.5,
        (a._y + b._y) * 0.5 + 2,
        (a._z + b._z) * 0.5,
        (Math.random() - 0.5) * 4,
        Math.random() * 2,
        (Math.random() - 0.5) * 4,
        0.8 + Math.random() * 0.5,
        0.5 + Math.random() * 0.5,
        [1.0, 0.85, 0.2]
      );
    }
  }
};

// Upate the given car.
const updateCar = car => {

  // Process car passing through checkpoints.
  const targetGate = checkpointData._checkpoints[car._nextCheckpointIdx];
  const distToGate = Math.hypot(car._x - targetGate._position[0], car._z - targetGate._position[2]);

  if (distToGate < trackWidth / 1.1) { // Passed through checkpoint.
    playSpatialFX((targetGate._isStartFinish) ? FX_FINISHLINE : FX_CHECKPOINT, car);

    car._nextCheckpointIdx = (car._nextCheckpointIdx + 1) % totalCheckpoints;
  }

  // Calculate turn delta (steering).
  const dYaw = Math.atan2(
    Math.sin(car._yaw - (car._lastYaw ?? car._yaw)),
    Math.cos(car._yaw - (car._lastYaw ?? car._yaw))
  );

  car._lastYaw = car._yaw;
  car._steer = (car._steer || 0) + (Math.max(-1, Math.min(1, dYaw * 15)) - (car._steer || 0)) * 0.2;

  // Smooth forward lean based on speed ("leaning into the wind").
  const tp = Math.max(0, car._speed / (car._maxSpeed || 1));
  car._pitch = (car._pitch || 0) + (tp - (car._pitch || 0)) * 0.05;

  // If the car has finished, slow down to stop and turn to face the opposite way (kind of).
  if (car._finished) {
    car._speed *= 0.9; // Brake.

    // Face opposite to the track start direction.
    const p0 = splinePoints[0], p1 = splinePoints[1];
    const targetYaw = Math.atan2(p0[0] - p1[0], p0[2] - p1[2]);

    let diff = targetYaw - car._yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // Normalize to [-PI, PI].
    car._yaw += diff * 0.07;
  }    

  // Process car whether finished or not.
  car._x += Math.sin(car._yaw) * car._speed;
  car._z += Math.cos(car._yaw) * car._speed;

  const halfLen = CAR_LENGTH / 2;
  const speedLookAhead = Math.max(0, car._speed) * 1.2;
  const frontDist = halfLen + speedLookAhead;

  const frontX = car._x + Math.sin(car._yaw) * frontDist;
  const frontZ = car._z + Math.cos(car._yaw) * frontDist;
  const backX = car._x - Math.sin(car._yaw) * halfLen;
  const backZ = car._z - Math.cos(car._yaw) * halfLen;

  const frontTrackY = findClosestTrackPoint(frontX, frontZ)._point[1];
  const backTrackY = findClosestTrackPoint(backX, backZ)._point[1];
  const centerTrack = findClosestTrackPoint(car._x, car._z);
  const centerTrackY = centerTrack._point[1];

  const targetPitch = Math.atan2(frontTrackY - backTrackY, CAR_LENGTH + speedLookAhead);
  car._pitch += (targetPitch - car._pitch) * Math.min(1.0, 0.20 + Math.abs(car._speed) * 0.08);

  const reqCenter = centerTrackY;
  const reqFront = frontTrackY - frontDist * Math.sin(car._pitch);
  const reqRear = backTrackY + halfLen * Math.sin(car._pitch);

  const targetY = Math.max(reqCenter, reqFront, reqRear);

  // Note: This prolly needs to go since we will prolly just delete all cars at cup end.

  car._y += (targetY - car._y) * 0.35;
  if (car._y < targetY) car._y = targetY;

  // if (!car._fly) {
  //   car._y += (targetY - car._y) * 0.35;
  //   if (car._y < targetY) car._y = targetY;
  // }

  if (centerTrack._dist > halfTrack - CAR_RADIUS) {
    // Make sparks if the car is at all off the track.
    for (let i = 0; i < 4; i++) {
      newParticle(
        car._x + (Math.random() - 0.5) * CAR_WIDTH,
        car._y + 5.0 + Math.random(),
        car._z + (Math.random() - 0.5) * CAR_LENGTH,
        (Math.random() - 0.5) * 3,
        0,
        (Math.random() - 0.5) * 3,
        1,
        1.0,
        [1.0, 0.0, 0.0]
      );
    }

  } else if (car._speed > 0.5) {

    const yaw = car._yaw;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);

    const pSpeed = 1 + Math.random() * 2; // Particle ejection speed

    const wSpread = (Math.random() - 0.5) * CAR_WIDTH; // Random offset across the front bumper width.

    newParticle(
      // Spawn at rear bumper (-half length along facing vector + width spread).
      car._x + sin * (CAR_LENGTH * 0.5) + cos * wSpread, // _x.
      car._y + 2.0,                                      // _y (exhaust height).
      car._z + cos * (CAR_LENGTH * 0.25) - sin * wSpread, // _z.

      // Velocity: thrust backward relative to car angle.
      -sin * pSpeed,        // vx.
      Math.random() * 0.5,  // vy (slight upward float).
      -cos * pSpeed,        // vz.
      1,   // size.
      1.0, // life.
      [Math.random(), Math.random(), Math.random()] // color.
    );
  }

  // Handle offtrack situation.
  const isOffTrack = centerTrack._dist > maxEdgeDistance;

  if (isOffTrack) {
    // Cap maximum speed to 1.
    car._speed = Math.min(car._speed, 1);

    // Extract track position from point array [x, y, z].
    const trackX = centerTrack._point[0];
    const trackZ = centerTrack._point[2];

    const toTrackX = trackX - car._x;
    const toTrackZ = trackZ - car._z;

    // Hard boundary limit (maxEdgeDistance + 3).
    const maxOuterDist = maxEdgeDistance + 3;

    if (centerTrack._dist > maxOuterDist) {
      const pushFactor = (centerTrack._dist - maxOuterDist) / centerTrack._dist;
      
      // Clamp position back to outer boundary.
      car._x += toTrackX * pushFactor;
      car._z += toTrackZ * pushFactor;
      
      // Kill momentum if grinding the boundary.
      car._speed = Math.min(car._speed, 0.2);
    }

    // AI steering correction towards track ahead.
    // Note: could do with some tweaking.
    if (car !== playerCar) {
      // Look 2 points ahead on the spline to avoid aiming backward at inner corner apexes.
      const aheadIdx = (centerTrack._index + 2) % totalSplinePoints;
      const targetPoint = splinePoints[aheadIdx];

      const toTrackX = targetPoint[0] - car._x;
      const toTrackZ = targetPoint[2] - car._z;

      // Project target into car's local space.
      // Positive localX = Target is to the Right | Negative localX = Target is to the Left.
      const yaw = car._yaw;
      const localX = toTrackZ * Math.sin(yaw) - toTrackX * Math.cos(yaw);

      // Steer towards target: turn Right if positive, turn Left if negative.
      if (Math.abs(localX) > 1.0) {
        car._yaw -= Math.sign(localX) * 0.05;
      }
    }
  }

  // Overtaking.
  if (car !== playerCar) {
    let avoidSteer = 0;

    for (const other of allCars) {
      if (other === car) continue;

      const dx = other._x - car._x;
      const dz = other._z - car._z;

      const yaw = car._yaw;
      const sin = Math.sin(yaw);
      const cos = Math.cos(yaw);

      // Project relative position into car's local coordinates.
      const localZ = dx * sin + dz * cos;  // Forward distance.
      const localX = dz * sin - dx * cos;  // Sideways offset.

      // Check if 'other' is ahead (0 to 120 units), directly in path (< 15 units wide), and slower.
      if (localZ > 0 && localZ < 120 && Math.abs(localX) < 15 && car._speed > other._speed) {
        // Strength increases as the car gets closer (1.0 when touching, 0.0 at range 120).
        const urgency = 1 - (localZ / 120);

        // Dodge away: if obstacle is on the right (localX >= 0), steer left (+yaw).
        // If obstacle is on the left (localX < 0), steer right (-yaw).
        avoidSteer += (localX >= 0 ? 1 : -1) * urgency * 0.04;
      }
    }

    // Apply avoidance bias alongside track-following steering.
    car._yaw += avoidSteer;
  }

  return centerTrack;
};

// Update AI driven cars.
const updateAiCars = e => {
  if (playersEnabled) {

    aiCars.forEach(car => {
      if (!car._finished) {

        const nearest = findClosestTrackPoint(car._x, car._z);
        let targetingPad = false;

        // One-time decision zone per boost pad (~40 spline points ahead).
        for (const pad of boostData._boostPads) {
          const pointsAhead = (pad._idx - nearest._index + totalSplinePoints) % totalSplinePoints;

          if (pointsAhead > 5 && pointsAhead < 45) {
            targetingPad = true;
            // Lock decision so it only rolls ONCE per pad encounter
            if (car._nextPad !== pad) {
              car._nextPad = pad;
              car._targetOffset = (Math.random() < car._skill) ? -pad._padOffset : car._baseOffset;
            }
            break;
          }
        }

        // Return to base lane when out of pad targeting zone.
        if (!targetingPad) {
          car._targetOffset = car._baseOffset;
        }

        // Smoothly lerp lane offset toward target.
        car._laneOffset += (car._targetOffset - car._laneOffset) * 0.05;

        // Track spline lookahead & steering.
        const lookAheadIdx = (nearest._index + 12) % totalSplinePoints;
        const targetPt = splinePoints[lookAheadIdx];
        const nextPt = splinePoints[(lookAheadIdx + 1) % totalSplinePoints];
        const dx = nextPt[0] - targetPt[0], dz = nextPt[2] - targetPt[2];
        const len = Math.hypot(dx, dz) || 1;

        const targetX = targetPt[0] + (-dz / len) * car._laneOffset;
        const targetZ = targetPt[2] + (dx / len) * car._laneOffset;

        const desiredYaw = Math.atan2(targetX - car._x, targetZ - car._z);
        let diff = desiredYaw - car._yaw;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        car._yaw += diff * 0.08;

        // Update speed, accounting for boost.
        const rate = car._speed > car._maxSpeed ? BOOST_FALLOFF : 0.05; // 0.015 gives a long, smooth roll-off
        car._speed += (car._maxSpeed - car._speed) * rate;
      }

      updateCar(car);

    });
  }
};



// Main game loop.
const render = e => {

  // 
  // Render Sky (negates the requirement to clear the screen).
  // 

  gl.disable(DEPTH_TEST);
  gl.useProgram(skyProgram);
  gl.uniform3fv(uSkyLoc, currentSky);
  gl.bindVertexArray(emptyVAO);
  gl.drawArrays(TRIANGLES, 0, 3);
  gl.enable(DEPTH_TEST);

  if (gameMode < MODE_PLAYING) { // MODE_MENUS.
    renderMenuClouds();

  } else { // MODE_PLAYING.

    // Spawn an upwards moving particle near each boostPad.
    boostData._boostPads.forEach(pad => {
      newParticle(
        pad.x - 10 + Math.random() * 20, // _x
        pad.y -4, // _y
        pad.z - 5 + Math.random() * 10, // _z
        0, // vx
        1 + Math.random(), // vy
        0, // vz
        2, // size
        1.0, // life
        [Math.random(), Math.random(), Math.random()] // color
      );
    });

    // Boost cars.
    allCars.forEach(car => {

      if (car._speed < (car._maxSpeed + .01)) { // Can only boost if not boosting already (speed > max speed).

        for (const pad of boostData._boostPads) {

          if (Math.hypot(car._x - pad.x, car._z - pad.z) < pad._padRadius) {

            car._speed = Math.min(car._maxSpeed * 1.5, car._speed + 1.6);

            playSpatialFX(FX_BOOSTER, car);

            break;
          }
        }
      }
    });

    if (playersEnabled && !playerCar._finished) { // Process player movement if players are enabled.

      // Steering left/right.
      if (keys[options.L]) {
        playerCar._yaw += playerCar._turnSpeed; playerCar._roll += (0.25 - playerCar._roll) * 0.1;
      } else if (keys[options.R]) {
        playerCar._yaw -= playerCar._turnSpeed; playerCar._roll += (-0.25 - playerCar._roll) * 0.1;
      } else {
        playerCar._roll *= 0.9;
      }


      // Movement forwards/reverse.
      if (keys[options.A]) {
        // const topSpeed = playerCar._maxSpeed * (playerCar._boosting ? 1.5 : 1);
        // playerCar._speed = Math.min(topSpeed, playerCar._speed + playerCar._acceleration);

        const rate = playerCar._speed > playerCar._maxSpeed ? BOOST_FALLOFF : 0.05;
        playerCar._speed += (playerCar._maxSpeed - playerCar._speed) * rate;

      } else if (keys[options.B]) {
        playerCar._speed = Math.max(-2.5, playerCar._speed - playerCar._braking);
      } else {
        playerCar._speed *= 0.98;
      }

    }

    // const centerTrack = updateCar(playerCar);
    updateCar(playerCar);

    // 
    // Handle collisions between cars.
    // 

    // const allCars = [playerCar, ...aiCars];
    for (let i = 0; i < allCars.length; i++) {
      for (let j = i + 1; j < allCars.length; j++) {
        resolveCollision(allCars[i], allCars[j]);
      }
    }

    // 
    // Camera calculations for the currently targeted car.
    // 

    if (playerCar._finished) camDist = Math.min(camDist * 1.01, 300); // Pan out after race finish.
    const camBaseHeight = 28 + floatHeight;

    const theta = -cameraTarget._pitch;
    const relY = camBaseHeight * Math.cos(theta) - (-camDist) * Math.sin(theta);
    const relZ = camBaseHeight * Math.sin(theta) + (-camDist) * Math.cos(theta);

    const targetEye = [
      cameraTarget._x + Math.sin(cameraTarget._yaw) * relZ,
      cameraTarget._y + relY,
      cameraTarget._z + Math.cos(cameraTarget._yaw) * relZ
    ];

    const targetLook = [
      cameraTarget._x + Math.sin(cameraTarget._yaw) * 40,
      cameraTarget._y + floatHeight + 5,
      cameraTarget._z + Math.cos(cameraTarget._yaw) * 40
    ];

    camEye[0] += (targetEye[0] - camEye[0]) * 0.14;
    camEye[1] += (targetEye[1] - camEye[1]) * 0.14;
    camEye[2] += (targetEye[2] - camEye[2]) * 0.14;

    const camGround = findClosestTrackPoint(camEye[0], camEye[2]);

    if (camEye[1] < camGround._point[1] + 18.0) camEye[1] = camGround._point[1] + 18.0;

    camLook[0] += (targetLook[0] - camLook[0]) * 0.18;
    camLook[1] += (targetLook[1] - camLook[1]) * 0.18;
    camLook[2] += (targetLook[2] - camLook[2]) * 0.18;

    // 
    // Bind Scene Shader and Upload Camera State.
    // 

    gl.useProgram(sceneProgram);
    gl.uniform3fv(uSceneSkyLoc, currentSky);
    gl.uniform3fv(uCamEye, camEye);
    gl.uniform3fv(uCamLook, camLook);

    // 
    // Render static world objects:
    // - Track.
    // - Checkpoints.
    // - Boost pads.
    // - Cliffs.
    // - Clouds.
    // 
    gl.uniform2f(uLeanLoc, 0, 0);

    gl.uniform3f(uPos, 0, 0, 0);
    gl.uniform2f(uRot, 0, 0);
    currentTrackVAOs.forEach(obj => {
      gl.bindVertexArray(obj.vao);
      gl.drawElements(TRIANGLES, obj.count, UNSIGNED_SHORT, 0);
    });

    // 
    // Update Particles.
    // 

    const pVerts = [];
    let pIndices = [];

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p._x += p._vx;
      p._y += p._vy;
      p._z += p._vz;
      p._life -= 0.05;

      if (p._life <= 0) {
        particles.splice(i, 1);
      } else {
        const size = (3.5 * p._size) * p._life;
        const col = [p._color[0] * p._life, p._color[1] * p._life, p._color[2] * p._life];
        addQuad(pVerts, pIndices, p._x, p._y, p._z, size, col);
      }
    }

    // 
    // Render Particles.
    // 

    if (pIndices.length > 0) {
      gl.enable(BLEND);
      gl.blendFunc(SRC_ALPHA, ONE);
      gl.depthMask(false);

      gl.bindVertexArray(pVAO);
      gl.bindBuffer(ARRAY_BUFFER, pVBO);
      gl.bufferData(ARRAY_BUFFER, new Float32Array(pVerts), DYNAMIC_DRAW);
      gl.bindBuffer(ELEMENT_ARRAY_BUFFER, pEBO);
      gl.bufferData(ELEMENT_ARRAY_BUFFER, new Uint16Array(pIndices), DYNAMIC_DRAW);

      gl.drawElements(TRIANGLES, pIndices.length, UNSIGNED_SHORT, 0);

      gl.depthMask(true);
      gl.disable(BLEND);
    }

    updateAiCars();

    allCars.forEach(car => {

      if (playersEnabled && !car._finished) car._currentLapTime++; // Increment lap time.

      // Update race position.
      const currentIdx = findClosestTrackPoint(car._x, car._z)._index;

      if (car._lastIdx > totalSplinePoints - 20 && currentIdx < 20) {

        if (car._lap === numberOfLaps) {  // Car crossed finish line forward.
          car._finished = true;

          car._place = finshedCarCount + 1;

          car._points += [10, 7, 5, 4, 3, 2, 1][finshedCarCount++]; // Award points.

          if (finshedCarCount >= 7) { // All cars have passed the finish line.

            // 
            // The race has finished.
            // 

            raceFinished = true;
            playersEnabled = false;

            if (currentTrackIdx === MAX_TRACKS - 1) cupCompleted = true; // All races run.

            // Persist best lap time if required.
            if (bestLapTimeBeaten && !instantRacing) {
              bestLapTimeBeaten = false;
              saveoptions();
            }

            // Sort into highest point order.
            allCars.sort((a, b) => (b._points - a._points) || (a._currentLapTime - b._currentLapTime));

            cameraTarget = allCars[0]; // Target the winner.

            allCars.forEach(c => pointsMap[c._name] = c._points); // Cache points.

            currentTrackIdx++;

            // stopMusic(currentMusic);
            playMusic(campaignMenuMusicObject);

            openMenu(CAMPAIGN_MENU);

          }
          
        } else {

          car._lap++;
        }

          if (car === playerCar && car._currentLapTime < options.T[currentTrackIdx]) {

            playSound(FX_BESTLAPTIME);

            options.T[currentTrackIdx] = car._currentLapTime;
            bestLapTimeBeaten = true;
          }
          car._currentLapTime = 0;
      }

      if (car._lastIdx < 20 && currentIdx > totalSplinePoints - 20) car._lap--; // Cross finish line backward.
      car._lastIdx = currentIdx;
      car._progress = car._lap * totalSplinePoints + currentIdx;

      // Render.
      if (currentMenu != ENDGAME_MENU) {
        gl.uniform2f(uLeanLoc, car._steer || 0, car._pitch || 0);
        gl.uniform3f(uPos, car._x, car._y + floatHeight, car._z);
        gl.uniform2f(uRot, -car._pitch, car._yaw + car._roll);
        gl.bindVertexArray(car._carVAO.vao);

        gl.drawElements(TRIANGLES, car._carVAO.count, UNSIGNED_SHORT, 0);
      }
    });

    // 
    // Process engine noise.
    // 

    const maxAudibleDist = 450;
    const stopSpeedThreshold = 1.25; // Full volume above 1.0, fades out as speed drops below 1.0.

    if (options.S) {

      allCars.forEach(car => {
        if (!car._audio) initCarAudio(car);

        const { osc, gain, panner } = car._audio;

        const speed = Math.abs(car._speed);

        // Calculate a 0.0 -> 1.0 factor for cars rolling to a stop.
        // At speed >= 1.0, factor is 1.0. Below 1.0, it smoothly drops to 0.0.
        const stopFactor = Math.max(0, Math.min(1, speed / stopSpeedThreshold));

        osc.frequency.setValueAtTime(40 + speed * 12, zzfxAudioContext.currentTime); // Engine Pitch (Revving).

        let targetVolume = 0; // Determine target volume.

        if (car === playerCar) {

          targetVolume = 0.03 * stopFactor; // Overall loudness of player car engine.

        } else { // AI Cars: Distance & Panning.
          
          const dx = car._x - playerCar._x;
          const dz = car._z - playerCar._z;
          const dist = Math.hypot(dx, dz);

          if (dist <= maxAudibleDist) {
            const distFactor = 1 - dist / maxAudibleDist;
            targetVolume = distFactor * 0.1 * stopFactor;
            if (panner) {
              const yaw = playerCar._yaw;
              const localX = dz * Math.sin(yaw) - dx * Math.cos(yaw);
              const pan = Math.max(-1, Math.min(1, localX / 100.0));
              panner.pan.setValueAtTime(pan, zzfxAudioContext.currentTime);
            }
          }
        }

        if (finshedCarCount > 2) targetVolume = 0;

        gain.gain.setTargetAtTime(targetVolume, zzfxAudioContext.currentTime, 0.05);
      });
    }

  }

  // 
  // Render UI.
  // 
  ctx.clearRect(0, 0, 1920, 1080);

  if (raceFinished)  {
    ctx.fillStyle = '#0008';
    ctx.fillRect(0, 0, 1920, 1080);
  }

  // Rebind overlay prompt.
  if (bindingTarget) {
    ctx.fillStyle = '#000a';
    ctx.fillRect(0, 0, 1920, 1080);
    drawText('!PRESS NEW KEY', 960, 540, 80, 'center');

  } else {

    // 
    // Animate menus (transition between menus.)
    // 

    if (menuAnimating) {

      if (menuAnimDirection) { // Leaving screen (scrolling down).

        menuY += menuAnimIncrement;
        menuAnimIncrement *= 1.5; // Exponential acceleration.

        if (menuY > 1e5) { // Off screen.
          currentMenu = nextMenu;
          menuAnimTimer = 0;
          menuAnimDirection = 0;
        }

      } else { // Entering screen (bouncing up).

        menuAnimTimer += 1 / 40; // Duration.

        if (menuAnimTimer >= 1) { // Completed.
          menuAnimating = false;
          menuAnimTimer = 1;
          mouseEnabled = true; // User can interact with UI.
        }
        
        const eased = Math.pow(2, -10 * menuAnimTimer) * Math.sin((menuAnimTimer - 0.075) * 15.7) + 1;
        menuY = 1200 + (0 - 1200) * eased;
      }
    }

    // Note: This following spaghetti could possibly be optimized.

    // UI Navigation Router.
    if (currentMenu === MAIN_MENU) {
      renderMenu(mainMenu);

    } else if (currentMenu === INSTANT_MENU) {
      renderMenu(instantMenu());

      drawUIMinimap(1200, 400, 400, 400);

    } else if (currentMenu === OPTIONS_MENU) {
      renderMenu(optionsMenu());

    } else if (currentMenu === CAMPAIGN_MENU) {
      renderMenu(campaignMenu());

    } else if (currentMenu === ENDGAME_MENU) {
      renderPodiumScene();

      renderMenu(endgameMenu());

      renderSineScroller(960, 570, 80, 99, 0.1);


    } else if (currentMenu === PREGAME_MENU) {

      renderMenu(pregameMenu);

    } else if (currentMenu === HUD_MENU) {

      renderHUD();
    }
  }

  // Reset frame click flag.
  mouseClicked = false;

  // 
  // Finally stop any music that needs to be stopped.
  // 

  for (let i = musicToStop.length; i--;) {
    const musicObject = musicToStop[i];
    if ((musicObject._timer --) < 0) {
      musicObject._buffer.stop();
      musicToStop.pop();
    }
  }

  requestAnimationFrame(render);
};

onload = e => {

  z.oninput = e => {if (onlyNumbers) z.value = z.value.replace(/\D/g, '')}; // Keep only numeric input if required.

  // Key down handler for the text input.
  z.onkeydown = e => {
    if (e.key === 'Enter') {

      z.style.display = 'none'; // Hide it.

      if (onlyNumbers) { // Editing random seed for instant race generator.

        let instantSeed = parseInt(z.value);
        instantSeed = (isNaN(instantSeed) ? (Math.random() * 1e8) | 0 : instantSeed);

        instantTrackDef._seed = instantSeed;

        generateInstantTrack(false, true);

      } else { // Editing player name.

        options.N = z.value;
      }

      uiBlocked = false;
    }
  };

  initSineScroller('THANKS FOR PLAYING RAINBOW RACERS, I HOPE YOU LIKED IT. DESIGN & MODELLING BY ANTIX. CODING BY ANTIX, GEMINI AND DEEPSEEK. MUSIC MADE WITH ZZFXM STUDIO BY JUSTIN WALSH. GREETINGS TO ALL JS13K PARTICIPANTS. HUGE THANKS TO END3R FOR RUNNING JS13K EVERY YEAR. SEE YOU NEXT TIME.');

  newTrack(trackDefs[0]); // just to get the clouds for free :D

  currentSky = skyGradients[4];
  
  openMenu(PREGAME_MENU);

  render();

}

const FX_CLICK        = 0;
const FX_CHECKPOINT   = 1;
const FX_BOOSTER      = 2;
const FX_COLLIDE      = 3;
const FX_CHANGE_MENU  = 4;
const FX_321          = 5;
const FX_GO           = 6;
const FX_FINISHLINE   = 7;
const FX_BESTLAPTIME  = 8;
const FX_FIREWORKS    = 9;
const FX_INSTANT      = 10;

createAudioContext();
// 0. FX_CLICK
// newSound(...[,0,829,,.02,.02,2,3.9,,-97,418,.02,.02,,,,,.93,.01]); // Blip 173
newSound(...[0.5,0,443,.01,.01,.14,,3.9,,,473,.07,,,23,,.06,.67,.04]); // Pickup 1803

// 1. FX_CHECKPOINT
newSound(...[1.8,0,437,.01,.04,.08,1,1.1,,,490,.07,,,,,.06,.71,.02]); // Pickup 1666
// newSound(...[1.8,0,365,.01,.18,.24,,1.3,,,-72,.08,,,,,.16,.57,.21]); // (Powerup 113)

// 2. FX_BOOSTER
newSound(...[1.2,0,503,.02,.09,.17,,2.5,,47,212,.06,.02,.1,,,.08,.73,.01,,-811]); // Pickup 1442

// 3. FX_COLLIDE
newSound(...[.2,0,241,.01,.08,.08,1,.4,4,,417,.09,,.4,31,,,.68,.05]); // Pickup 1678

// 4. FX_CHANGE_MENU
newSound(...[.1,0,77,.02,.03,.01,2,3.3,-65,11,-354,.04,,,,,,.92,.02,,100]); // Blip 2057
// newSound(...[.1,0,599,.04,.22,.006,5,1.0,,,-6,.02,,,6.2,.1,,.8,.01]); // Random 1894
// // newSound(...[.2,0,425,.01,.03,.04,2,1.6,4,,,,,,53,,.06,.92,.01,,-1472]); // Blip 1747
// newSound(...[1.5,0,259,.02,.1,.11,1,3,,,-9,.18,,,24,,.34,.88,,.01,103]); // Random 1849

// 5. FX_321
newSound(...[.5,,130,.03,.06,.11,1,.1,,,,,,,,,.19,.75,.2]); // Music 1839 (C1)

// 6. FX_GO
newSound(...[.5,,523,.03,.06,.11,1,.1,,,,,,,,,.19,.75,.2]); // Music 1839 (C3)

// 7. FX_FINISHLINE
newSound(...[1.5,0,451,.09,.26,.39,,2.1,,,-76,.18,,.1,,,.09,.71,.18]); // Powerup 1997

// 8. FX_BESTLAPTIME
newSound(...[2,0,36,,.43,.46,,1.3,69,,,,,,,.1,.32,.62,.01,.01]); // Random 2128
// newSound(...[.4,0,168,.02,.01,.06,5,.49,18,10,,,,,1.2,,,.64,.08,,444]); // Shoot 1546

// 9. FX_FIREWORKS.
newSound(...[.15,0,10,,.03,.02,4,2,-4,82,13,,.05,,.9,,,.52,.15,.36,185]); // Random 2220

// 10. FX_INSTANT.
newSound(...[.7,0,352,.1,.28,.39,1,1.4,-3,-295,495,.09,.03,,,,,.78,.3,.46,434]); // Powerup 75

//#region UI
let globalAlpha = 15; // 0 to 15.
let currentMenu = ''; // MAIN_MENU, OPTIONS_MENU, HUD_MENU, etc.
let hoveredControl = null;
let bindingTarget = null; // Key currently being rebound.

let menuAnimating;
let menuAnimIncrement;
let menuAnimTimer;
let menuAnimDirection;
let nextMenu;
let menuY = 0;

let countingDown;
let countdownTimer;
let countdownFunction;
let countdownText;
let countdownTextY;
let countdownTextSize;
let countDownTextColor;

const countdown = (time, text, y, size, color, fn) => {
  countdownTimer = time;
  countdownText = text;
  countdownTextY = y;
  countdownTextSize = size;
  countDownTextColor = color;
  countdownFunction = fn;
  countingDown = true;
};

// Open the given menu.
const openMenu = menu => {
  playSound(FX_CHANGE_MENU);
  nextMenu = menu;
  mouseEnabled = false;
  menuAnimIncrement = 1;
  menuAnimating = true;
  menuAnimDirection = 1;
};

const ctx = u.getContext`2d`;

// ROYGBIV Hex Colors mapped to !@#$%^&
// ROYGBIV Fills and matching Dark Shades for Outlines
const TAGS         = '!@#$%^&';
const PALETTE      = ['#f77', '#fa6', '#fe7', '#7e8', '#6cf', '#88e', '#d8e'];
const DARK_PALETTE = ['#b44', '#b74', '#bb4', '#3b5', '#29c', '#45b', '#95b'];

// Mouse Tracking.
let mouseX = mouseY = 0;
let mouseClicked;
let mouseEnabled = 1;

// Mouse move handler for UI canvas.
u.onmousemove = e => {
  const r = u.getBoundingClientRect();
  mouseX = (e.clientX - r.left) * (1920 / r.width);
  mouseY = (e.clientY - r.top) * (1080 / r.height);
};

// Mouse up handler for UI canvas.
u.onmouseup = e => u.onmouseup = e => mouseClicked = true & mouseEnabled;

const defaultKeyDown = onkeydown; // Cache current keyboard handler.


// UI keyboard handler.
onkeydown = e => {
  if (bindingTarget) {
    options[bindingTarget] = e.key.toLowerCase();
    bindingTarget = null;
    return;
  }
  if (defaultKeyDown) defaultKeyDown(e);
};

// Parse and render formatted text with inline color codes (!@#$%^&) corresponding to the colors of the rainbow (ROYGBIV).
const drawText = (str, x, y, size, align, isHovered = false) => {

  // y += menuY;

  ctx.save();
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  ctx.lineJoin = ctx.lineCap = 'round';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const spacing = size * 0.20; // Spacing scales proportionally with font size.

  // Parse string into individual characters with color, width, and rotation.
  let curFill = '#fff', curDark = '#777', totalW = 0;
  const chars = [];

  for (let i = 0; i < str.length; i++) {
    
    const ch = str[i], tagIdx = TAGS.indexOf(ch);
    
    if (tagIdx !== -1) {

      curFill = PALETTE[tagIdx];
      curDark = DARK_PALETTE[tagIdx];

    } else {

      const w = ctx.measureText(ch).width;
      chars.push([
        ch,
        curFill,
        curDark,
        w,
        Math.sin(chars.length * 2.2) * 0.12 // Slight deterministic tilt (approx +/- 7 degrees).
      ]);

      totalW += w + spacing;
    }
  }
  if (chars.length) totalW -= spacing; // Remove trailing spacing.

  ctx.lineWidth = size * (isHovered ? 0.35 : 0.25);
  let curX = align === 'left' ? x : (align === 'right' ? x - totalW : x - totalW / 2);

  // Finally render the string.
  // for (const [c, f, d, w, rot] of chars) {
  //   const charCenterX = curX + w / 2;
  //   ctx.save();
  //   ctx.translate(charCenterX, y); // Tilt.
  //   ctx.rotate(rot);
  //   ctx.strokeStyle = d + Math.min(15, Math.max(0, globalAlpha)).toString(16);; // Outline.
  //   ctx.strokeText(c, 0, 0);
  //   ctx.fillStyle = f + Math.min(15, Math.max(0, globalAlpha)).toString(16);; // Fill.
  //   ctx.fillText(c, 0, 0);
  //   ctx.restore();
  //   curX += w + spacing;
  // }

  for (const [c, f, d, w, rot] of chars) {
    const charCenterX = curX + w / 2;
    ctx.save();
    ctx.translate(charCenterX, y); // Tilt.
    ctx.rotate(rot);
    ctx.strokeStyle = d;// + Math.min(15, Math.max(0, globalAlpha)).toString(16); // Outline.
    ctx.strokeText(c, 0, 0);

    // 3D Glossy Radial Gradient (Light source from top-left).
    const lx = -w * 0.15, ly = -size * 0.2;
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, size * 0.35);
    g.addColorStop(0, '#eee');
    g.addColorStop(1, f);// + Math.min(15, Math.max(0, globalAlpha)).toString(16));

    ctx.fillStyle = g; // Gradient Fill.
    ctx.fillText(c, 0, 0);
    ctx.restore();
    curX += w + spacing;
  }

  ctx.restore();
};

// Draw menu, perform hit tests, and execute onclick code.
const renderMenu = controls => {

  allCars.sort((a, b) => b._points - a._points);

  let nextHovered = null;

  for (const [x, y, text, size, onclick] of controls) {

    const isInteractive = typeof onclick === 'function';
    
    // Measure clean text bounds at baseline size for hit-testing
    let clean = '';
    for (let c of text) if (!TAGS.includes(c)) clean += c;
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    
    // Account for our proportional letter spacing (size * 0.15) in hit bounds
    const tw = ctx.measureText(clean).width + (clean.length * size * 0.15);
    const th = size;

    let isHovered;
    
    if (!uiBlocked) {

      // Check mouse hit box
      isHovered = isInteractive && 
        mouseX >= x - tw / 2 - 15 && mouseX <= x + tw / 2 + 15 &&
        mouseY >= y - th / 2 - 10 && mouseY <= y + th / 2 + 10;


      if (isHovered) {
        nextHovered = onclick;
        if (mouseClicked) {
          // playSound(FX_CLICK);

          onclick();
          mouseClicked = false;
        }
      }
    }

    // Scale up size when hovered (e.g., 1.35x to 1.5x)
    const drawSize = isHovered ? size * 1.2 : size;

    // Draw text with calculated size and hover flag
    drawText(text, x, y + menuY, drawSize, onclick, isHovered);
  }

  hoveredControl = nextHovered;
};

// Render the mini map.
const drawUIMinimap = (x, y, w, h) => {

  ctx.save();
  ctx.translate(x, y);

  const mWidth = w;
  const mHeight = h;
  const sX = mWidth / (maxX - minX || 1);
  const sZ = mHeight / (maxZ - minZ || 1);

  const toMap = (wx, wz) => [
    (wx - minX) * sX,
    (wz - minZ) * sZ
  ];

  // Track Path.
  ctx.beginPath();
  ctx.strokeStyle = `#ffe6`;
  ctx.lineWidth = 30;
  for (let i = 0; i < splinePoints.length; i+=12) {
    const [px, py, pz] = splinePoints[i];
    const [mx, my] = toMap(px, pz);
    i === 0 ? ctx.moveTo(mx, my) : ctx.lineTo(mx, my);
  }
  ctx.closePath();
  ctx.stroke();

  // Start / Finish Line
  const p0 = splinePoints[0], p1 = splinePoints[2];
  const dx = p1[0] - p0[0], dz = p1[2] - p0[2];
  const len = Math.hypot(dx, dz) || 1;
  const nx = (-dz / len) * trackWidth * 0.5, nz = (dx / len) * trackWidth * 0.5;
  const [fx1, fy1] = toMap(p0[0] - nx, p0[2] - nz);
  const [fx2, fy2] = toMap(p0[0] + nx, p0[2] + nz);

  ctx.beginPath();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 8;
  ctx.moveTo(fx1, fy1);
  ctx.lineTo(fx2, fy2);
  ctx.stroke();

  if (currentMenu !== INSTANT_MENU) {
    // Cars.
    allCars.forEach(car => {
      const [mx, my] = toMap(car._x, car._z);
      ctx.fillStyle = `${PALETTE[car._accentColor]}c`;
      ctx.beginPath();
      ctx.arc(mx, my, 12, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.restore();
};

const formatLapTime = frames => {
  const totalSec = (frames / 60) | 0;
  const mins = (totalSec / 60) | 0;
  const secs = totalSec % 60;
  const tenths = ((frames % 60) / 6) | 0; // Splice 60 frames into 10ths.
  return `${mins}:${secs < 10 ? '0' : ''}${secs}.${tenths}`;
};

const spawnFirework = (cx, cy, cz) => {
  // 40-50 particles usually looks like a solid burst
  for (let i = 0; i < 40; i++) {
    const yaw = Math.random() * Math.PI * 2;
    const pitch = (Math.random() - 0.5) * Math.PI; 
    
    // Adjust this multiplier based on your world scale
    const speed = 0.5 + Math.random() * 2.5; 

    const vx = Math.cos(yaw) * Math.cos(pitch) * speed;
    const vy = Math.sin(pitch) * speed;
    const vz = Math.sin(yaw) * Math.cos(pitch) * speed;

    // Passing: x, y, z, vx, vy, vz, life, size, color array
    // Note: life is set to 2.0 since your loop subtracts 0.05 per frame (lasts ~40 frames)
    newParticle(cx, cy, cz, vx, vy, vz, 2.0, 1.5, [Math.random(), Math.random(), Math.random()]);
  }
};

const triggerTargetFirework = (target, forwardDist, leftDist, upDist) => {
  // const forwardDist = 200;
  // const leftDist = -500;
  // const upDist = 400;

  // Calculate position relative to target's yaw
  const spawnX = target._x + (Math.sin(target._yaw) * forwardDist) - (Math.cos(target._yaw) * leftDist);
  const spawnY = target._y + upDist;
  const spawnZ = target._z + (Math.cos(target._yaw) * forwardDist) + (Math.sin(target._yaw) * leftDist);

  // Pick a color for this specific burst
  // const color = [Math.random(), Math.random(), Math.random()]; // Gold
  // const color = [1.0, 0.8, 0.0]; // Gold

  spawnFirework(spawnX, spawnY, spawnZ);
};

let fireWorkTimer = 0;

// Sine scroller - ultra lightweight with immediate visibility
let scrollerText = '';

let scrollerOffset = -960 + 50;

let scrollerSpeed = 2.5;
let scrollerCharWidths = [];
let scrollerTotalWidth = 0;

// Initialize the scroller
// Initialize the scroller - start with text already visible!
const initSineScroller = (text) => {
  scrollerText = text;
  
  // Start with the first character at the RIGHT edge of the screen
  // This makes it appear immediately
  scrollerOffset = 960 + 50; // Negative offset moves text left
  // OR even better, start with some text already visible:
  // scrollerOffset = -200; // First character is already on screen
  
  ctx.save();
  ctx.font = `900 ${60}px system-ui, sans-serif`;
  scrollerCharWidths = [];
  scrollerTotalWidth = 0;
  const spacing = 60 * 0.15;
  
  for (let i = 0; i < text.length; i++) {
    const w = ctx.measureText(text[i]).width + spacing;
    scrollerCharWidths.push(w);
    scrollerTotalWidth += w;
  }
  scrollerTotalWidth -= spacing;
  ctx.restore();
};

// Render the sine scroller - minimal and fast
const renderSineScroller = (x, y, size, amplitude = 30, frequency = 0.08) => {
  if (!scrollerText || scrollerCharWidths.length === 0) return;
  
  ctx.save();
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
    ctx.lineJoin = ctx.lineCap = 'round';

  
  const scaleFactor = size / 60;
  const screenLeft = -size;
  const screenRight = 1920 + size;
  
  // Find first visible character
  let charX = x + scrollerOffset;
  let startIndex = 0;
  
  for (let i = 0; i < scrollerCharWidths.length; i++) {
    const w = scrollerCharWidths[i] * scaleFactor;
    const charCenterX = charX + w / 2;
    if (charCenterX > screenLeft) {
      startIndex = i;
      break;
    }
    charX += w;
  }
  
  // Skip if no characters visible
  if (startIndex >= scrollerCharWidths.length) {
    ctx.restore();
    scrollerOffset -= scrollerSpeed * 0.02;
    if (scrollerOffset < -scrollerTotalWidth * scaleFactor - 100) {
      // Reset with first character just entering the screen
      scrollerOffset = 1920 - 50;
    }
    return;
  }
  
  // Render visible characters
  charX = x + scrollerOffset;
  for (let i = 0; i < startIndex; i++) {
    charX += scrollerCharWidths[i] * scaleFactor;
  }
  
  for (let i = startIndex; i < scrollerCharWidths.length; i++) {
    const w = scrollerCharWidths[i] * scaleFactor;
    const charCenterX = charX + w / 2;
    
    if (charCenterX > screenRight) break;
    
    // Simple sine wave displacement
    const phase = (i * frequency) + scrollerOffset * 0.05;
    const vOffset = Math.sin(phase) * amplitude;
    
    // White text with gray outline
    ctx.save();
    ctx.translate(charCenterX, y + vOffset);
    
    // Outline
    ctx.strokeStyle = '#999';
    ctx.lineWidth = size * 0.2;
    ctx.strokeText(scrollerText[i], 0, 0);
    
    // Fill
    ctx.fillStyle = '#fff';
    ctx.fillText(scrollerText[i], 0, 0);
    
    ctx.restore();
    
    charX += w;
  }
  
  ctx.restore();
  
  // Advance scroll
  scrollerOffset -= scrollerSpeed;
  // if (scrollerOffset < -scrollerTotalWidth * scaleFactor - 100) {
  //   // Reset with first character just entering the screen
  //   scrollerOffset = 1920 - 50;
  // }

  // Calculate where the LAST character is
const totalWidth = scrollerTotalWidth * scaleFactor;
const lastCharRightEdge = x + scrollerOffset + totalWidth;

// Reset when the LAST character has fully scrolled off the left edge
if (lastCharRightEdge < -size) {
  scrollerOffset = 960 + 50; // Reset to right edge
}


};



const renderPodiumScene = e => {
  fireWorkTimer --;
  if (fireWorkTimer < 0) {

    const rInt = (min, max) => ~~((Math.random() * max) - min);

    fireWorkTimer = 15 + rInt(0, 20);

    triggerTargetFirework(cameraTarget, 10 + rInt(0, 20), -220 + rInt(0, 440), 50 + rInt(0, 100));

    playSound(FX_FIREWORKS, Math.random() * .5);

    // triggerTargetFirework(cameraTarget, 99,  300, 200);
    // triggerTargetFirework(cameraTarget, 99, -300, 200);

    // triggerTargetFirework(cameraTarget, 99,  300, 50);
    // triggerTargetFirework(cameraTarget, 99, -300, 50);

  }
  endgameYaw += .004;

  const pos = splinePoints[splinePoints.length - 4]; // Where the podium will be drawn.
  const  initP1 = splinePoints[splinePoints.length - 1]; // point used to align the podium to be drawn across the track.
  const startYaw = Math.atan2(initP1[0] - pos[0], initP1[2] - pos[2]);
  const lanes = [0, -24, 24];
  const heights = [28, 18, 18];

  gl.uniform3f(uPos, pos[0], pos[1] + 15, pos[2]);
  gl.uniform2f(uRot, 0, startYaw);
  gl.bindVertexArray(podiumVAO.vao);
  gl.drawElements(TRIANGLES, podiumVAO.count, UNSIGNED_SHORT, 0);

  // Draw the top 3 placed cars.
  for (let j = 3; j--;) {
    const car = allCars[j];
    gl.uniform3f(uPos, pos[0] + lanes[j], pos[1] + heights[j], pos[2]);
    gl.uniform2f(uRot, 0, endgameYaw * (3 - j));
    gl.bindVertexArray(car._carVAO.vao);
    gl.drawElements(TRIANGLES, car._carVAO.count, UNSIGNED_SHORT, 0);
  }

  // 
  // TODO: Particles!!!!!!!!
  // 

};

// Draw HUD.
const renderHUD = e => {

  const idx = Math.min(currentTrackIdx, MAX_TRACKS - 1);

  allCars.sort((a, b) => (b._progress || 0) - (a._progress || 0));

  for (let i = 0; i < allCars.length; i++) {
    allCars[i]._racePosition = i + 1;
  }

  const lapsLeft = (raceFinished) ? '@-/-': `@${cameraTarget._lap}/${numberOfLaps}`;
  const position = (raceFinished) ? '#-/-': `#${cameraTarget._racePosition}/${allCars.length}`;
  const lapTime = (raceFinished) ? '0:00,0': `${formatLapTime(cameraTarget._currentLapTime)}`;

  // Top-Left: Lap.
  drawText('!LAP', 190, 50, 50,);
  drawText(lapsLeft, 190, 170, 130,);

  // Top-Right: Position.
  drawText('!POSITION', 1700, 50, 50,);
  drawText(position, 1700, 170, 130,);

  // Bottom-Right: Current lap time.
  drawText('!LAP', 165, 690, 50,);
  drawText(lapTime, 75, 760, 50, 'left');

  // Bottom-Right: Best lap time.
  drawText(' !BEST', 165, 880, 50,);

  // console.log(`currentTrackIdx:${currentTrackIdx}`);
  drawText(`$${formatLapTime(options.T[idx])}`, 75, 950, 50, 'left');

  if (countingDown) {

    drawText(`${'!@#$%^&'[countDownTextColor]}${countdownText}`, 960, countdownTextY, countdownTextSize,);

    countdownTimer--;
    if (countdownTimer <= 0) {
      countdownFunction();
    }
  }

  const name = (!instantRacing) ? trackDefs[idx]._trackName : instantTrackDef._trackName;

  drawText(`%${name}`, 1625, 1030, 40,);

  // Bottom-Right: Minimap.
  drawUIMinimap(1920 - 450, 1080 - 540, 400, 400);
};

const pregameMenu = [ // Static menu.

  [960, 500, '$PLAY WITH AUDIO', 65, e => {
    enableAudio(true);
    playMusic(menuMusicObject);
    openMenu(MAIN_MENU);
  }],
 
  [960, 650, '@PLAY WITHOUT AUDIO', 65, e => {
    options.M = false;
    options.S = false;
    enableAudio(false);
    openMenu(MAIN_MENU);
  }],
];

// Menu definitions.
const mainMenu = [ // Static menu.
  [960, 180, '!R@A#I$N%B^O&W', 180],
  [960, 360, '&R^A%C$E#R@S', 180],

  [960, 570, '#RAINBOW CUP', 65, e => {

    // 
    // Initialize a new rainbow cup.
    // 

    let accentIdx = ~~(Math.random() * 8); // Choose a random accent color for the player.

    // Cache accent colors so they persist between races.
    for (let i = 0; i < 7; i++) {
      accentColors[i] = accentIdx++ % 7;
      const car = allCars[i];
      car._accentColor = accentColors[i];
    }

    instantRacing = false;

    endgameCamera = null;

    cupCompleted = false;

    currentTrackIdx = 0;
    
    stopMusic(currentMusic);
    playMusic(campaignMenuMusicObject);

    openMenu(CAMPAIGN_MENU);
  }],
 
  [960, 730, '&INSTANT RACE', 65, e => {
    generateInstantTrack(true);
    openMenu(INSTANT_MENU);
  }],

  [960, 890, '%OPTIONS', 65, e => {
    openMenu(OPTIONS_MENU);
  }],

  [960, 1025, '$A TINY RACING GAME FOR JS13K 2026 BY ANTIX DEVELOPMENT', 40, ],

];

const optionsMenu = e => ([ // Dynamic menu.
  [960, 120, '&O^P%T$I#O@N!S', 130],

  [960, 280, `#PLAYER NAME`, 60],

  [960, 380, `$${options.N}`, 60, e => {
    playSound(FX_CLICK);
    uiBlocked = true;
    onlyNumbers = false;
    z.maxLength  = 20;
    z.style.display = 'block';
    z.value = options.N;
    z.focus();
  }], 

  [300,  510, '#STEER LEFT', 60, e => bindingTarget = 'L'],
  [700,  510, options.L.toUpperCase(), 50, ],
  [1200, 510, '#STEER RIGHT', 60, e => bindingTarget = 'R'],
  [1650, 510, options.R.toUpperCase(), 50, ],

  [300,  610, '#ACCELERATE', 60, e => bindingTarget = 'A'],
  [700,  610, options.A.toUpperCase(), 50, ],
  [1200, 610, '#BRAKE', 60, e => bindingTarget = 'B'],
  [1650, 610, options.B.toUpperCase(), 50, ],

  [960, 740, options.M ? '$MUSIC: ON' : '!MUSIC: OFF', 60, e => {
    options.M = !options.M;
    if (options.M) {
      enableAudio(true);
      playMusic(menuMusicObject);

    } else {
      if (currentMusic) stopMusic(currentMusic);
    }
  }],
  [960, 840, options.S ? '$EFFECTS: ON' : '!EFFECTS: OFF', 60, e => {
    options.S = !options.S;
    if (options.S) {
      enableAudio(true);
      playSound(FX_CLICK);
    };
  }],
  [960, 1e3, '@B#A$C%K', 90, e => {
    saveoptions();
    openMenu(MAIN_MENU);
  }], 
]);

const randomTrackName = s => {
let a=["Sparkle","Dazzle","Glitter","Twinkle","Shimmer","Neon","Rainbow","Prism","Crystal","Moonbeam","Starlight","Cosmic","Nebula","Pixel","Volt","Turbo","Phantom","Mystic","Iridescent","Fractal","Echo","Flare","Glimmer","Radiance","Lunar","Solar","Blaze","Aurora","Nova","Storm","Ember","Twilight","Celestial","Dream","Velvet", "Pixie","Velvet","Midnight","Sugar"];

let b=["Runway","Speedway","Circuit","Pass","Trail","Dash","Ridge","Vortex","Bend","Curve","Straight","Chicane","Apex","Loop","Spiral","Drift","Climb","Drop","Glide","Sprint","Burst","Rush","Surge","Twist","Sway","Path","Lane","Track","Pulse","Flux","Run","Shift","Mile","Crest","Rally","Way","Line","Turn","Ride","Flow"];
  let i=(randomFloat()*999)|0;
  return a[i%a.length] + ' ' + b[(i*17)%b.length];
};

let uiBlocked;
let sizeIdx = 0;
let typeIdx = 0;
let skillIdx = 0;
let lapsIdx = 0;
// let instantSeed = (Math.random() * 1e8) | 0;

const instantTrackDef =   {
  _seed: 0, 

  _trackName: '', 
  _radius: 0, 
  _numPoints: 0, 
  _trackWidth: 0, 
  _aiSkill: 0, 
  _aiSpeed: 0, 
  _gradient: 0, 

  _hillAmp1: 0, 
  _hillAmp2: 0, 

  _numberOfLaps: 0, 

  _aiCarCount: 6, 
  _boosterCount: 3, 
  _checkPointCount: 5, 
};

const generateInstantTrack = (silent = false, retainSeed = false, retainName = false) => {

  cupCompleted = false;
  raceFinished = false;

  if (!silent) playSound(FX_INSTANT);

  const t = instantTrackDef;

  t._hillAmp1 = [0, 25, 50, 90][typeIdx];
  t._hillAmp2 = [0, 20, 45, 90][typeIdx];
  t._radius = [900, 1100, 1300, 1600][sizeIdx];
  t._numPoints = [16, 20, 24, 28][sizeIdx];

  if (!retainSeed) t._seed = (Math.random() * 1e7) | 0;
  randomState = t._seed;

  //beginclip
  console.log(`generateInstantTrack() randomState:${randomState} t._seed${t._seed}`)
  //endclip

  // if (!retainSeed) {
  //   t._trackName = randomTrackName();
  //   t._seed = (Math.random() * 1e7) | 0;
  // }

  generateTrack(t._radius, t._numPoints, t._hillAmp1, t._hillAmp2);

  if (!retainName) t._trackName = randomTrackName();

  buildTrackMesh(true);
};

let onlyNumbers;

const instantMenu = e => {

  return [ // Dynamic menu.
    [960, 90, '!I@N#S$T%A^N&T !R@A#C$E', 110],

    [450, 250, '#SEED', 45, ],
    [450, 300, `$${instantTrackDef._seed}`, 35, e => {
      playSound(FX_CLICK);
      uiBlocked = true;
      onlyNumbers = true;
      z.style.display = 'block';
      z.maxLength = 9;
      z.value = instantTrackDef._seed;
      z.focus();
    }],

    [450, 390, '#SIZE', 45, ],
    [115, 440, `${sizeIdx === 0 ? '$' : ''}SMALL`, 35, e => {sizeIdx = 0; generateInstantTrack()}],
    [325, 440, `${sizeIdx === 1 ? '$' : ''}MEDIUM`, 35, e => {sizeIdx = 1; generateInstantTrack()}],
    [525, 440, `${sizeIdx === 2 ? '$' : ''}LARGE`, 35, e => {sizeIdx = 2; generateInstantTrack()}],
    [750, 440, `${sizeIdx === 3 ? '$' : ''}GIGANTIC`, 35, e => {sizeIdx = 3; generateInstantTrack()}],

    [450, 530, '#HILLINESS', 45, ],
    [120, 580, `${typeIdx === 0 ? '$' : ''}FLAT`, 35, e => {typeIdx = 0; playSound(FX_CLICK); generateInstantTrack(true, true, true)}],
    [315, 580, `${typeIdx === 1 ? '$' : ''}ROLLING`, 35, e => {typeIdx = 1; playSound(FX_CLICK); generateInstantTrack(true, true, true)}],
    [515, 580, `${typeIdx === 2 ? '$' : ''}HILLY`, 35, e => {typeIdx = 2; playSound(FX_CLICK); generateInstantTrack(true, true, true)}],
    [725, 580, `${typeIdx === 3 ? '$' : ''}EXTREME`, 35, e => {typeIdx = 3; playSound(FX_CLICK); generateInstantTrack(true, true, true)}],

    [450, 670, '#OPPONENTS', 45, ],
    [120, 720, `${skillIdx === 0 ? '$' : ''}NOVICE`, 35, e => {skillIdx = 0; playSound(FX_CLICK)}],
    [315, 720, `${skillIdx === 1 ? '$' : ''}ADEPT`, 35, e => {skillIdx = 1; playSound(FX_CLICK)}],
    [520, 720, `${skillIdx === 2 ? '$' : ''}SKILLED`, 35, e => {skillIdx = 2; playSound(FX_CLICK)}],
    [755, 720, `${skillIdx === 3 ? '$' : ''}VETERAN`, 35, e => {skillIdx = 3; playSound(FX_CLICK)}],

    [450, 810, '#LAPS TO WIN', 45, ],
    [165, 860, `${lapsIdx === 0 ? '$' : ''}TWO`, 35, e => {lapsIdx = 0; playSound(FX_CLICK)}],
    [315, 860, `${lapsIdx === 1 ? '$' : ''}FOUR`, 35, e => {lapsIdx = 1; playSound(FX_CLICK)}],
    [450, 860, `${lapsIdx === 2 ? '$' : ''}SIX`, 35, e => {lapsIdx = 2; playSound(FX_CLICK)}],
    [595, 860, `${lapsIdx === 3 ? '$' : ''}EIGHT`, 35, e => {lapsIdx = 3; playSound(FX_CLICK)}],
    [745, 860, `${lapsIdx === 4 ? '$' : ''}TEN`, 35, e => {lapsIdx = 4; playSound(FX_CLICK)}],

    [450, 1e3, '^GENERATE', 80, e => {generateInstantTrack()}], 

    [1400, 910, `&${instantTrackDef._trackName}`, 45, ],

    [1200, 1e3, '$RACE', 80, e => {
      stopMusic(currentMusic);

      pointsMap = {};

      allCarNames.forEach(name => {
        pointsMap[name] = 0;
      });

      let accentIdx = ~~(Math.random() * 8); // Choose a random accent color for the player.

      for (let i = 0; i < 7; i++) accentColors[i] = accentIdx++ % 7; // Cache accent colors so they persist between races.

      instantTrackDef._trackWidth = [200, 170, 150, 130][sizeIdx];
      instantTrackDef._aiSkill = [.65, .70, .77, .9][skillIdx];
      instantTrackDef._aiSpeed = [7.2, 7.35, 7.5, 7.6][skillIdx];
      instantTrackDef._numberOfLaps = [2, 4, 6, 8, 10][lapsIdx];

      instantTrackDef._gradient = (Math.random() * 7) | 0;
      
      instantRacing = true;

      newTrack(instantTrackDef);
      beginCountDown();
    }], 

    [1600, 1e3, '!BACK', 80, e => {
      openMenu(MAIN_MENU);
    }], 

  ]
};

const campaignMenu = e => { // Dynamic menu.

  const heading = (cupCompleted) ? `&ALL RACES RUN` : (instantRacing) ? '&THE ^RESULTS %ARE $IN' : `&NEXT UP ^"${trackDefs[currentTrackIdx]._trackName}" &(${currentTrackIdx + 1} OF 7)`;
  
  const confirmButtonText = (cupCompleted) ? '$PODIUM' : (instantRacing) ? '' : '$NEXT RACE';
  
  const cancelButtonText = (instantRacing) ? '$BACK TO MAIN MENU' : '!RETIRE';

  const titleText = (instantRacing) ? '!I@N#S$T%A^N&T !R@A#C$E' : '&R^A%I$N#B@O!W &C^U%P';

  return [
    [960, 100, titleText, 110],

    [960,  260, heading, 65, ],
    
    [350,  385, 'RANK', 55, ],
    [675,  385, 'PLACE', 55, ],
    [1085, 385, 'UNICORN', 55,],
    [1510, 385, 'POINTS', 55, ],

    [350,  460, '1ST', 40, ],
    [675,  460, `${allCars[0]._place}`, 40, ],
    [1085, 460, `${'!@#$%^&'[allCars[0]._accentColor]}${allCars[0]._name}`, 40],
    [1510, 460, `${allCars[0]._points}`, 40, ],

    [350,  530, '2ND', 40, ],
    [675,  530, `${allCars[1]._place}`, 40, ],
    [1085, 530, `${'!@#$%^&'[allCars[1]._accentColor]}${allCars[1]._name}`, 40],
    [1510, 530, `${allCars[1]._points}`, 40, ],

    [350,  600, '3RD', 40, ],
    [675,  600, `${allCars[2]._place}`, 40, ],
    [1085, 600, `${'!@#$%^&'[allCars[2]._accentColor]}${allCars[2]._name}`, 40],
    [1510, 600, `${allCars[2]._points}`, 40, ],

    [350,  670, '4TH', 40, ],
    [675,  670, `${allCars[3]._place}`, 40, ],
    [1085, 670, `${'!@#$%^&'[allCars[3]._accentColor]}${allCars[3]._name}`, 40],
    [1510, 670, `${allCars[3]._points}`, 40, ],

    [350,  740, '5TH', 40, ],
    [675,  740, `${allCars[4]._place}`, 40, ],
    [1085, 740, `${'!@#$%^&'[allCars[4]._accentColor]}${allCars[4]._name}`, 40],
    [1510, 740, `${allCars[4]._points}`, 40, ],

    [350,  810, '6TH', 40, ],
    [675,  810, `${allCars[5]._place}`, 40, ],
    [1085, 810, `${'!@#$%^&'[allCars[5]._accentColor]}${allCars[5]._name}`, 40],
    [1510, 810, `${allCars[5]._points}`, 40, ],

    [350,  880, '7TH', 40, ],
    [675,  880, `${allCars[6]._place}`, 40, ],
    [1085, 880, `${'!@#$%^&'[allCars[6]._accentColor]}${allCars[6]._name}`, 40],
    [1510, 880, `${allCars[6]._points}`, 40, ],

    [(instantRacing) ? 960 : 350, 1e3, cancelButtonText, 70, e => {

      // if (instantRacing) {

      //   // console.log('cancelling')

      //   // countdown(
      //   //   60 * 1, 
      //   //   '',
      //   //   0, 
      //   //   0, 
      //   //   0,
      //   //   e => {
      //   //     instantRacing = false;
      //   //     console.log(`instantRacing:${instantRacing}`);
      //   //   }
      //   // );

      // } else {

        // Reset stuff that would look strange when starting the cup anew.
        allCars.forEach(car => {
          car._points = 0;
          car._place = '-';
        });

        pointsMap = {};

        allCarNames.forEach(name => {
          pointsMap[name] = 0;
        });

      // }

      camDist = 75;
      raceFinished = false;

      currentSky = skyGradients[4];

      stopMusic(currentMusic);
      playMusic(menuMusicObject);

      openMenu(MAIN_MENU);
      gameMode = MODE_MENUS;
    }], 

    [1450, 1e3, confirmButtonText, 90, e => {

      if (cupCompleted) {

        raceFinished = false;

        // if (raceFinished && cupCompleted) {
        //   allCars.forEach(car => {
        //     car._fly = true;
        //   });
        // }

        // Snapshot camera.
        endgameCamera = Object.assign({}, cameraTarget);
        cameraTarget = endgameCamera;

        // Get spline locations.
        const finishLine = splinePoints[0];

        const camPoint = splinePoints[splinePoints.length - 4];

        // const camPoint = splinePoints[splinePoints.length - 2];

        // Set camera position (elevated slightly above track).
        cameraTarget._x = camPoint[0];
        cameraTarget._y = camPoint[1] + 65;
        // cameraTarget._y = camPoint[1] + 45;
        cameraTarget._z = camPoint[2];

        // Compute directional deltas to finish line.
        let dx = finishLine[0] - cameraTarget._x;
        let dy = finishLine[1] - cameraTarget._y;
        let dz = finishLine[2] - cameraTarget._z;

        // Ground plane distance (XZ).
        let hDist = Math.hypot(dx, dz); 

        // Calculate orientation.
        cameraTarget._yaw = Math.atan2(dx, dz);    // Yaw: facing direction.
        cameraTarget._pitch = Math.atan2(-dy, hDist); // Pitch: looking down/up at line.
        cameraTarget._roll = 0;

        stopMusic(currentMusic);
        playMusic(endgameModuleObject);
        openMenu(ENDGAME_MENU);

      } else {

        newTrack(trackDefs[currentTrackIdx]);

        beginCountDown();
    }
  }], 
]};

const beginCountDown = e => {
  openMenu(HUD_MENU);
  gameMode = MODE_PLAYING;

  stopMusic(campaignMenuMusicObject);

  // Note: This nested code is fugly!

  playSound(FX_321);
  countdown(
    60 * 1, 
    '3',
    400, 
    250, 
    COLOR_RED,
    e => {
    playSound(FX_321);
    countdown(
      60 * 1, 
      '2',
      400, 
      250, 
      COLOR_ORANGE,
      e => {
        playSound(FX_321);
        countdown(
          60 * 1, 
          '1',
          400, 
          250, 
          COLOR_YELLOW,
          e => {
            playSound(FX_GO);
            countdown(
              60 * 1, 
              'GO',
              400, 
              250, 
              COLOR_GREEN,
              e => { // Start the race!!!
                countingDown = false;
                playersEnabled = true;

                // playMusic(module3Object);

              }
            );
          }
        );
      }
    );
  }
);
};

const endgameMenu = e => ([ // Dynamic menu.
  [960,  100, `THE WINNER WITH ${allCars[0]._points} POINTS IS`, 40],
  [960,  240, `${'!@#$%^&'[allCars[0]._accentColor]}${allCars[0]._name}`, 150],
  [960, 960, '!C@O#N$T%I^N&U!E', 90, e => {

    // Reset points.
    allCars.forEach(car => {
      car._points = 0;
    });

    pointsMap = {};

    allCarNames.forEach(name => {
      pointsMap[name] = 0;
    });

    currentSky = skyGradients[4];

    stopMusic(currentMusic);
    playMusic(menuMusicObject);

    openMenu(MAIN_MENU);

    gameMode = MODE_MENUS;
  }], 
]);
//#endregion
