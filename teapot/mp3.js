// a fair amount of the code was sampled from the discussion files and 
// example files from the CS 418 website provided by Prof. Shaffer

var gl;
var canvas;

var shaderProgram;

// a place for the shaders
var shaderProgram1;
var shaderProgram2;

// Create a place to store the texture coords for the mesh
var tPotTCoordBuffer;
var cubeTCoordBuffer;

// Create a place to store vertex geometry
var cubeVertexBuffer;
var tPotVertexBuffer;

// Create a place to store the triangles
var cubeTriIndexBuffer;
var tPotTriIndexBuffer;

// create a place to store the normals
var tPotNormalBuffer;

// create a place to store the cubeMap 
var tPotCubeMap; 

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

//create normal matrix
var nMatrix = mat3.create();

/// model view matrix stack
var mvMatrixStack = [];

// holds pressed keys for input
var currentlyPressedKeys = {};

// location for flipping variables for color in shader 
var shonLoc;
var rfonLoc;

var rotMatLoc;

// View parameters
// camera location
var eyePt = vec3.fromValues(0.0, 1.5, 10.0);
var viewDir = vec3.fromValues(0.0,0.0,-0.4);
// up direction for the eye
var up = vec3.fromValues(0.0,1.0, 0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);
var axisToRot;

var UDAngle=0.0, eyeQuatUD = quat.create(),RLAngle = 0.0, eyeQuatLR=quat.create();

var mapped = false;
var switc = false;

// Create a place to store the texture for the cube
var tex0;
var tex1;
var tex2;
var tex3;
var tex4;
var tex5;

// storage for skybox images 
var cubeIm1;
var cubeIm2;
var cubeIm3;
var cubeIm4;
var cubeIm5;
var cubeIm6;

// light variables 
var Ia;
var Is;
var Id;

// create a place to store textures for the tPot
var cubeTexture;

// rotation matrix to pass to shader 
var rotMat = mat4.create(); 

// files for generating the tPot
var rawFile;
var allText;
var str;

// arrays to bind for the tPot
var vertNorm = []; 
var faceNorm = [];
var vert = [];
var fac = [];

// drawing flags
var drawpot = false;
var bufferbind = false;


// For animation 
var then =0;
var modelXRotationRadians = degToRad(0);
var modelYRotationRadians = degToRad(0);

/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.useProgram(shaderProgram);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.useProgram(shaderProgram);
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

/**
 * Sends projection matrix to shader
 */
function uploadNormalMatrixToShader() {
  gl.useProgram(shaderProgram);
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    gl.useProgram(shaderProgram);
    uploadModelViewMatrixToShader();
    uploadProjectionMatrixToShader();
        uploadNormalMatrixToShader();
}

/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

/**
 * Sets up the fragment and vertex shader for the cube 
 */
