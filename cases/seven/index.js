var scene, camera, renderer, orbit;

var radius = 22;


function initScene() {

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    // camera.position.x = 33;
    camera.position.z = 37;
    // camera.position.y = -33;

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // renderer.setClearColor('#fefefe', 1);
    document.body.appendChild(renderer.domElement);

    orbit = new THREE.OrbitControls(camera, renderer.domElement);

    window.addEventListener('resize', function () {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

    }, false);
}

var createGeometry = function (radialSegments, segments) {
    var height = 10;
    var size = 1;
    var geometry = new THREE.CylinderGeometry(size, size, height, radialSegments, segments, 0);

    var curve = new THREE.CubicBezierCurve3(
        v3(0, 0),
        v3(1, 0),
        v3(0, 1),
        v3(0, 1)
    );

    var steps = curve.getPoints(segments);
    var ln = geometry.vertices.length;

    geometry.computeBoundingBox();
    var height = geometry.boundingBox.max.y - geometry.boundingBox.min.y;

    for (var i = 0; i < ln; i++) {

        var vertex = geometry.vertices[i];

        // Taper with bezier curve

        var yPosition = Math.abs((geometry.vertices[i].y - geometry.boundingBox.max.y) / height);
        var pos = steps[Math.round(yPosition * segments)];

        vertex.y = height * pos.y;

        vertex.lerp(
            new THREE.Vector3(0, vertex.y, 0),
            1 - pos.x
        );
    }

    geometry.mergeVertices();
    geometry.computeFaceNormals();
    // geometry.computeVertexNormals();

    return geometry;
};

var createBones = function (num) {
    var bones = [];
    for (var i = 0; i <= num; i++) {
        var bone = new THREE.Bone();
        if (i !== 0) {
            bones[i - 1].add(bone);
        }
        bones.push(bone);
    }
    return bones;
};

var addBones = function (geometry, bones) {
    geometry.computeBoundingBox();

    var ln = geometry.vertices.length;
    var height = geometry.boundingBox.max.y - geometry.boundingBox.min.y;

    for (var i = 0; i < ln; i++) {
        var position = Math.abs((geometry.vertices[i].y - geometry.boundingBox.max.y) / height);
        var bonePosition = position * (bones.length - 1);
        var skinIndex = Math.floor(bonePosition);
        var skinWeight = bonePosition % 1;

        // Ease between each bone
        geometry.skinIndices.push(new THREE.Vector4(skinIndex, skinIndex + 1, 0, 0));
        geometry.skinWeights.push(new THREE.Vector4(1 - skinWeight, skinWeight, 0, 0));
    }

    for (var i = 0; i < bones.length; i++) {
        if (i == 0) {
            bones[i].position.y = geometry.boundingBox.max.y;
        } else {
            bones[i].position.y = (height / (bones.length - 1)) * -1;
        }
    }
};

var createMesh = function (geometry, bones, materialProps) {
    materialProps.skinning = true;
    var material = new THREE.MeshPhongMaterial(materialProps);
    var mesh = new THREE.SkinnedMesh(geometry, material);

    var skeleton = new THREE.Skeleton(bones);
    var rootBone = skeleton.bones[0];
    mesh.add(rootBone);
    mesh.bind(skeleton);

    skeleton.calculateInverses();

    return mesh;
};


var textureOrange = new THREE.TextureLoader().load("sn-orange.png");
textureOrange.wrapS = THREE.RepeatWrapping;
textureOrange.wrapT = THREE.RepeatWrapping;
textureOrange.repeat.set(1, 11);

var textureGreen = new THREE.TextureLoader().load("sn-green.png");
textureGreen.wrapS = THREE.RepeatWrapping;
textureGreen.wrapT = THREE.RepeatWrapping;
textureGreen.repeat.set(1, 11);

var textureBump = new THREE.TextureLoader().load("sn-bump.png");
textureBump.wrapS = THREE.RepeatWrapping;
textureBump.wrapT = THREE.RepeatWrapping;
textureBump.repeat.set(1, 11);

var lines_visible;

// lines_visible = true;

function render() {

    requestAnimationFrame(render);

    lots.forEach(o => {
        // var shift = o.sp / 50;
        // o.parent.rotation.y += shift * (o.i % 2 ? 1 : -1);
        morph(o);
    });

    scene.rotation.x -= .0013;
    scene.rotation.y += .0006;
    scene.rotation.z += .0005;

    renderer.render(scene, camera);

};

initScene();


var lots = [];

for (let i = 0, l = 7; i < l; i++) {
    lots.push(newO({
        i: i,
        l: l,
        rot: Math.PI * 2 * i / l,
        // rotx: 2,
        sp: .06,
        // sp: .9 * (1 - i / l),
        sc: .11 * i + .9,
        // sc: 2,
        len: .15,//.07 * i + .1,
    }));
}

