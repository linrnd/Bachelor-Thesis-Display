/*
 *  Filename: scripts-white.js
 *  Description: Functions (dynamic behavior) for the cylindrical display preview - White version.
 */

import { CDData } from "./data-white.js";
import { CDSceneConfig, CDConfig } from "./config.js";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let htmlBodyMargin = window.getComputedStyle(document.body).getPropertyValue('margin-top');
htmlBodyMargin = htmlBodyMargin.substring(0, htmlBodyMargin.length-2);

const canvas = document.getElementById("threejs-canvas");

document.addEventListener("DOMContentLoaded", function(){
    CDSceneConfig.canvas.width = window.innerWidth - htmlBodyMargin * 2;
    CDSceneConfig.canvas.height = window.innerHeight - htmlBodyMargin * 2;
    CdSceneInit();
});

document.addEventListener("keydown", function(event){
    if(event.isTrusted){
        switch(event.key)
        {
            case "ArrowRight":
                if(CDData.length > 1){
                    displayedTextureIndex = displayedTextureIndex + 1;
                    if(displayedTextureIndex >= CDData.length) displayedTextureIndex = 0;
                }
                break;

            case "ArrowLeft":
                if(CDData.length > 1){
                    displayedTextureIndex = displayedTextureIndex - 1;
                    if(displayedTextureIndex < 0) displayedTextureIndex = CDData.length - 1;
                }
                break;

            default:
                break;
        }
        UpdateCdPreviewForIndex(displayedTextureIndex);
    }
});

window.addEventListener("resize", function(event){
    CDSceneConfig.canvas.width = window.innerWidth - htmlBodyMargin * 2;
    CDSceneConfig.canvas.height = window.innerHeight - htmlBodyMargin * 2;
    camera.aspect = CDSceneConfig.canvas.width / CDSceneConfig.canvas.height;
    camera.updateProjectionMatrix();
    renderer.setSize(CDSceneConfig.canvas.width, CDSceneConfig.canvas.height);
});

let scene = null;
let camera = null;
let renderer = null;
let clock = null;
let deltaTime = 0;
let controls = null;

let cdTex = null;
let cdDisplayMat = null;

function CdSceneInit(){
    LoadTextures(textureLoader, 0, CDData.length);
}

let displayedTextureIndex = 0;
const textureLoader = new THREE.TextureLoader();

function LoadTextures(textureLoader, textureIndex, textureCount) {
    textureLoader.load(
        CDData[textureIndex].textureUrl,
        function ( texture ) {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.rotation = 0;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.repeat.set(-1, 1);
            texture.offset.set(1, 0);
            texture.premultiplyAlpha = true;
            texture.generateMipmaps = false;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.needsUpdate = true;

            CDData[textureIndex].loadedTexture = texture;
            textureIndex = textureIndex + 1;

            if(textureIndex < textureCount) LoadTextures(textureLoader, textureIndex, textureCount);
            else BuildScene();
        },
        undefined,
        function(err) {
            console.log("[scripts-white.js] LoadTextures error");
        }
    );
}

