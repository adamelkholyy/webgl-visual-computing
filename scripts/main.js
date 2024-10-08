"use strict"; // https://stackoverflow.com/q/1335851/72470

var camera, scene, renderer, mesh, scene2, light;
var rotateX, rotateY, rotateZ, arcBall, longArcB;
var cube, cubeVertices, cubeEdges, cubeMaterials;
var angle, thi, theta;
var bunny, bunnyVertices, bunnyEdges, spinBunny;
var noiseFactor, increaseNoise, decreaseNoise;
var sphereMode;

init();
animate();
document.addEventListener('keydown', handleKeyDown);

function init() {
    printControls();
    scene = new THREE.Scene();

    // Set up the camera, move it to (3, 4, 5) and look at the origin (0, 0, 0).
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(3, 4, 5);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Draw a helper grid in the x-z plane (note: y is up).
    scene.add(new THREE.GridHelper(10, 10, 0xffffff));

    //Draws a cube centred at (0, 0, 0) and gives it a transparent mesh
    const boxGeo = new THREE.BoxGeometry( 2, 2, 2);
    boxGeo.translate(0, 0, 0);
    const boxMesh = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        opacity: 1.5,
        transparent: true,
    });

    //Loads a different texture on each side of the cube
    loadMaterials();
    cube = new THREE.Mesh(boxGeo, cubeMaterials);
    loadBunny();

    //Generates the edges and vertices of the cube for different render modes
    const edges = new THREE.EdgesGeometry( boxGeo );
    cubeEdges = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0xff00ff } ) );
    cubeVertices = initialiseVertices(cube, cube.geometry.attributes.position, 0.2);
    cube.add(cubeEdges);
    cube.add(cubeVertices);
    scene.add(cube);
    
    //Uses a second scene so as to avoid z fighting issues to display the x y and z axis
    scene2 = new THREE.Scene();
    drawCoords(0xff0000, new THREE.Vector3(5, 0, 0)); //x
    drawCoords(0x00ff00, new THREE.Vector3(0, 5, 0)); //y
    drawCoords(0x0000ff, new THREE.Vector3(0, 0, 5)); //z

    //Initialises the sphere 
    //camera.position.set(-2.2033639695068734, 2.494754799052961, 3.8107816492066);
    noiseFactor = 0;
    doSomethingCool();

    // Basic ambient lighting.
    //scene.add(new THREE.AmbientLight(0xffffff));
    scene2.add(new THREE.AmbientLight(0xffffff));

    // TASK: add more complex lighting for 'face' rendering mode (requirement 4).
    light = new THREE.DirectionalLight(0xffffff, 1); //(color, intensity)
    light.position.set(3, 4, 5);
    light.target.position.set(0, 0, 0);
    scene.add(light);
    scene.add(light.target);

    // Set up the Web GL renderer.
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio); // HiDPI/retina rendering
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false; //Added in order to allow for control of drawing priority:
    document.body.appendChild(renderer.domElement);

    // Handle resizing of the browser window.
    window.addEventListener('resize', handleResize, false);
}

//Perlin Noise shader applied to a sphere
function doSomethingCool(){
    //Uniforms needed for shader functions //0x74ebd5   0xACB6E5
    const uniforms = {
        colorB: {type: 'vec3', value: new THREE.Color(0xfa9005)},
        colorA: {type: 'vec3', value: new THREE.Color(0xeb1076)}, 
        noiseFactor: {type: 'float', value: noiseFactor}
    }

    //Creates sphere with shader applied
    var geometry = new THREE.SphereGeometry(1,32, 64); //radius, widthsegments, heightsegments
    if(sphereMode){ //special giant sphere
        geometry = new THREE.SphereGeometry(5, 100, 200);
    }
    const material =  new THREE.ShaderMaterial({
        uniforms: uniforms,
        fragmentShader: fragmentShader(),
        vertexShader: perlinVertex(),
    });

    //Adds sphere to scene
    const sphere = new THREE.Mesh(geometry, material);
    sphere.name = 'sphere';
    sphere.position.set(-4, 0,0);
    if(sphereMode){
        sphere.position.set(100, 100, 100);
    }
    scene.add(sphere);
}