function setupShadersA() {
  vertexShader1 = loadShaderFromDOM("shader-vs");
  fragmentShader1 = loadShaderFromDOM("shader-fs");
  
  shaderProgram1 = gl.createProgram();
  gl.attachShader(shaderProgram1, vertexShader1);
  gl.attachShader(shaderProgram1, fragmentShader1);
  gl.linkProgram(shaderProgram1);

  if (!gl.getProgramParameter(shaderProgram1, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram1);
    
  shaderProgram1.texCoordAttribute = gl.getAttribLocation(shaderProgram1, "aTexCoord");
  console.log("1 Tex coord attrib: ", shaderProgram1.texCoordAttribute);
  gl.enableVertexAttribArray(shaderProgram1.texCoordAttribute);
    
  shaderProgram1.vertexPositionAttribute = gl.getAttribLocation(shaderProgram1, "aVertexPosition");
  console.log("1 Vertex attrib: ", shaderProgram1.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram1.vertexPositionAttribute);
    
  shaderProgram1.mvMatrixUniform = gl.getUniformLocation(shaderProgram1, "uMVMatrix");
  shaderProgram1.pMatrixUniform = gl.getUniformLocation(shaderProgram1, "uPMatrix");
}

/**
 * Setup the fragment and vertex shaders for the tPot
 */
function setupShadersB() {
  vertexShader2 = loadShaderFromDOM("shader-vs2");
  fragmentShader2 = loadShaderFromDOM("shader-fs2");
  
  shaderProgram2 = gl.createProgram();
  gl.attachShader(shaderProgram2, vertexShader2);
  gl.attachShader(shaderProgram2, fragmentShader2);
  gl.linkProgram(shaderProgram2);

  if (!gl.getProgramParameter(shaderProgram2, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram2);
    
  /*shaderProgram2.texCoordAttribute = gl.getAttribLocation(shaderProgram2, "aTexCoord");
  console.log("Tex coord attrib: ", shaderProgram2.texCoordAttribute);
  gl.enableVertexAttribArray(shaderProgram2.texCoordAttribute);*/
    
 shaderProgram2.vertexNormalAttribute = gl.getAttribLocation(shaderProgram2, "aVertexNormal2");
  console.log("2: Normal attrib: ", shaderProgram2.vertexNormalAttribute);
  gl.enableVertexAttribArray(shaderProgram2.vertexNormalAttribute);
    
  shaderProgram2.vertexPositionAttribute = gl.getAttribLocation(shaderProgram2, "aVertexPosition2");
  console.log("2: Vertex attrib: ", shaderProgram2.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram2.vertexPositionAttribute);
    
  shaderProgram2.mvMatrixUniform = gl.getUniformLocation(shaderProgram2, "uMVMatrix");
  shaderProgram2.pMatrixUniform = gl.getUniformLocation(shaderProgram2, "uPMatrix");
  shaderProgram2.nMatrixUniform = gl.getUniformLocation(shaderProgram2, "uNMatrix");

  shaderProgram2.rxMatrixUniform = gl.getUniformLocation(shaderProgram2, "rxMatrix");
  shaderProgram2.ryMatrixUniform = gl.getUniformLocation(shaderProgram2, "ryMatrix");
  shaderProgram2.rzMatrixUniform = gl.getUniformLocation(shaderProgram2, "rzMatrix");
    
  shaderProgram2.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram2, "uLightPosition");    
  shaderProgram2.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram2, "uAmbientLightColor");  
  shaderProgram2.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram2, "uDiffuseLightColor");
  shaderProgram2.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram2, "uSpecularLightColor");
    
  shaderProgram2.uniformAmbientMatColorLoc = gl.getUniformLocation(shaderProgram2, "uAmbientMatColor");  
  shaderProgram2.uniformDiffuseMatColorLoc = gl.getUniformLocation(shaderProgram2, "uDiffuseMatColor");
  shaderProgram2.uniformSpecularMatColorLoc = gl.getUniformLocation(shaderProgram2, "uSpecularMatColor");      
    
  shonLoc = gl.getUniformLocation(shaderProgram2, "shon");
  fronLoc = gl.getUniformLocation(shaderProgram2, "fron");
    
  rotMatLoc = gl.getUniformLocation(shaderProgram2, "rotMatrix");
  gl.uniform1i(shonLoc, 0);
  gl.uniform1i(fronLoc, 1);
}

/**
 * Uploads the lights to the shader 
 * @param {vec3} light position
 * @param {vec3} ambient light properties
 * @param {vec3} diffuse light properties
 * @param {vec3} specular light properties
 */
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram2.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram2.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram2.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram2.uniformSpecularLightColorLoc, s);
}

/**
 * Uploads the material properties to the shader 
 * @param {vec3} ambient prop properties
 * @param {vec3} diffuse prop properties
 * @param {vec3} specular prop properties
 */
function uploadMaterialToShader(a,d,s) {
  gl.uniform3fv(shaderProgram2.uniformAmbientMatColorLoc, a);
  gl.uniform3fv(shaderProgram2.uniformDiffuseMatColorLoc, d);
  gl.uniform3fv(shaderProgram2.uniformSpecularMatColorLoc, s);
}

/**
 * Draw call that applies matrix transformations to cube
 */
