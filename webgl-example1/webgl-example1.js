main();

function main() {
  const canvas = document.querySelector('#glcanvas');
  const gl = canvas.getContext('webgl');
  if (!gl) {
    alert('当前浏览器不支持WebGL');
    return;
  }
  //vertexShader source
  const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main() {
      vColor = aVertexColor;
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    }
  `;
  //fragmentShader source
  const fsSource = `
    varying lowp vec4 vColor;

    void main() {
      gl_FragColor = vColor;
    }
  `;

  //init shaders
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);

  //init program
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  //init buffer
  //positionBuffer
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const vertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
  var positionData = [
    -2.0,  0.0,  -2.0, -2.0,   0.0,  0.0,   0.0, -2.0,//正方形
     0.0, -2.0,   0.0,  0.0,   1.0, -1.0,   1.0,  1.0,//右平行四边形
     1.0,  1.0,   0.0,  0.0,  -1.0,  1.0,  -2.0,  0.0,//上平行四边形
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionData), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vertexPosition);

  //colorBuffer
  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  const vertexColor = gl.getAttribLocation(program, 'aVertexColor');
  const color = [
    [1.0,0.0,0.0,1.0,], [0.0,1.0,0.0,1.0,], [0.0,0.0,1.0,1.0,],
  ];
  var colorData = [];
  for(i=0;i<color.length;i++) {
    for(j=0;j<4;j++) colorData = colorData.concat(color[i]);
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorData), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.vertexAttribPointer(vertexColor, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vertexColor);

  //indexBuffer
  var index = [
    0,1,2,1,2,3,
    4,5,6,5,6,7,
    8,9,10,9,10,11,
  ]
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);

  //draw
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const fieldOfView = 45 * Math.PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  const modelViewMatrix = mat4.create();
  mat4.translate(modelViewMatrix, modelViewMatrix, [-0.0, 0.0, -6.0]);

  gl.useProgram(program);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjectionMatrix'), false, projectionMatrix);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModelViewMatrix'), false, modelViewMatrix);

  gl.drawElements(gl.TRIANGLES, 18, gl.UNSIGNED_SHORT, 0);
}