//Fragment shader for the sphere. Creates a gradient mix of colorA and colorB
function fragmentShader(){
    return `
    uniform vec3 colorA; 
    uniform vec3 colorB; 
    varying vec3 vUv;
    void main() {
        gl_FragColor = vec4(mix(colorA, colorB, vUv.z), 1.0);
    }
    `
}

//Loads, scales, and renders edges and vertices for the bunny
function loadBunny(){
    //Loads the bunny
    const loader = new THREE.OBJLoader();
    loader.load('bunny-5000.obj', 
    function ( object ) {
        //Scaling the bunny to fit inside the cube using the ratio of their bounding boxes
        const bBound = new THREE.Box3().setFromObject(object);
        const cBound = new THREE.Box3().setFromObject(cube);

        const zRatio = (cBound.max.z - cBound.min.z) / (bBound.max.z - bBound.min.z);
        const xRatio = (cBound.max.x - cBound.min.x) / (bBound.max.x - bBound.min.x);
        const yRatio = (cBound.max.y - cBound.min.y) / (bBound.max.y - bBound.min.y);

        object.scale.set(xRatio,yRatio, zRatio);
        object.position.set(-xRatio, 0, 0);

        //Render edge primitives of the bunny
        const edges = new THREE.EdgesGeometry( object.children[0].geometry);
        bunnyEdges = new THREE.LineSegments(edges, new THREE.LineBasicMaterial( { color: 0xff00ff } ));
        bunnyEdges.visible = false;
        object.add(bunnyEdges);

        //Render vertices
        bunnyVertices = initialiseVertices(object, object.children[0].geometry.attributes.position, 0.05);
        bunnyVertices.visible = false;
        object.add(bunnyVertices);

        //Change the material of the bunny
        object.children[0].material.color = new THREE.Color(0xeb9423);

        cube.add(object);
        bunny = object;
    });
}

//Loads the textures of the cube
function loadMaterials(){
    const textureLoader = new THREE.TextureLoader();
    cubeMaterials = [
        new THREE.MeshBasicMaterial({ map: textureLoader.load('textures/1.jpg'), transparent:true, side:THREE.DoubleSide }), //right side
        new THREE.MeshBasicMaterial({ map: textureLoader.load('textures/2.jpg'), transparent:true, side:THREE.DoubleSide }), //left side
        new THREE.MeshBasicMaterial({ map: textureLoader.load('textures/3.jpg'), transparent:true, side:THREE.DoubleSide }), //top side
        new THREE.MeshBasicMaterial({ map: textureLoader.load('textures/4.jpg'), transparent:true, side:THREE.DoubleSide }), //bottom side
        new THREE.MeshBasicMaterial({ map: textureLoader.load('textures/5.jpg'), transparent:true, side:THREE.DoubleSide }), //front side
        new THREE.MeshBasicMaterial({ map: textureLoader.load('textures/6.jpg'), transparent:true, side:THREE.DoubleSide }), //back side
    ];
}

//Draws a coloured line on the axis specified
function drawCoords(col, directionVector){
    var points = [];
    points.push(new THREE.Vector3(0,0,0));
    points.push(directionVector);

    //Draws a line from origin to directionVector 
    var lineMaterial = new THREE.LineBasicMaterial( {color: col} );
    var lineGeo = new THREE.BufferGeometry().setFromPoints( points );
    var line = new THREE.Line( lineGeo , lineMaterial);
    scene2.add(line);
}

//Return a points object containing the vertices of an object
function initialiseVertices(object, position, discSize){
    /*position: a data structure containing an array of vectors where each vector is a point 
    where 2 edge primitives meet*/
    const pointsGeo = new THREE.BufferGeometry();
    const vertices = [];
    var vector = new THREE.Vector3();

    //Adds all of the cube vertices to the vertices array
    for ( let i = 0, l = position.count; i < l; i ++ ){
        vector.fromBufferAttribute(position, i); 
        vertices.push(vector.x, vector.y, vector.z);
    }

    /*Creates geometry object with all of the points for the cube's vertices and loads a sprite
    for displaying them */
    pointsGeo.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );		
    const sprite = new THREE.TextureLoader().load( 'textures/disc.png' );
    const pointsMaterial = new THREE.PointsMaterial( { size: discSize, sizeAttenuation: true, 
        map: sprite, alphaTest: 0.5, transparent: false } );

    return new THREE.Points( pointsGeo, pointsMaterial );
}