function newO(props) {
    var i = props.i;
    var total = 100,
        start = 0;//total / (i + 1);
    var radialSegments = 11;
    var segments = 80;
    var geometry = createGeometry(radialSegments, segments);
    var bones = createBones(Math.floor(segments / 1));
    var sc = props.sc;

    geometry.scale(sc, 1, sc);

    addBones(geometry, bones);

    var mesh = createMesh(geometry, bones, {
        map: i % 2 ? textureOrange : textureGreen,
        bumpMap: textureOrange,
        bumpScale: .25,
        side: THREE.FrontSide,
        // wireframe: true,
        // transparent: true,
        specular: '#111',
        color: '#999',
        shininess: 25,
    });

    var curve = genCurve(i);

    var parent = new THREE.Object3D();

    var o = {
        i: i,
        mesh: mesh,
        bones: bones,
        curve: curve,
        parent: parent,
        st: start,
        tt: total,
        sp: props.sp,
        sc: props.sc,
        len: props.len,
    }

    // console.log(o)

    showCurve(curve, parent, 1);

    parent.add(mesh);

    scene.add(parent);

    parent.rotation.y = props.rot || 0;
    parent.rotation.z = Math.PI * 2 * i / props.l;

    if (!lines_visible) return o;
    var lines = [];

    for (let i = 0; i <= segments; i++) {
        let geometry = new THREE.Geometry();
        geometry.vertices.push(v3());
        geometry.vertices.push(v3(3, i, 3));

        let l = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xccccff, opacity: 0.5 }));

        if (lines_visible && i) scene.add(l);

        lines.push(l);

    }

    o.lines = lines;

    return o;
}

var times = 0;

window.addEventListener('keydown', function (e) {
    if (e.ctrlKey) times = 1;
});

function morph(o) {

    var bones = o.bones;
    var curve = o.curve;
    var parent = o.parent;
    var start = o.st;
    var total = o.tt;
    var lines = o.lines;
    var len = o.len;

    var pos0 = start / total;
    if (pos0 > 1) pos0 -= 1;

    var p0 = curve.getPointAt(pos0);
    parent.localToWorld(p0);
    parent.worldToLocal(p0);

    var t0 = curve.getTangentAt(pos0);


    for (var i = 0; i < bones.length; i++) {
        var pos = i / (bones.length - 1); // get range from 0 to 1
        pos = pos * len + start / total; // scale it to start/total
        if (i == 0) {
            // pos = Math.round(pos * 200) / 200;
            pos = 1 - (1 / (bones.length - 1) * len - start / total);
            if (times) {
                times--;
                console.log(pos, t0);
            }
        }
        if (pos > 1) pos = pos - 1;
        var bone = bones[i];
        var point = curve.getPointAt(pos);
        // point.multiplyScalar(1.1)
        var tangent = i == 0 ? t0 : curve.getTangentAt(pos);

        parent.localToWorld(point);

        bone.parent.updateMatrixWorld();
        var pointLocal = bone.parent.worldToLocal(point.clone());

        i == 0 ? bone.position.copy(p0) : bone.position.copy(pointLocal);

        var target = pointLocal.add(tangent);
        var tAxis = tangent.clone();
        var tVec = new THREE.Vector3().subVectors(point, tAxis);
        var nAxis = new THREE.Vector3().subVectors(point, target).normalize();

        nAxis.cross(tAxis).cross(tAxis).normalize();
        var nVec = point.clone().sub(point.clone().normalize());

        var nVecLocal = bone.parent.worldToLocal(nVec.clone());
        var lookV = bone.parent.worldToLocal(v3());

        bone.up.copy(nVecLocal);
        bone.lookAt(lookV);

        if (lines_visible) {
            let l = lines[i]
            let lv = l.geometry.vertices;
            lv[0] = nVec;;
            lv[1] = point.clone().add(point.clone().sub(v3()).normalize());
            l.geometry.verticesNeedUpdate = true;
        }
    }

    start += o.sp;
    if (start >= total) {
        o.st = 0;
    } else {
        o.st = start;
    }

}

function v3(x, y, z) {
    return new THREE.Vector3(x, y, z);
}

function genCurve(k) {
    var arr = [];

    k += 8;
    if (k > 12) k = 12;


    for (let i = 0, total = 120; i < total; i++) {
        var t = i / total;
        var st = Math.abs(Math.cos(4 * Math.PI * t)) * .7;
        var x = Math.cos(t * Math.PI * 2) * radius;
        var y = Math.sin(t * Math.PI * 2) * radius;
        var z = Math.cos(k * t * Math.PI * 2) * radius / 5 * st;
        var target = v3(x, y, z);
        arr.push(target);
    }


    var curve = new THREE.CatmullRomCurve3(arr);

    curve.closed = true;

    arr = [];
    for (let i = 0, l = 120; i < l; i++) {
        let p = curve.getPointAt(i / l);
        p.normalize().multiplyScalar(radius);
        arr.push(p);
    }
    var projection = new THREE.CatmullRomCurve3(arr);
    projection.closed = true;

    return projection;
}

!function () {

    var lights = [];
    lights[0] = new THREE.SpotLight('#bbb', 4, 150);
    lights[0].position.set(50, 50, 50);

    lights[1] = new THREE.SpotLight('#bbb', 4, 150);
    lights[1].position.set(-50, -50, -50);

    lights[2] = new THREE.AmbientLight('#aaa');

    scene.add(lights[0]);
    scene.add(lights[1]);
    scene.add(lights[2]);

    var geometry = new THREE.SphereGeometry(radius, 40, 40);
    var material = new THREE.MeshPhongMaterial({
        color: '#000',
        specular: '#999',
        transparent: true,
        opacity: .7,
        shininess: 3,
    });
    var sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    if (lines_visible) scene.add(new THREE.AxisHelper(25));

} ();

function showCurve(curve, parent, sc) {
    var len = 300;

    var dots = curve.getPoints(len);

    var geometry = new THREE.Geometry();
    geometry.vertices = dots;

    if (sc) geometry.scale(sc, sc, sc)

    var material = new THREE.LineBasicMaterial({ color: '#38f', transparent: true, opacity: .27 });

    var visible_curve = new THREE.Line(geometry, material);

    parent.add(visible_curve);
}

function randi(min, max) {
    return Math.floor(Math.random() * (max + 1 - min)) + min;
}

render();
