export const CONFIG = {
  dataPaths: {
    buildings: './data/grid_buildings.json',
    linesNone: './data/grid_lines.json',
    linesPhase: './data/phase/grid_lines_with_phase.json',
  },
  modelPath: './public/models/sd3.glb',
  building: {
    defaultColor: 0xf2c879,   // "group_a"
    altColor: 0x6fcf97,       // "group_b"
    hoverColor: 0xffffff,
    selectedColor: 0x6b9fff,
  },
  overlayColors: {
    none: {
      default: 0xffffff,
    },
  },
  camera: {
    fov: 50,
    near: 0.1,
    far: 5000,
    startPosition: { x: 0, y: 220, z: 260 },
  },
  dashboardBaseUrl: 'https://sd3-3qt.pages.dev',
};