function BuildScene()
{
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const pointLight = new THREE.PointLight( 0xffffff, 4, 40, 0);
    pointLight.position.set( 0, 6, 0 );
    scene.add( pointLight );

    const ambientLight = new THREE.AmbientLight( 0xffffff );
    scene.add( ambientLight );

    const cdGeom = new THREE.CylinderGeometry(CDConfig.radius, CDConfig.radius, CDConfig.height,
        CDConfig.geometry.radialSegments, CDConfig.geometry.heightSegments, CDConfig.geometry.openEnded, CDConfig.geometry.thetaStart, CDConfig.geometry.thetaEnd);
    cdTex = CDData[displayedTextureIndex].loadedTexture;

    cdDisplayMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: cdTex,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        alphaTest: 0.01      // removes border artifacts on transparent edges
    });

    const cdMesh = new THREE.Mesh(cdGeom, cdDisplayMat);
    cdMesh.position.y = CDConfig.height * 0.5 + CDConfig.aboveGround;
    scene.add(cdMesh);

    const cdInnerModelGeom = new THREE.CircleGeometry(CDConfig.radius + CDConfig.model.offset, CDConfig.model.radialSegments);
    const cdOuterModelGeom = new THREE.CircleGeometry(CDConfig.radius + CDConfig.model.width - CDConfig.model.offset, CDConfig.model.radialSegments);
    const cdInnerModelEdges = new THREE.EdgesGeometry( cdInnerModelGeom );
    const cdOuterModelEdges = new THREE.EdgesGeometry( cdOuterModelGeom );
    const cdInnerModelShape = new THREE.Shape();
    const cdOuterModelShape = new THREE.Shape();

    const cdInnerModelEdgeVertices = cdInnerModelEdges.attributes.position.array;
    cdInnerModelShape.moveTo(cdInnerModelEdgeVertices[0], cdInnerModelEdgeVertices[1]);
    for(let i = 3; i < cdInnerModelEdgeVertices.length; i=i+3){
        cdInnerModelShape.lineTo(cdInnerModelEdgeVertices[i], cdInnerModelEdgeVertices[i+1]);
    }
    cdInnerModelShape.lineTo(cdInnerModelEdgeVertices[0], cdInnerModelEdgeVertices[1]);

    const cdOuterModelEdgeVertices = cdOuterModelEdges.attributes.position.array;
    cdOuterModelShape.moveTo(cdOuterModelEdgeVertices[0], cdOuterModelEdgeVertices[1]);
    for(let i = 3; i < cdOuterModelEdgeVertices.length; i=i+3){
        cdOuterModelShape.lineTo(cdOuterModelEdgeVertices[i], cdOuterModelEdgeVertices[i+1]);
    }
    cdOuterModelShape.lineTo(cdOuterModelEdgeVertices[0], cdOuterModelEdgeVertices[1]);

    cdOuterModelShape.holes.push(cdInnerModelShape);

    const cdModelGeom = new THREE.ExtrudeGeometry(cdOuterModelShape, {
        steps: 1,
        depth: CDConfig.height,
        bevelEnabled: true,
        bevelThickness: 0,
        bevelSize: 0,
        bevelOffset: 0,
        bevelSegments: 0
    });
    const cdModelMat = new THREE.MeshStandardMaterial({
        color: CDConfig.model.color,
        emissive: 0x000000,
        roughness: 1,
        metalness: 0,
        flatShading: false
    });
    const cdModelMesh = new THREE.Mesh(cdModelGeom, cdModelMat) ;
    cdModelMesh.setRotationFromEuler(new THREE.Euler(90 * Math.PI / 180, 0, 0, "XYZ"));
    cdModelMesh.position.y = CDConfig.height + CDConfig.aboveGround;
    scene.add(cdModelMesh);

    camera = new THREE.PerspectiveCamera(CDSceneConfig.camera.fov, CDSceneConfig.canvas.width / CDSceneConfig.canvas.height, CDSceneConfig.camera.near, CDSceneConfig.camera.far);
    camera.position.set(CDSceneConfig.camera.pos.x, CDSceneConfig.camera.pos.y, CDSceneConfig.camera.pos.z);
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    renderer.setSize(CDSceneConfig.canvas.width, CDSceneConfig.canvas.height);
    renderer.render(scene, camera);
    renderer.setClearColor(0xffffff);

    clock = new THREE.Clock();

    controls = new OrbitControls( camera, renderer.domElement );
    controls.minDistance = 0.1;
    controls.maxDistance = 20.0;
    controls.minPolarAngle = 0.0 * Math.PI;
    controls.maxPolarAngle = 0.6 * Math.PI;
    controls.enablePan = false;
    controls.target = new THREE.Vector3(CDSceneConfig.camera.lookAt.x, CDSceneConfig.camera.lookAt.y, CDSceneConfig.camera.lookAt.z);

    Animate();
}

function Animate(){
    requestAnimationFrame(Animate);
    deltaTime = clock.getDelta();
    controls.update(deltaTime);
    renderer.render(scene, camera);
}

function UpdateCdPreviewForIndex(index){
    cdTex = CDData[displayedTextureIndex].loadedTexture;
    cdDisplayMat.map = cdTex;
}
