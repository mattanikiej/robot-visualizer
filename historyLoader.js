import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
// import { scene, camera, renderer } from "./main"

let voxels = [];
let settings = [];
let clips = [];
let mixers = [];
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
  const init_state = steps[0].split(">>>")[1].split(";");

  // create and arrange voxels at initial step
  for (let i = 0; i < init_state.length-1; i++) {
    // extract voxel information
    const voxel_info = init_state[i].split(",");

    // position
    let vx = parseFloat(voxel_info[0]) * rescale;
    let vy = parseFloat(voxel_info[1]) * rescale;
    let vz = parseFloat(voxel_info[2]) * rescale;

    // orientation
    let vow = parseFloat(voxel_info[3]);
    let vox = parseFloat(voxel_info[4]);
    let voy = parseFloat(voxel_info[5]);
    let voz = parseFloat(voxel_info[6]);

    // corners
    let vnnnx = parseFloat(voxel_info[7]) * rescale;
    let vnnny = parseFloat(voxel_info[8]) * rescale;
    let vnnnz = parseFloat(voxel_info[9]) * rescale;

    let vpppx = parseFloat(voxel_info[10]) * rescale;
    let vpppy = parseFloat(voxel_info[11]) * rescale;
    let vpppz = parseFloat(voxel_info[12]) * rescale;

    // material id
    let vmid = parseFloat(voxel_info[13]);

    // console.log([vx, vy, vz, vow, vox, voy, voz, vnnnx, vnnny, vnnnz, vpppx, vpppy, vpppz, vmid]);

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
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(new THREE.Vector3(vox, voy, voz), vow);
    cube.setRotationFromQuaternion(quaternion);

    voxels.push(cube);
    scene.add(cube);
  }

  renderer.render(scene, camera);
  kfAnimate();
}

function kfAnimate() {

  const times = [0, 3, 6];
  const values = [0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0];

  const positionKF = new THREE.VectorKeyframeTrack(".position", times, values);

  const tracks = [positionKF];

  const length = -1;
  
  const clip = new THREE.AnimationClip('slowmove', length, tracks);
  clips.push(clip);

  const mixer = new THREE.AnimationMixer(voxels[0]);
  mixers.push(mixer);

  const action = mixer.clipAction(clip);
  actions.push(action);

  action.play();

  animate();

}

function animate() {
  requestAnimationFrame(animate);

  const mixer = actions[0].getMixer();

  const delta = clock.getDelta();
  mixer.update(delta);

  // update controls
  controls.update();

  renderer.render(scene, camera);
}
