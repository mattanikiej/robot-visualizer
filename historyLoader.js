import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let voxels = [];
let settings = [];
let clips = [];
let actions = [];

let scene = null;
let renderer = null;
let camera = null;
let controls = null;

// clock is bugged and not starting
let clock = new THREE.Clock(true);

function createScene() {
  if (renderer != null) {
    document.body.removeChild(renderer.domElement);
  }

  // clear existing voxels and settings
  voxels = [];
  settings = [];

  // create new scene
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    20,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  camera.position.z = 1;

  controls = new OrbitControls( camera, renderer.domElement );

}

document.getElementById("fileForm").addEventListener("change", readFile);
function readFile() {

  // reset scene
  createScene();

  let input = document.getElementById("fileForm");

  let file = input.files[0];

  let reader = new FileReader();

  reader.readAsText(file);

  reader.onload = function () {
    let fileText = reader.result;
    createAnimation(fileText.split("\n"));
  };

  reader.onerror = function () {
    console.log(reader.error);
  };
}

function createAnimation(data) {
  // extract settings from data
  // const settings = data.slice(0, 5)
  // console.log(settings)
  let rescale = 0.001;
  let mats = [
    [0, 0, 1, 0.75],
    [0, 1, 0, 0.75],
    [1, 0, 0, 0.75],
  ];
  let voxel_size = 0.01;
  settings = [rescale, mats, voxel_size];

  // extract steps from data
  const steps = data.slice(6);
  // console.log(steps);

  // extract initial state
  // const init_state = steps[0].split(">>>")[1].split(";");

  let times = [];
  let positions_per_voxel = [];
  let rotations_per_voxel = [];

  for (let j = 0; j < steps.length-1; j++) {

    // add current step time to the times array
    const t_str = steps[j].split(">>>")[0].split(":")[1];
    const t_float = parseFloat(t_str);
    times.push(t_float);

    let positions = [];
    let rotations = [];

    // get current step information
    const step = steps[j].split(">>>")[1].split(";");

    for (let i = 0; i < step.length-1; i++) {
      // extract voxel information
      const voxel_info = step[i].split(",");

      // position
      let vx = parseFloat(voxel_info[0]) * rescale;
      let vy = parseFloat(voxel_info[1]) * rescale;
      let vz = parseFloat(voxel_info[2]) * rescale;
      positions.push(vx);
      positions.push(vy);
      positions.push(vz);

      // orientation
      let vow = parseFloat(voxel_info[3]);
      let vox = parseFloat(voxel_info[4]);
      let voy = parseFloat(voxel_info[5]);
      let voz = parseFloat(voxel_info[6]);
      rotations.push(vox);
      rotations.push(voy);
      rotations.push(voz);
      rotations.push(vow);

      // corners
      let vnnnx = parseFloat(voxel_info[7]) * rescale;
      let vnnny = parseFloat(voxel_info[8]) * rescale;
      let vnnnz = parseFloat(voxel_info[9]) * rescale;

      let vpppx = parseFloat(voxel_info[10]) * rescale;
      let vpppy = parseFloat(voxel_info[11]) * rescale;
      let vpppz = parseFloat(voxel_info[12]) * rescale;

      // material id
      let vmid = parseFloat(voxel_info[13]);

      // make a new cube only on initial step
      if (j === 0) {
        // create voxel
        // set geo
        const geometry = new THREE.BoxGeometry(
          1 * voxel_size,
          1 * voxel_size,
          1 * voxel_size
        );

        // set material
        const material = new THREE.MeshBasicMaterial();
        // material.wireframe = true;

        let r = mats[vmid - 1][0] * 100;
        let g = mats[vmid - 1][1] * 100;
        let b = mats[vmid - 1][2] * 100;
        let rgb_str =
          "rgb(" +
          r.toString() +
          "%, " +
          g.toString() +
          "%, " +
          b.toString() +
          "%)";
        material.color = new THREE.Color(rgb_str);

        let a = mats[vmid - 1][3];
        material.opacity = a;

        const cube = new THREE.Mesh(geometry, material);

        // set voxel params
        // position
        cube.position.x = vx;
        cube.position.y = vy;
        cube.position.z = vz;

        // orientation
        const quaternion = new THREE.Quaternion(vox, voy, voz, Math.cos(vow/2));
        cube.setRotationFromQuaternion(quaternion);

        voxels.push(cube);
        scene.add(cube);
      }

      positions_per_voxel.push(positions);
      rotations_per_voxel.push(rotations);
      
    }
  }

  renderer.render(scene, camera);
  kfAnimate(times, positions_per_voxel, rotations_per_voxel);
}

function kfAnimate(times, positions_per_voxel, rotations_per_voxel) {

  // create animation for each voxel
  for (let i = 0; i < voxels.length; i++) {

    let positions = [];
    // get position key frames for the voxel
    for (let p = 0; p < positions_per_voxel.length; p++) {
      let vx = positions_per_voxel[p][i*3];
      let vy = positions_per_voxel[p][i*3+1];
      let vz = positions_per_voxel[p][i*3+2];

      positions.push(vx);
      positions.push(vy);
      positions.push(vz);
    }

    // get rotation key frames for the voxel
    let rotations = [];
    for (let p = 0; p < rotations_per_voxel.length; p++) {

      let vow = rotations_per_voxel[p][i*4];
      let vox = rotations_per_voxel[p][i*4+1];
      let voy = rotations_per_voxel[p][i*4+2];
      let voz = rotations_per_voxel[p][i*4+3];
      

      const q = new THREE.Quaternion(vox, voy, voz, Math.cos(vow / 2));

      rotations.push(q.x);
      rotations.push(q.y);
      rotations.push(q.z);
      rotations.push(q.w);
    }

    const positionKF = new THREE.VectorKeyframeTrack(".position", times, positions);
    const rotationKF = new THREE.QuaternionKeyframeTrack(".quaternion", times, rotations);

    // const tracks = [positionKF, rotationKF];
    const tracks = [positionKF]
    
    const length = -1;

    const clip = new THREE.AnimationClip('robot-simulation'+toString(i), length, tracks);
    clips.push(clip);
    
    const mixer = new THREE.AnimationMixer(voxels[i]);
    const action = mixer.clipAction(clip);

    action.play();

    actions.push(action);
  }

  animate();

}

function animate() {
  requestAnimationFrame(animate);
  // get clock update
  const delta = clock.getDelta();

  // update actions
  for (let i = 0; i < actions.length; i++) {
    const mixer = actions[i].getMixer();
    mixer.update(delta);
  }
  
  // update controls
  controls.update();

  renderer.render(scene, camera);
}
