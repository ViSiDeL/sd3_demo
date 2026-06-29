import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';

export async function loadGridModel(scene) {
  const [gridGroupData, realGroupData] = await Promise.all([
    loadGridViewGroup(),
    loadRealViewGroup(),
  ]);

  scene.add(gridGroupData.group);
  scene.add(realGroupData.group);

  gridGroupData.group.visible = false;

  const allBuildingMeshes = [...gridGroupData.buildingMeshes, ...realGroupData.buildingMeshes];

  return {
    gridGroup: gridGroupData.group,
    realGroup: realGroupData.group,
    feederMesh: gridGroupData.feederMesh,
    allBuildingMeshes,
    gridBuildingMeshes: gridGroupData.buildingMeshes,
    realBuildingMeshes: realGroupData.buildingMeshes,
  };
}

export function setActiveView(viewMode, { gridGroup, realGroup }) {
  gridGroup.visible = viewMode === 'grid';
  realGroup.visible = viewMode === 'real';
}

// grid
async function loadGridViewGroup() {
  const group = new THREE.Group();
  group.name = 'GridView';

  const loader = new GLTFLoader();
  let gltf;
  try {
    gltf = await loader.loadAsync(CONFIG.modelPath);
  } catch (err) {
    console.error('could not load glb.', err);
    return { group, buildingMeshes: [], feederMesh: null };
  }

  group.add(gltf.scene);

  const buildingMeshes = [];
  let feederMesh = null;

  gltf.scene.traverse((node) => {
    if (node.isMesh && node.name?.startsWith('load_')) {
      let loadId = node.userData?.load_id;
      if (loadId === undefined) {
        const match = node.name.match(/load_(\d+)/);
        loadId = match ? parseInt(match[1], 10) : null;
      }
      node.userData.loadId = loadId;
      node.userData.category = node.userData.category ?? 'unknown';
      node.userData.viewMode = 'grid';

      if (node.material) {
        node.material = node.material.clone();
      }

      buildingMeshes.push(node);
    }

    if (node.name === 'FeederNetwork' || node.name === 'FeederNetwork.001') {
      feederMesh = node;
    }
  });

  if (!feederMesh) {
    console.warn('FeederNetwork mesh not found');
  }

  return { group, buildingMeshes, feederMesh };
}

// real
async function loadRealViewGroup() {
  const group = new THREE.Group();
  group.name = 'RealView';

  const groundGeo = new THREE.PlaneGeometry(2000, 2000);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a7c3f });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  group.add(ground);

  const sun = new THREE.DirectionalLight(0xfff1d6, 1.4);
  sun.position.set(120, 260, 80);
  sun.castShadow = true;
  sun.shadow.camera.left   = -300;
  sun.shadow.camera.right  =  300;
  sun.shadow.camera.top    =  300;
  sun.shadow.camera.bottom = -300;
  sun.shadow.camera.near   = 1;
  sun.shadow.camera.far    = 1200;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  group.add(sun);

  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(8, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff1d6 })
  );
  sunMesh.position.copy(sun.position);
  group.add(sunMesh);

  const buildingsData = await fetch(CONFIG.dataPaths.buildings).then((res) => res.json());

  const locationGroups = groupBuildingsByLocation(buildingsData);

  const buildingMeshes = [];
  for (const locationGroup of locationGroups) {
    const { x, z, loads } = locationGroup;
    const building = buildMultiStoryBuilding(loads);
    building.position.set(x, 0, -z);
    building.rotation.y = pseudoRandom(loads[0].load_id) * Math.PI * 2;
    building.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    group.add(building);

    building.traverse((node) => {
      if (node.userData?.loadId !== undefined) {
        buildingMeshes.push(node);
      }
    });
  }

  return { group, buildingMeshes };
}

function groupBuildingsByLocation(buildingsData, precision = 0.1) {
  const groups = new Map();

  for (const b of buildingsData) {
    const key = `${b.x.toFixed(precision)}_${b.z.toFixed(precision)}`;
    if (!groups.has(key)) {
      groups.set(key, { x: b.x, z: b.z, loads: [] });
    }
    groups.get(key).loads.push(b);
  }

  return Array.from(groups.values());
}

function buildMultiStoryBuilding(loads) {
  const buildingGroup = new THREE.Group();

  const floorHeight = 2.4;
  const footprint = 3; // width/depth

  loads.forEach((load, index) => {
    const isAlt = load.category === 'group_b';
    const shadeShift = index * 0.06;
    const wallColor = isAlt
      ? shiftColor(0xcfe8d8, shadeShift)
      : shiftColor(0xe8d9b8, shadeShift);

    const bodyGeo = new THREE.BoxGeometry(footprint, floorHeight, footprint);
    const bodyMat = new THREE.MeshStandardMaterial({ color: wallColor });
    const story = new THREE.Mesh(bodyGeo, bodyMat);
    story.userData.originalColor = wallColor;

    story.position.y = floorHeight * index + floorHeight / 2;

    story.userData.loadId = load.load_id;
    story.userData.category = load.category;
    story.userData.viewMode = 'real';
    story.userData.storyIndex = index;

    buildingGroup.add(story);
  });

  const isTopAlt = loads[loads.length - 1].category === 'group_b';
  const roofColor = isTopAlt ? 0x5c8a6e : 0x8a5c3c;
  const roofGeo = new THREE.ConeGeometry(footprint * 0.77, 1.6, 4);
  const roofMat = new THREE.MeshStandardMaterial({ color: roofColor });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.userData.originalColor = roofColor;
  roof.position.y = floorHeight * loads.length + 0.8;
  roof.rotation.y = Math.PI / 4;
  roof.userData.loadId = loads[loads.length - 1].load_id;
  roof.userData.category = loads[loads.length - 1].category;
  roof.userData.viewMode = 'real';
  buildingGroup.add(roof);

  return buildingGroup;
}

function shiftColor(hex, amount) {
  const color = new THREE.Color(hex);
  color.offsetHSL(0, 0, amount);
  return color.getHex();
}

function pseudoRandom(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export async function loadOverlayData(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load overlay data at ${path}: ${res.status}`);
  }
  return res.json();
}

export function applyOverlayMode(feederMesh, mode) {
  if (!feederMesh) return;

  const colors = CONFIG.overlayColors[mode];
  if (!colors) {
    console.warn(`No overlay color config for mode "${mode}"`);
    return;
  }

  const flatColor = colors.default ?? colors.trunk_three_phase ?? 0xffffff;

  feederMesh.traverse((node) => {
    if (node.isMesh && node.material) {
      node.material = node.material.clone();
      node.material.color.setHex(flatColor);
    }
  });
}
