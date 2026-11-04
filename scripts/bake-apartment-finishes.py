"""Render swatches in headless Blender for the furnished apartment material library."""
from pathlib import Path
import bpy
from mathutils import Vector

out=Path(__file__).resolve().parents[1]/'dist/assets/plans/finishes'
out.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_plane_add(size=2)
plane=bpy.context.object
bpy.ops.object.camera_add(location=(0,0,2))
cam=bpy.context.object;cam.rotation_euler=(0,0,0);cam.data.type='ORTHO';cam.data.ortho_scale=1.998
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.samples=1
scene.view_settings.view_transform='Standard';scene.render.resolution_x=scene.render.resolution_y=512
scene.render.resolution_percentage=100;scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=93
for name,stretch,scale,lo,hi in [
    ('oak',(1.6,29,1),2.8,(.16,.085,.038),(.48,.32,.17)),
    ('limestone',(1.4,1,1),9,(.58,.49,.37),(.84,.77,.65)),
    ('marble',(1.2,2.7,1),2.3,(.37,.36,.32),(.94,.90,.80)),
    ('linen',(1,1.4,1),135,(.68,.63,.52),(.95,.91,.82)),
    ('sage',(1.1,1,1),104,(.26,.27,.20),(.52,.53,.38))]:
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    nodes,links=mat.node_tree.nodes,mat.node_tree.links;nodes.clear()
    tex=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY'
    mapping.inputs[1].default_value=stretch;links.new(tex.outputs['UV'],mapping.inputs[0])
    noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=scale;noise.inputs['Detail'].default_value=5;noise.inputs['Distortion'].default_value=.52
    links.new(mapping.outputs[0],noise.inputs[0])
    ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(*lo,1);ramp.color_ramp.elements[1].color=(*hi,1)
    if name=='marble':
        ramp.color_ramp.elements[0].position=.42;ramp.color_ramp.elements[1].position=.455
        ramp.color_ramp.elements.new(.39).color=(*hi,1)
    links.new(noise.outputs['Fac'],ramp.inputs[0]);emit=nodes.new('ShaderNodeEmission');links.new(ramp.outputs[0],emit.inputs[0])
    output=nodes.new('ShaderNodeOutputMaterial');links.new(emit.outputs[0],output.inputs['Surface'])
    plane.data.materials.clear();plane.data.materials.append(mat)
    scene.render.filepath=str(out/(name+'.jpg'));bpy.ops.render.render(write_still=True)