function draw() { 
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);
    
    vec3.add(viewPt, eyePt, viewDir);

    mat4.lookAt(mvMatrix,eyePt,viewPt,up);
    
    shaderProgram = shaderProgram2;
    gl.useProgram(shaderProgram2);
    
    gl.enableVertexAttribArray(shaderProgram.aVertexTextureCoords);
    
    // Set up light parameters
     Ia = vec3.fromValues(0.0,0.0,0.0);
     Id = vec3.fromValues(1.0,0.0,0.0);
     Is = vec3.fromValues(1.0,1,1.0);
    
    var lightPosEye4 = vec4.fromValues(0.0,10.0,50.0,1.0);
    lightPosEye4 = vec4.transformMat4(lightPosEye4,lightPosEye4,mvMatrix);
    //console.log(vec4.str(lightPosEye4))
    var lightPosEye = vec3.fromValues(lightPosEye4[0],lightPosEye4[1],lightPosEye4[2]);
 
    uploadLightsToShader(lightPosEye,Ia,Id,Is);
    
    var ka = vec3.fromValues(0.0,0.0,0.0);
    var kd = vec3.fromValues(1.0,0.6,0.0);
    var ks = vec3.fromValues(1.0,1.0,0.0);
    
    uploadMaterialToShader(ka,kd,ks);
     // Set up material parameters    

	//move to Earth position 
	mvPushMatrix();
	gl.enableVertexAttribArray(shaderProgram2.aVertexTextureCoords);
    vec3.set(transformVec, 0.0, 0, 0);
    
    // rotate world counter clockwise 
    if(currentlyPressedKeys[69]){
        //use matrix lib to rotate the view direction with quaternions
         axisToRot = vec3.fromValues(0.0,1.0,0.0);
        
        //create the quat
        quat.setAxisAngle(eyeQuatUD, axisToRot, degToRad(1.25));

        //apply the quat
        vec3.transformQuat(eyePt,eyePt,eyeQuatUD);    
        vec3.transformQuat(viewDir,viewDir,eyeQuatUD); 
        
                rotMat = mat4.rotateY(rotMat, rotMat, degToRad(1.25));
    gl.uniformMatrix4fv(rotMatLoc, false, rotMat);
    }

    // rotate world  clockwise
    if(currentlyPressedKeys[81]){
        axisToRot = vec3.fromValues(0.0,1.0,0.0);
        quat.setAxisAngle(eyeQuatUD, axisToRot, degToRad(-1.25));
        vec3.transformQuat(eyePt,eyePt,eyeQuatUD);    
        vec3.transformQuat(viewDir,viewDir,eyeQuatUD); 
        rotMat = mat4.rotateY(rotMat, rotMat, degToRad(-1.25));
    gl.uniformMatrix4fv(rotMatLoc, false, rotMat);
    }
    
    // rotate teapot counterclockwise 
    if(currentlyPressedKeys[68]){
        modelYRotationRadians += degToRad(1.25);
    }

    // rotate teapot clockwise 
    if(currentlyPressedKeys[65]){
        modelYRotationRadians += degToRad(-1.25);

    }
    
    // switches off the texture 
    if(currentlyPressedKeys[88]){
            switc = true;
    }
    
    // switches on the texture 
    if(currentlyPressedKeys[67]){
            switc = false;
    }
    
        gl.uniformMatrix4fv(rotMatLoc, false, rotMat);
    
    // texture check 
    if(switc == false){
            gl.useProgram(shaderProgram2);
            gl.uniform1i(shonLoc, 1);
            gl.uniform1i(fronLoc, 0);
        
             Ia = vec3.fromValues(0.0,0.0,0.0);
             Id = vec3.fromValues(0.0,0.0,0.0);
             Is = vec3.fromValues(0.0,0,0.0);
        
            uploadLightsToShader(lightPosEye,Ia,Id,Is);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, tPotCubeMap);
            gl.uniform1i(gl.getUniformLocation(shaderProgram2, "texMap"),1);
    }
    
    if(switc == true){
            gl.useProgram(shaderProgram2);
            gl.uniform1i(shonLoc, 0);
            gl.uniform1i(fronLoc, 1);
    }
    
    mat4.translate(mvMatrix, mvMatrix, transformVec);
    mat4.rotateY(mvMatrix,mvMatrix,modelYRotationRadians);

    setMatrixUniforms();  
     drawtPot();
    mvPopMatrix();

    mvPushMatrix();
    shaderProgram = shaderProgram1;
    gl.useProgram(shaderProgram1);
    vec3.set(transformVec, 0.0, 0, 0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    drawCube();
    mvPopMatrix(); 
}

/**
 * key being pressed down is true
 */
function handleKeyDown(event) {
currentlyPressedKeys[event.keyCode] = true;
}