//Latitudinal arc ball rotation of the camera
function arcBallRotation(){
    const speed = Math.PI/200;
    const cameraPos = new THREE.Vector3(camera.position.x, 0, camera.position.z);
    
    //Initialises the angle of the camera to the x axis if needed
    if(angle == null){
        angle = cameraPos.angleTo(new THREE.Vector3(10, 0, 0));
        angle = (angle + speed) % (Math.PI*2);
    }

    //Updates the camera's position using polar co-ordinates
    const radius = cameraPos.distanceTo(new THREE.Vector3(0, 0, 0));
    camera.position.x = radius * Math.cos(angle);
    camera.position.z = radius * Math.sin(angle);;
    
    //Sets the camera to look correctly and increases the angle between the camera and the x axis
    camera.lookAt(0,0,0);
    light.position.set(camera.position.x, camera.position.y, camera.position.z);
    angle = (angle + speed) % (Math.PI*2);
}

//Orbits the camera over the top of the object (longditudinal rotation)
function longArcBall(){
    const speed = Math.PI/200;
    const thiCalc = new THREE.Vector3(camera.position.x, camera.position.y, camera.position.z);
    const thetaCalc = new THREE.Vector3(camera.position.x, 0, camera.position.z);

    //Initialises thi and theta angles (spherical polar co-ordinates) if necessary
    if(thi == null && theta == null){
        thi = thiCalc.angleTo(new THREE.Vector3(0, 10, 0)) 
        thi = ((thi + speed) );
        theta = thetaCalc.angleTo(new THREE.Vector3(10, 0, 0)) 
    }

    const radius = thiCalc.distanceTo(new THREE.Vector3(0, 0, 0));

    //Spherical polar co-ordinate calculations for the new position of the camera
    const newX = radius * Math.sin(thi) * Math.cos(theta);
    const newZ = radius * Math.sin(thi) * Math.sin(theta);
    const newY = radius * Math.cos(thi);

    //Cartesian co-ordinate calculations for the new position of the camera
    //const newX = Math.sqrt((radius*radius) - (newY*newY)) * Math.cos(theta);
    //const newZ = Math.sqrt((radius*radius) - (newY*newY)) * Math.sin(theta);

    //Sets the camera to look correctly and increases thi
    camera.position.set(newX, newY, newZ);
    camera.lookAt(0,0,0);
    light.position.set(camera.position.x, camera.position.y, camera.position.z);
    thi = ((thi + speed) );
}

// Handle resizing of the browser window.
function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

//Resets the cube and camera back to their original positions
function resetScene(){
    cube.geometry.position = (0, 0, 0);
    cube.rotation.set(0, 0, 0);
    camera.position.set(3, 4, 5);
    camera.lookAt(0, 0, 0);
    light.position.set(3,4,5);
    angle = null;
    thi = null;
    theta = null;
    bunny.rotation.set(0, 0, 0);
    noiseFactor = 0;
    sphere.position.set(-4, 0,0);
}

//Prints out a list of controls to the console
function printControls(){
    console.log('%c Visual Computing Coursework!!', 'font-weight: bold; font-size:' + 
    '50px;color: red; text-shadow: 3px 3px 0 rgb(217,31,38) , 6px 6px 0 rgb(226,91,14) '+
    ', 9px 9px 0 rgb(245,221,8) , 12px 12px 0 rgb(5,148,68) , 15px 15px 0 rgb(2,135,206) , '+
    '18px 18px 0 rgb(4,77,145) , 21px 21px 0 rgb(42,21,113)');
    console.log("CONTROLS: \n" + 
        "r - reset \n" +
        "f - face mode \n" +
        "e - edge mode \n" +
        "v - vertex mode \n" +
        "x - rotate x \n" +
        "y - rotate y \n" +
        "z - rotate Z \n" +
        "left/right arrowkeys - camera x \n" +
        "up/down arrowkeys - camera y \n" +
        "comma/fullstop - camera z \n" +
        "1 - Rotate longditudinal \n" +
        "2 - Rotate latitudinal \n" +
        "7 - Spin bunny around \n" +
        "8 - Bunny edge mode \n" +
        "9 - Bunny vertices mode \n" +
        "0 - Bunny face mode \n" + 
        "[ - Decrease sphere noise \n" + 
        "] - Increase sphere noise \n" + 
        "p - Center camera on sphere \n " + 
        "o - Center camera on cube \n " + 
        "s - Giant sphere mode");
}

