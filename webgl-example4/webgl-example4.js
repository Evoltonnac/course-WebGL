var glVariables = {};
init();
main();
//
// Init listeners and variables
//
function init() {
  canvas = document.querySelector('#glcanvas');

  glVariables.eye = [-20.0, 0.0, 0.0];
  glVariables.front = [1.0, 0.0, 0.0];
  glVariables.up = [0.0, 1.0, 0.0];

  //注册一个事件响应的函数【鼠标移动控制】
  glVariables.dragging = false;
  glVariables.currentAngle = [0.0, 0.0];
  var lastX = -1, lastY = -1;
  canvas.addEventListener('mousedown', handleMouseDown, false);
  canvas.addEventListener('mousemove', handleMouseMove, false);
  canvas.addEventListener('mouseup', handleMouseUp, false);

  //注册一个事件响应的函数【键盘按住控制】
  glVariables.Moving = false;
  document.addEventListener('keydown', handleKeyDown, false);
  document.addEventListener('keypress', handleKeyPress, false);
  document.addEventListener('keyup', handleKeyUp, false);

  glVariables.cubeRotation = 0.0;
}

//
// Start here
//
function main() {
  alert('加载材质存在跨域访问的问题，Chrome可能无法显示，Firefox应该可以显示！！！！！');
  const gl = canvas.getContext('webgl');

  // If we don't have a GL context, give up now

  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  const vsSource_sun = `
    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uMatrix;
    uniform mat4 uModelMatrix;

    varying highp vec2 vTextureCoord;

    void main(void) {
      vTextureCoord = aTextureCoord;
      gl_Position = uProjectionMatrix * uMatrix * uModelMatrix * aVertexPosition;
    }
  `;

  const fsSource_sun = `
    uniform sampler2D uSampler;

    varying highp vec2 vTextureCoord;

    void main(void) {
      gl_FragColor = texture2D(uSampler, vTextureCoord);
    }
  `;
  // Vertex shader program
  const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec2 aTextureCoord;

    uniform mat4 uProjectionMatrix;
    uniform mat4 uMatrix;
    uniform mat4 uModelMatrix;

    varying highp vec2 vTextureCoord;
    varying highp vec3 vPosition;
    varying highp vec3 vNormal;

    void main(void) {
      vTextureCoord = aTextureCoord;
      vPosition = vec3(uModelMatrix * aVertexPosition);
      vNormal = aVertexNormal;
      gl_Position = uProjectionMatrix * uMatrix * uModelMatrix * aVertexPosition;
    }
  `;

  // Fragment shader program

  const fsSource = `
    precision mediump float;


    struct Light {
      vec3 position;

      vec3 ambient;
      vec3 diffuse;
      vec3 specular;
    };
    struct Material {
      float shininess;
      sampler2D diffuse;
      sampler2D specular;
      sampler2D li;
    };

    uniform vec3 eyePosition;
    uniform Light light;
    uniform Material material;

    varying highp vec2 vTextureCoord;
    varying highp vec3 vPosition;
    varying highp vec3 vNormal;

    void main(void) {
      // ambient
      highp vec3 ambient = light.ambient * texture2D(material.diffuse, vTextureCoord).rgb;

      //highp vec3 ambient = light.ambient * mix(texture2D(material.li, vTextureCoord), mix(texture2D(material.diffuse,vTextureCoord),texture2D(material.specular, vTextureCoord),0.5),0.1).rgb;

      // diffuse
      highp vec3 norm = normalize(vNormal);
      highp vec3 lightDir = normalize(light.position - vPosition);
      highp float diff = max(dot(norm, lightDir), 0.0);
      highp vec3 diffuse = light.diffuse * diff * texture2D(material.diffuse, vTextureCoord).rgb;

      //highp vec3 diffuse = light.diffuse * diff * mix(texture2D(material.diffuse, vTextureCoord), mix(texture2D(material.specular,vTextureCoord),texture2D(material.li, vTextureCoord),0.1),0.5).rgb - (2.0 * light.diffuse * diff * texture2D(material.li, vTextureCoord).rgb);

      // specular
      highp vec3 viewDir = normalize(eyePosition - vPosition);
      highp vec3 reflectDir = reflect(-lightDir, norm);
      highp float spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
      highp vec3 specular = light.specular * spec * texture2D(material.specular, vTextureCoord).rgb;

      //highp vec3 specular = light.specular * spec * mix(texture2D(material.diffuse, vTextureCoord), mix(texture2D(material.li,vTextureCoord),texture2D(material.specular, vTextureCoord),0.5),0.3).rgb;

      highp vec3 result = ambient + diffuse + specular;
      gl_FragColor = vec4(result, 1.0);
    }
  `;

  // Initialize a shader program; this is where all the lighting
  // for the vertices and so forth is established.
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  const sunProgram = initShaderProgram(gl, vsSource_sun, fsSource_sun);
  // Collect all the info needed to use the shader program.
  // Look up which attributes our shader program is using
  // for aVertexPosition, aTextureCoord and also
  // look up uniform locations.
  const programInfo = {
    sun: sunProgram,
    program: shaderProgram,
    attribLocations: {
      textureCoord_sun: gl.getAttribLocation(sunProgram, 'aTextureCoord'),
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
      textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
    },
    uniformLocations: {
      projectionMatrix_sun: gl.getUniformLocation(sunProgram, 'uProjectionMatrix'),
      viewMatrix_sun: gl.getUniformLocation(sunProgram, 'uMatrix'),
      modelMatrix_sun: gl.getUniformLocation(sunProgram, 'uModelMatrix'),
      sampler_sun: gl.getUniformLocation(sunProgram, 'uSampler'),
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      viewMatrix: gl.getUniformLocation(shaderProgram, 'uMatrix'),
      modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
      eyePosition: gl.getUniformLocation(shaderProgram, 'eyePosition'),
      material_shininess: gl.getUniformLocation(shaderProgram, 'material.shininess'),
      material_diffuse: gl.getUniformLocation(shaderProgram, 'material.diffuse'),
      material_specular: gl.getUniformLocation(shaderProgram, 'material.specular'),
      material_li: gl.getUniformLocation(shaderProgram, 'material.li'),
      light_position: gl.getUniformLocation(shaderProgram, 'light.position'),
      light_ambient: gl.getUniformLocation(shaderProgram, 'light.ambient'),
      light_diffuse: gl.getUniformLocation(shaderProgram, 'light.diffuse'),
      light_specular: gl.getUniformLocation(shaderProgram, 'light.specular'),
    },
  };
  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const buffers = initBuffers(gl);

  const texture = [];
  texture.push(loadTexture(gl, '8k_earth_daymap.jpg'));
  texture.push(loadTexture(gl, '8k_earth_clouds.jpg'));
  texture.push(loadTexture(gl, '8k_earth_nightmap.jpg'));
  texture.push(loadTexture(gl, '8k_moon.jpg'));
  texture.push(loadTexture(gl, '8k_sun.jpg'));

  var then = 0;

  // Draw the scene repeatedly
  function render(now) {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    drawScene(gl, programInfo, buffers, texture, deltaTime);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple three-dimensional glVariables.cube.
//
function initBuffers(gl) {
  var latitudeBands = 50;//纬度带
  var longitudeBands = 50;//经度带
  var positions = [];//存储x，y，z坐标
  var normals = [];//存储x，y，z坐标
  var textureCoordData = [];//存储纹理坐标u，v，纹理坐标与顶点坐标一一对应
  var indices = [];//三角形列表（索引值）

  for(var latNum = 0; latNum <= latitudeBands; latNum++){
      var lat = latNum * Math.PI / latitudeBands;//纬度范围从-π/2到π/2
      var sinLat = Math.sin(lat);
      var cosLat = Math.cos(lat);

      for(var longNum = 0; longNum <= longitudeBands; longNum++){
          var lon = longNum * 2 * Math.PI / longitudeBands;//经度范围从-π到π
          var sinLon = Math.sin(lon);
          var cosLon = Math.cos(lon);

          var x = sinLat * cosLon;
          var y = cosLat;
          var z = sinLat * sinLon;
          var u = (longNum / longitudeBands);
          var v = (latNum / latitudeBands);

          positions.push(x);
          positions.push(y);
          positions.push(z);
          textureCoordData.push(u);
          textureCoordData.push(v);
          normals.push(x);
          normals.push(y);
          normals.push(z);
      }
  }
  for(var latNum = 0; latNum < latitudeBands; latNum++){
      for(var longNum = 0; longNum < longitudeBands; longNum++){
          var first = latNum * (longitudeBands + 1) + longNum;
          var second = first + longitudeBands + 1;

          indices.push(first);
          indices.push(first + 1);
          indices.push(second);

          indices.push(second);
          indices.push(second + 1);
          indices.push(first + 1);
      }
  }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  return {
    position: positionBuffer,
    normal: normalBuffer,
    textureCoord: textureCoordBuffer,
    indices: indexBuffer,
    indicesCount: indices.length,
  };
}

//
// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.
//
function loadTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because images have to be download over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]);  // opaque blue
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                pixel);

  const image = new Image();
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  srcFormat, srcType, image);

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
       // Yes, it's a power of 2. Generate mips.
       gl.generateMipmap(gl.TEXTURE_2D);
    } else {
       // No, it's not a power of 2. Turn of mips and set
       // wrapping to clamp to edge
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  image.src = url;

  return texture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

//
// Draw the scene.
//
function drawScene(gl, programInfo, buffers, texture, deltaTime) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Clear the canvas before we start drawing on it.

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create a perspective matrix, a special matrix that is
  // used to simulate the distortion of perspective in a camera.
  // Our field of view is 45 degrees, with a width/height
  // ratio that matches the display size of the canvas
  // and we only want to see objects between 0.1 units
  // and 100 units away from the camera.

  const fieldOf = 45 * Math.PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 400.0;
  const projectionMatrix = mat4.create();

  // note: glmatrix.js always has the first argument
  // as the destination to receive the result.
  mat4.perspective(projectionMatrix,
                   fieldOf,
                   aspect,
                   zNear,
                   zFar);

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  const viewMatrix = mat4.create();

  var center = vec3.create();
  vec3.add(center, glVariables.eye, glVariables.front);

  mat4.lookAt(viewMatrix,
              glVariables.eye,
              center,
              glVariables.up);


  // Now move the drawing position a bit to where we want to
  // start drawing the square.
  const modelMatrix = mat4.create();
  //sun
  const modelMatrix_sun = mat4.create();
  //
  const modelMatrix_1 = mat4.create();
  //earth
  const modelMatrix_2 = mat4.create();
  //moon
  const modelMatrix_3 = mat4.create();

  //sun's matrix
  mat4.scale(modelMatrix_sun,  // destination matrix
             modelMatrix,  // matrix to rotate
             [10.0, 10.0, 10.0]);  // the vec3 to scale the matrix by
  //2's matrix
  mat4.rotate(modelMatrix_2,  // destination matrix
              modelMatrix,  // matrix to rotate
              glVariables.cubeRotation * 0.3,     // amount to rotate in radians
              [0, 1, 0]);       // axis to rotate around X
  mat4.translate(modelMatrix_2,  // destination matrix
                 modelMatrix_2,  // matrix to translate
                 [50.0, 0.0, 0.0]);  // amount to translate
   //3's matrix
   mat4.rotate(modelMatrix_3,  // destination matrix
               modelMatrix_2,  // matrix to rotate
               glVariables.cubeRotation,     // amount to rotate in radians
               [0, 1, 0]);       // axis to rotate around Z
   mat4.translate(modelMatrix_3,  // destination matrix
                  modelMatrix_3,  // matrix to translate
                  [10.0, 0.0, 0.0]);  // amount to translate
   mat4.rotate(modelMatrix_3,  // destination matrix
               modelMatrix_3,  // matrix to rotate
               glVariables.cubeRotation * 5,     // amount to rotate in radians
               [0, 1, 0]);       // axis to rotate around Y
   mat4.scale(modelMatrix_3,  // destination matrix
              modelMatrix_3,  // matrix to rotate
              [3.0, 3.0, 3.0]);  // the vec3 to scale the matrix by
  mat4.rotate(modelMatrix_2,  // destination matrix
              modelMatrix_2,  // matrix to rotate
              glVariables.cubeRotation,     // amount to rotate in radians
              [0, 1, 0]);
  mat4.scale(modelMatrix_2,  // destination matrix
             modelMatrix_2,  // matrix to rotate
             [5.0, 5.0, 5.0]);  // the vec3 to scale the matrix by


  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute
  {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexPosition);
  }

  const normalMatrix = mat4.create();
  mat4.invert(normalMatrix, viewMatrix);
  mat4.transpose(normalMatrix, normalMatrix);

  // Tell WebGL how to pull out the normals from
  // the normal buffer into the vertexNormal attribute.
  {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexNormal,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexNormal);
  }

  // Tell WebGL how to pull out the texture coordinates from
  // the texture coordinate buffer into the textureCoord attribute.
  {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
    gl.vertexAttribPointer(
        programInfo.attribLocations.textureCoord,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.textureCoord);
    gl.vertexAttribPointer(
      programInfo.attribLocations.textureCoord_sun,
      numComponents,
      type,
      normalize,
      stride,
      offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.textureCoord_sun);
  }

  // Tell WebGL which indices to use to index the vertices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

  // Tell WebGL to use our program when drawing

  gl.useProgram(programInfo.program);


  // Set the shader uniforms
  gl.uniform3fv(programInfo.uniformLocations.light_position, [0.0, 0.0, 0.0]);

  gl.uniform3fv(programInfo.uniformLocations.light_ambient, [0.2, 0.2, 0.2]);

  gl.uniform3fv(programInfo.uniformLocations.light_diffuse, [0.5, 0.5, 0.5]);

  gl.uniform3fv(programInfo.uniformLocations.light_specular, [1.0, 1.0, 1.0]);

  gl.uniform3fv(programInfo.uniformLocations.eyePosition, glVariables.eye);

  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix);

  gl.uniformMatrix4fv(
    programInfo.uniformLocations.viewMatrix,
    false,
    viewMatrix);

  gl.uniformMatrix4fv(
    programInfo.uniformLocations.normalMatrix,
    false,
    normalMatrix);

  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelMatrix,
    false,
    modelMatrix_2);
  // Tell the shader we bound the texture to texture unit 0
  gl.uniform1f(programInfo.uniformLocations.material_shininess, 32.0);
  gl.uniform1i(programInfo.uniformLocations.material_diffuse, 0);
  gl.uniform1i(programInfo.uniformLocations.material_specular, 1);
  gl.uniform1i(programInfo.uniformLocations.material_li, 2);

  // Specify the texture to map onto the faces.
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture[0]);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texture[1]);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, texture[2]);

  {
    const vertexCount = buffers.indicesCount;
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }

  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelMatrix,
    false,
    modelMatrix_3);
  // Tell the shader we bound the texture to texture unit 0
  gl.uniform1f(programInfo.uniformLocations.material_shininess, 32.0);
  gl.uniform1i(programInfo.uniformLocations.material_diffuse, 0);
  gl.uniform1i(programInfo.uniformLocations.material_specular, 1);
  gl.uniform1i(programInfo.uniformLocations.material_li, 2);

  // Specify the texture to map onto the faces.
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture[3]);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texture[3]);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, texture[3]);

  {
    const vertexCount = buffers.indicesCount;
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }

  //render sun
  gl.useProgram(programInfo.sun);

  gl.uniform1i(programInfo.uniformLocations.sampler_sun, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture[4]);

  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix_sun,
    false,
    projectionMatrix);

  gl.uniformMatrix4fv(
    programInfo.uniformLocations.viewMatrix_sun,
    false,
    viewMatrix);

  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelMatrix_sun,
    false,
    modelMatrix_sun);

  {
    const vertexCount = buffers.indicesCount;
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;
    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }
  // Update the rotation for the next draw

  glVariables.cubeRotation += deltaTime;
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}



/**
    CAMERA
*/

function handleMouseDown(ev) {var x = ev.clientX, y = ev.clientY;
  // Start dragging if a moue is in <canvas>
  var rect = ev.target.getBoundingClientRect();
  if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
    lastX = x; lastY = y;
    glVariables.dragging = true;
  }
}
function handleMouseMove(ev) {var x = ev.clientX, y = ev.clientY;
  if (glVariables.dragging) {
    var factor_x = Math.PI/canvas.width; // The rotation ratio
    var factor_y = Math.PI/canvas.height; // The rotation ratio
    var dx = factor_x * (lastX - x);
    var dy = -factor_y * (lastY - y);
    // Limit x-axis rotation angle to -90 to 90 degrees
    glVariables.currentAngle[0] = glVariables.currentAngle[0] + dx;
    glVariables.currentAngle[1] = Math.max(Math.min(glVariables.currentAngle[1] + dy, Math.PI/2), -Math.PI/2);
    // console.log(glVariables.currentAngle);

    glVariables.front[0] = Math.cos(glVariables.currentAngle[0]) * Math.cos(glVariables.currentAngle[1]);
    glVariables.front[1] = Math.sin(glVariables.currentAngle[1]);
    glVariables.front[2] = Math.sin(glVariables.currentAngle[0]) * Math.cos(glVariables.currentAngle[1]);
    vec3.normalize(glVariables.front, glVariables.front);

    var right = vec3.create();
    vec3.cross(right, glVariables.front, [0.0, 1.0, 0.0]);
    vec3.normalize(right, right);
    vec3.cross(glVariables.up, right, glVariables.front);
    vec3.normalize(glVariables.up, glVariables.up);
  }
  lastX = x, lastY = y;
}
function handleMouseUp(ev) {glVariables.dragging = false;}

function handleKeyDown(ev) {glVariables.moving = true;}
function handleKeyPress(ev) {
  if (glVariables.moving) {
    switch (ev.key) {
      case "w":
        vec3.add(glVariables.eye, glVariables.eye, glVariables.front);
        break;
      case "s":
        var negateFront = vec3.create();
        vec3.negate(negateFront, glVariables.front)
        vec3.add(glVariables.eye, glVariables.eye, negateFront);
        break;
      case "d":
        var right = vec3.create();
        vec3.cross(right, glVariables.front, [0.0, 1.0, 0.0]);
        vec3.add(glVariables.eye, glVariables.eye, right);
        break;
      case "a":
        var left = vec3.create();
        vec3.cross(left, glVariables.front, [0.0, -1.0, 0.0]);
        vec3.add(glVariables.eye, glVariables.eye, left);
        break;
      default:
        break;
    }
  }
}
function handleKeyUp(ev) {glVariables.moving = false;}