/**
 * key being pressed down is false
 */
function handleKeyUp(event) {
currentlyPressedKeys[event.keyCode] = false;
}

/**
 * Animation to be called from tick. Updates global rotation values.
 */
function animate() {
    if (then==0)
    {
        then = Date.now();
    }
    else
    {
        now=Date.now();
        // Convert to seconds
        now *= 0.001;
        // Subtract the previous time from the current time
        var deltaTime = now - then;
        // Remember the current time for the next frame.
        then = now;

        //Animate the rotation
        modelXRotationRadians += 1.2 * 0;
        modelYRotationRadians += 0.7 * 0.005;  
    }
}

/**
 * Creates texture for application to cube.
 */
function setupTextures(img, tex, cubeImage) {
  tex = gl.createTexture();
 gl.bindTexture(gl.TEXTURE_2D, tex);
// Fill the texture with a 1x1 blue pixel.
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 255, 255]));

  cubeImage = new Image();
  cubeImage.onload = function() { handleTextureLoaded(cubeImage, tex); }
  cubeImage.src = img;
  
  return tex;
}

/**
 * Creates a context for WebGL
 * @return {image} image to bind to texture
  * @return {texture} texture to bind to
 */
function handleTextureLoaded(image, texture) {
  console.log("handleTextureLoaded, image = " + image);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  // Check if the image is a power of 2 in both dimensions.
  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
     // Yes, it's a power of 2. Generate mips.
     gl.generateMipmap(gl.TEXTURE_2D);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
     console.log("Loaded power of 2 texture");
  } else {
     // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     console.log("Loaded non-power of 2 texture");
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

/**
 * @param {number} value Value to determine whether it is a power of 2
 * @return {boolean} Boolean of whether value is a power of 2
 */
function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

/**
 * Sets up the buffers for the teapot
 */
function setupTeapotBuffers(){
//192 verticies
//object teapot
//g teapot
//1202 lines ? 
    readTextFile("teapot_0.obj", callback);
}

/**
 * @param {obj file} file to pass in
  * @param {function} function to call once loaded file 
 */
function readTextFile(file, callbackFunction){
    console.log("reading "+ file);
    rawFile = new XMLHttpRequest();
    allText = [];
    rawFile.open("GET", file, true);
    
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                 callbackFunction(rawFile.responseText);
                
                 console.log("Got text file!");
            }
        }
    }
    rawFile.send(null);
}

/**
 * @param {string} string from the obj file 
 * Also creates the various buffers for the teapot
 */