// Animation loop function. This function is called whenever an update is required.
function animate() {
    requestAnimationFrame(animate);

    const speed = 0.01
    if(rotateX){
        cube.rotation.x += speed;
    }
    if(rotateY){
        cube.rotation.y += speed;
    }
    if(rotateZ){
        cube.rotation.z += speed;
    }

    if(arcBall){
        arcBallRotation();
    }
    if (longArcB){
        longArcBall();
    }

    if(bunny != null && spinBunny){
        bunny.rotation.y += speed;
    }

    //Increases/decreases the amount of "randomness" applied to the Perlin Noise shader and recomputes a new sphere
    const noiseSpeed = 0.01;
    if(increaseNoise){
        scene.remove(scene.getObjectByName('sphere'));
        noiseFactor += noiseSpeed;
        doSomethingCool();
    }
    else if(decreaseNoise){
        scene.remove(scene.getObjectByName('sphere'));
        noiseFactor -= noiseSpeed;
        doSomethingCool();
    }

    //Render the current scenes to the screen (clearDepth needed for z fighting issues)
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(scene2, camera);
}

// Handle keyboard presses.
function handleKeyDown(event) {
    switch (event.key) {
        // Render modes.
        case 'f': // f = face
            //Makes the cube completely transparent 
            cube.material.opacity = cube.material.opacity*-1;
            for(let i = 0; i < cubeMaterials.length; i++){
                cubeMaterials[i].opacity = cubeMaterials[i].opacity * -1;
            }
            break;
        case 'e': // e = edge
            cubeEdges.visible = !cubeEdges.visible;
            break;
        case 'v': // v = vertex
            cubeVertices.visible = !cubeVertices.visible;
            break;
        case 'x': //rotate cube about x
            rotateX = !rotateX;
            break;
        case 'y': //rotate cube about y
            rotateY = !rotateY;
            break;
        case 'z': //rotate cube about z
            rotateZ = !rotateZ;
            break;
        case 'r': //reset the scene
            resetScene();
            break;
        case '1': //longditudinal orbit
            longArcB = !longArcB;
            break;
        case '2': //latitudinal orbit
            arcBall = !arcBall;
            break;
        case '7': //spin the bunny !
            spinBunny = !spinBunny;
            break;
        case '8': //bunny edge mode
            bunnyEdges.visible = !bunnyEdges.visible;
            break;
        case '9': //bunny vertex mode
            bunnyVertices.visible = !bunnyVertices.visible;
            break;
        case '0': //bunny face mode
            bunny.children[0].material.visible = !bunny.children[0].material.visible;
            break;
        case '[': //decrease noise of sphere
            decreaseNoise = !decreaseNoise;
            break;
        case ']': //increase noise of sphere
            increaseNoise = !increaseNoise;
            break;
        case 'p': //watch sphere
            camera.position.set(-1.6919119976905441,  2.918938039062303, 4.730249299058569);
            break;
        case 'o': //watch cube
            camera.position.set(3, 4, 5);
            break;
        case 's':
            sphereMode = true;
            scene.remove(scene.getObjectByName('sphere'));
            doSomethingCool();
            scene.getObjectByName('sphere').position.set(100, 100, 100);
            camera.position.set(109.40197946403902,  112.53597261871869, 115.66996577339836);
            break;

    }

    //TASK 5: Translate the camera along its own axes
    const cameraSpeed = 0.05;
    switch(event.keyCode){
        case 37: //left arrow key
            camera.translateX(-cameraSpeed);
            break;
        case 39: //right arrow key
            camera.translateX(cameraSpeed);
            break;
        case 38: //up arrow key
            camera.translateY(cameraSpeed);
            break;
        case 40: //down arrow key
            camera.translateY(-cameraSpeed);
            break;
        case 188: //comma "," key
            camera.translateZ(cameraSpeed);
            break;
        case 190: //full stop "." key
            camera.translateZ(-cameraSpeed);
            break;
    }
}
