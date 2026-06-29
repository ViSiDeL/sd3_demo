import { CONFIG } from './config.js';
import { createScene } from './scene.js';
import { loadGridModel, setActiveView } from './grid-loader.js';
import { setupInteraction } from './interaction.js';
import {
  initHud,
  showFocusedLoad,
  hideFocusedLoad,
  requestLoadView,
  clearLoadView,
} from './hud.js';

async function main() {
  const { scene, camera, renderer, controls, focusCameraOn } = createScene();

  const model = await loadGridModel(scene);
  const { gridGroup, realGroup, feederMesh, gridBuildingMeshes, realBuildingMeshes } = model;
  
  let activeBuildingMeshes = [...realBuildingMeshes]; // real

  const interaction = setupInteraction({
    canvas: renderer.domElement,
    camera,
    buildingMeshes: activeBuildingMeshes,
    onSelect: (loadId, pickable) => {
      showFocusedLoad(loadId);
      requestLoadView(loadId);
      const worldPos = new THREE.Vector3();
      pickable.getWorldPosition(worldPos);
      focusCameraOn(worldPos);
    },
    onDeselect: () => {
      hideFocusedLoad();
      clearLoadView();
    },
    onHover: () => {},
  });

  initHud({
    onViewModeChange: (viewMode) => {
      setActiveView(viewMode, { gridGroup, realGroup });
      swapActiveMeshes(viewMode, activeBuildingMeshes, { gridBuildingMeshes, realBuildingMeshes });
    },
    onClearFocus: () => {
      clearLoadView();
    },
  });

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.__gridDebug = { scene, gridGroup, realGroup, feederMesh };
}

function swapActiveMeshes(viewMode, activeArrayRef, { gridBuildingMeshes, realBuildingMeshes }) {
  const next = viewMode === 'grid' ? gridBuildingMeshes : realBuildingMeshes;
  activeArrayRef.length = 0;
  activeArrayRef.push(...next);
}

main();