function callback(st){
    var ar = [];

    var res = st.split("\n");
    
   for (var i = 0; i < res.length; i++) {
           var sub = res[i].split(" ");
            for (var j = 0; j < sub.length; j++){
                ar.push(sub[j]);
            }
       }
    
  // creating the vertex buffer ...
  tPotVertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tPotVertexBuffer);

    for (var k = 0; k < ar.length; k++){
      //  console.log(ar[k]);
        if (ar[k] == "v"){
            for (i = 1; i < 4; i++){            
                vert.push(parseFloat(ar[k+i]));
            }
            k += 3;
        }
    }
  
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vert), gl.STATIC_DRAW);
  tPotVertexBuffer.itemSize = 3;
  tPotVertexBuffer.numberOfItems = 3606;

  // creating the index buffer ... 
  tPotTriIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tPotTriIndexBuffer);
    
    for (var k = 0; k < ar.length; k++){
      //  console.log(ar[k]);
        if (ar[k] == "f"){
            for (j = 1; j < 4; j++){      
                fac.push(parseFloat(ar[k+j+1] - 1));
            }
            k += 3;
        }
    }
    
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fac), gl.STATIC_DRAW);
  tPotTriIndexBuffer.itemSize = 1;
  tPotTriIndexBuffer.numberOfItems = 6768;   
        
  // temp values for vertex norms 
    for (var i = 0; i < 3606; i++){
        vertNorm.push(0);
    }
    
  // calculate the vertex normals ... 
  tPotNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tPotNormalBuffer);    
    
    //cross product calculations 
    for (var i = 0; i < 2256; i++){
        //x0 
        var x_0 = fac[3*i];
        var x0x = vert[3*x_0];
        var x0y = vert[3*x_0 + 1];
        var x0z = vert[3*x_0 + 2 ];

        //x1
        var x_1 = fac[3*i + 1];
        var x1x = vert[3*x_1];
        var x1y = vert[3*x_1 + 1];
        var x1z = vert[3*x_1 + 2];
        
        //x2
        var x_2 = fac[3*i + 2];
        var x2x = vert[3*x_2];
        var x2y = vert[3*x_2 + 1];
        var x2z = vert[3*x_2 + 2];

        var Ax = x1x - x0x;
        var Ay = x1y - x0y;
        var Az = x1z - x0z;
        
        var Bx = x2x - x0x;
        var By = x2y - x0y;
        var Bz = x2z - x0z;
        
        var x_c = Ay*Bz - Az*By;
        var y_c = Az*Bx - Ax*Bz;
        var z_c = Ax*By - Ay*Bx;
        
        // normalize the face normals ... 
        var len = Math.sqrt(x_c*x_c + y_c*y_c + z_c*z_c);
        
        x_c = x_c / len;
        y_c = y_c / len;
        z_c = z_c / len;
        
        faceNorm.push(x_c);
        faceNorm.push(y_c);
        faceNorm.push(z_c);
        //console.log("next");
        
        // push face normals also into vertex normals 
        vertNorm[3*x_0] += x_c;
        vertNorm[3*x_0 + 1] += y_c;
        vertNorm[3*x_0 + 2] += z_c;
        
        vertNorm[3*x_1] += x_c;
        vertNorm[3*x_1 + 1] += y_c;
        vertNorm[3*x_1 + 2] += z_c;
        
        vertNorm[3*x_2] += x_c;
        vertNorm[3*x_2 + 1] += y_c;
        vertNorm[3*x_2 + 2] += z_c;
    }
    
    // normalize vertexNormals 
    for (i = 0; i < 1202; i++){
        var x = vertNorm[3*i];
        var y = vertNorm[3*i + 1];
        var z = vertNorm[3*i + 2];
        
        var len = Math.sqrt(x*x + y*y + z*z) ;
        
        vertNorm[3*i] = x / len;
        vertNorm[3*i + 1] = y / len;
        vertNorm[3*i + 2] = z / len;
    }
    
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertNorm), gl.STATIC_DRAW);
    tPotNormalBuffer.itemSize = 3;
    tPotNormalBuffer.numberOfItems = 3606;
    
    console.log("faceNorm length: ", faceNorm.length);
    console.log("Number of face norms: ", faceNorm.length / 3);
    
    console.log("Vertex Normals Length:", vertNorm.length);


  console.log("teapot bound");
  drawpot = true;
    
  bufferbind = true;
  console.log("tick");

  texturetPot();
    
    if (mapped == true){
          setupShadersA();
          setupCubeBuffers(); 
    }
    
  tick();
}

/**
 * Draws the teapot
 */
function drawtPot(){
  // Will only draw if the flags are fulfilled 
    if ((drawpot == true) && (bufferbind == true)){
       gl.useProgram(shaderProgram2);
        
       gl.bindBuffer(gl.ARRAY_BUFFER, tPotNormalBuffer);
       gl.vertexAttribPointer(shaderProgram2.vertexNormalAttribute, tPotVertexBuffer.itemSize, gl.FLOAT, false, 0, 0); 
  
       gl.bindBuffer(gl.ARRAY_BUFFER, tPotVertexBuffer);
       gl.vertexAttribPointer(shaderProgram2.vertexPositionAttribute, tPotVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
         
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tPotTriIndexBuffer);
       
        gl.drawElements(gl.TRIANGLES, 6768, gl.UNSIGNED_SHORT, 0);
    }
    else{
        console.log("not drawing");
        return;
    }
}

/**
 * sets up the buffers for the cube
 */
function setupCubeBuffers() {

  // Create a buffer for the cube's vertices.

  cubeVertexBuffer = gl.createBuffer();

  // Select the cubeVerticesBuffer as the one to apply vertex
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);

  // Now create an array of vertices for the cube.
