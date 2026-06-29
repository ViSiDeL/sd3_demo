import * as THREE from 'three';
import { CONFIG } from './config.js';

function resolvePickableAncestor(object) {
  let node = object;
  while (node) {
    if (node.userData?.loadId !== undefined && node.userData.loadId !== null) {
      return node;
    }
    node = node.parent;
  }
  return null;
}

function getMaterialMeshes(pickable) {
  const meshes = [];
  pickable.traverse((node) => {
    if (node.isMesh && node.material) meshes.push(node);
  });
  return meshes;
}

function setPickableColor(pickable, colorHex) {
  for (const mesh of getMaterialMeshes(pickable)) {
    mesh.material.color.setHex(colorHex);
  }
}

function resetPickableColor(pickable) {
  for (const mesh of getMaterialMeshes(pickable)) {
    const original = mesh.userData.originalColor;
    if (original !== undefined) {
      mesh.material.color.setHex(original);
    } else {
      const isAlt = pickable.userData.category === 'group_b';
      mesh.material.color.setHex(
        isAlt ? CONFIG.building.altColor : CONFIG.building.defaultColor
      );
    }
  }
}

export function setupInteraction({ canvas, camera, buildingMeshes, onSelect, onDeselect, onHover }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  let hoveredPickable = null;
  let selectedPickable = null;

  function setPointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickBuilding(event) {
    setPointerFromEvent(event);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(buildingMeshes, true);
    if (intersects.length === 0) return null;
    return resolvePickableAncestor(intersects[0].object);
  }

  function applySelection(pickable) {
    if (selectedPickable) {
      resetPickableColor(selectedPickable);
    }

    if (pickable) {
      setPickableColor(pickable, CONFIG.building.selectedColor);
      selectedPickable = pickable;
      onSelect(pickable.userData.loadId, pickable);
    } else {
      selectedPickable = null;
      onDeselect();
    }
  }

  canvas.addEventListener('pointermove', (event) => {
    const pickable = pickBuilding(event);

    if (hoveredPickable && hoveredPickable !== pickable && hoveredPickable !== selectedPickable) {
      resetPickableColor(hoveredPickable);
    }
    if (pickable && pickable !== selectedPickable) {
      setPickableColor(pickable, CONFIG.building.hoverColor);
    }

    if (pickable !== hoveredPickable) {
      onHover?.(pickable ? pickable.userData.loadId : null);
    }

    hoveredPickable = pickable;
    canvas.style.cursor = pickable ? 'pointer' : 'default';
  });

  canvas.addEventListener('click', (event) => {
    applySelection(pickBuilding(event));
  });

  return {
    clearSelection() {
      if (selectedPickable) resetPickableColor(selectedPickable);
      selectedPickable = null;
    },
    selectPickable(pickable) {
      applySelection(pickable);
    },
  };
}