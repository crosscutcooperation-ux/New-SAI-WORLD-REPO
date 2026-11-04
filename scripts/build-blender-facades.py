"""Build the residential facade meshes and material library with Blender in background mode."""
import json
import struct
import tempfile
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix

root = Path(__file__).resolve().parents[1]
assets = root / "dist/assets"
raw = (assets / "world-dreams-exterior.glb").read_bytes()
size = struct.unpack_from("<I", raw, 12)[0]
scene = json.loads(raw[20:20 + size])
binary = raw[20 + size:]
names = ["Stone coping", "Central bay", "West bay", "East bay", "Limestone returns"]
first = len(scene["materials"])
scene["materials"].extend({"name": name} for name in names)
towers = [node for node in scene["nodes"] if node.get("extras", {}).get("towerId")]
roots = []
for tower in towers:
    body_group = scene["nodes"][tower["children"][0]]
    index = body_group["children"][0]
    body = scene["nodes"][index]
    body["name"] = tower["extras"]["name"]
    for i, prim in enumerate(scene["meshes"][body["mesh"]]["primitives"]):
        prim["material"] = first + i
    roots.append(index)
scene["scenes"] = [{"nodes": roots}]
scene["scene"] = 0
header = json.dumps(scene).encode()
header += b" " * (-len(header) % 4)
with tempfile.TemporaryDirectory() as work:
    source = Path(work) / "facades.glb"
    source.write_bytes(struct.pack("<4sIIII", b"glTF", 2, 20+len(header)+len(binary), len(header), 0x4e4f534a)+header+binary)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))

for name, strip in zip(names[1:4], ["center", "left", "right"]):
    mat = bpy.data.materials[name]
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    shader = next(node for node in nodes if node.type == "BSDF_PRINCIPLED")
    for suffix, socket in [("", "Base Color"), ("-roughness", "Roughness"), ("-metalness", "Metallic")]:
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(str(assets / f"facade-35-{strip}{suffix}.jpg"))
        if suffix:
            tex.image.colorspace_settings.name = "Non-Color"
        links.new(tex.outputs["Color"], shader.inputs[socket])
    shader.inputs["Coat Weight"].default_value = .24
for name, color in [(names[0], (.79,.72,.60,1)), (names[4],(.56,.45,.33,1))]:
    bpy.data.materials[name].node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = color

objects = [bpy.data.objects.get(scene["nodes"][index]["name"]) for index in roots]
placement = {obj.name: obj.matrix_world.copy() for obj in objects}
for obj in objects:
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=.0002)
    bm.to_mesh(mesh)
    bm.free()
    bevel = obj.modifiers.new("Cut stone arris", "BEVEL")
    bevel.width = .055
    bevel.segments = 3
    bevel.harden_normals = True
    obj.modifiers.new("Architectural face normals", "WEIGHTED_NORMAL")
    obj.matrix_world = Matrix.Identity(4)
bpy.ops.object.select_all(action="DESELECT")
for obj in objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(assets/"residential-facades.glb"), use_selection=True,
                          export_apply=True, export_format="GLB")
for obj in objects:
    obj.matrix_world = placement[obj.name]
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(root/"deliverables/Sai World Dreams facades.blend"),compress=True)