var a = 30.0; 
  var vertices = [
    // Front face
     a,   a,   a,
     a,   a,  -a,
     a,  -a,  -a,
     a,  -a,   a,
    
    

    // Back face
    -a,   a,  -a,
    -a,   a,   a,
    -a,  -a,   a,
    -a,  -a,  -a,
    

    // Top face
    -a, a, -a,
     a, a, -a,
     a, a,  a,
    -a, a,  a,

    // Bottom face
    -a, -a,   a,
     a, -a,   a,
     a, -a,  -a,
    -a, -a,  -a,

    // Right face
     -a,  a,  a,
     a,   a,  a,
     a,  -a,  a,
     -a, -a,  a,

    // Left face
      a,  a,  -a,
     -a,  a,  -a,
     -a, -a,  -a,
      a, -a,  -a
  ];

  // Now pass the list of vertices into WebGL to build the shape. We
  // do this by creating a Float32Array from the JavaScript array,
  // then use it to fill the current vertex buffer.

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // Map the texture onto the cube's faces.

  cubeTCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);

  var textureCoordinates = [
    // Front
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Back
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Top
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Bottom
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Right
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Left
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                gl.STATIC_DRAW);

  // Build the element array buffer; this specifies the indices
  // into the vertex array for each face's vertices.

  cubeTriIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  var cubeVertexIndices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ]

  // Now send the element array to GL

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);

}

/**
 * Draws the cube
 */
function drawCube(){
  // Draw the cube by binding the array buffer to the cube's vertices
  // array, setting attributes, and pushing it to GL.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
  gl.vertexAttribPointer(shaderProgram1.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

  // Set the texture coordinates attribute for the vertices.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);
  gl.vertexAttribPointer(shaderProgram1.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);

  // Specify the texture to map onto the faces.
              
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex0);
  gl.uniform1i(gl.getUniformLocation(shaderProgram1, "uSampler"), 0);
    
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);


  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex1);
  gl.uniform1i(gl.getUniformLocation(shaderProgram1, "uSampler"), 0); 
    
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 12);

    
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex2);
  gl.uniform1i(gl.getUniformLocation(shaderProgram1, "uSampler"), 0); 
    
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 24);
    
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex3);
  gl.uniform1i(gl.getUniformLocation(shaderProgram1, "uSampler"), 0); 
    
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 36);
    
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex4);
  gl.uniform1i(gl.getUniformLocation(shaderProgram1, "uSampler"), 0); 
    
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 48);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex5);
  gl.uniform1i(gl.getUniformLocation(shaderProgram1, "uSampler"), 0); 
    
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
    
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 60);
}

// function and most of code taken from Discussion 5 
function texturetPot() {
	tPotCubeMap = gl.createTexture();
    
    gl.useProgram(shaderProgram2);
    
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, tPotCubeMap);
	gl.texImage2D(gl.TEXTURE_CUBE_MAP, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
    
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
	loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_X, tPotCubeMap, "pos-x.png");  
	loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_X, tPotCubeMap, "neg-x.png"); 
	loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Y, tPotCubeMap, "pos-y.png");  
	loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, tPotCubeMap, "neg-y.png");  
	loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_POSITIVE_Z, tPotCubeMap, "pos-z.png");  
	loadCubeMapFace(gl, gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, tPotCubeMap, "neg-z.png"); 
    
gl.activeTexture( gl.TEXTURE1 );
gl.uniform1i(gl.getUniformLocation(shaderProgram2, "texMap"),1);
    
    mapped = true;
}

function loadCubeMapFace(gl, target, texture, url){
	var image = new Image();
	image.onload = function()
	{
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
		gl.texImage2D(target,0,gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	}
	image.src = url;
}

/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
     
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  console.log(rotMat);
  gl.enable(gl.DEPTH_TEST);
     
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
     
  // textures for the skybox..
  tex0 = setupTextures("pos-x.png", tex0, cubeIm1);
  tex1 = setupTextures("neg-x.png", tex1, cubeIm2);
  tex2 = setupTextures("pos-y.png", tex2, cubeIm3);   
  tex3 = setupTextures("neg-y.png", tex3, cubeIm4);
  tex4 = setupTextures("pos-z.png", tex4, cubeIm5);
  tex5 = setupTextures("neg-z.png", tex5, cubeIm6);  
     
  setupShadersB();
  setupTeapotBuffers();
}

/**
 * Tick called for every animation frame.
 */
function tick() {
    requestAnimFrame(tick);
    draw();
    // animate();
}
