"""Create plan-based volume models with the furnished render projected onto visible surfaces.

Run in Blender background mode. Original models remain as construction sources.
"""
from pathlib import Path
import bpy
import json, math
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

root=Path(__file__).resolve().parents[1]
assets=root/'dist/assets/plans/unit-sheets'
jobs=json.loads((root.parent/'source-assets/unit-render-inputs/registered.json').read_text())
fixtures=json.loads((root.parent/'source-assets/unit-render-inputs/traced-fixtures.json').read_text())

def finish(name,color,metal=0,roughness=.4):
    material=bpy.data.materials.new(name);material.use_nodes=True
    shader=material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(*color,1)
    shader.inputs['Metallic'].default_value=metal;shader.inputs['Roughness'].default_value=roughness
    return material

def box(name,x,y,z,w,d,h,material,bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,y,z+h/2))
    obj=bpy.context.object;obj.name=name;obj.dimensions=(w,d,h)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(material)
    modifier=obj.modifiers.new('Rounded manufactured edges','BEVEL');modifier.width=bevel;modifier.segments=3
    obj.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return obj

def oval(name,x,y,z,w,d,h,material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=(x,y,z))
    obj=bpy.context.object;obj.name=name;obj.scale=(w/2,d/2,h/2);obj.data.materials.append(material)
    for face in obj.data.polygons:face.use_smooth=True

for job in jobs:
    key=job['key']
    if '--only' in __import__('sys').argv and key not in __import__('sys').argv[__import__('sys').argv.index('--only')+1:]:continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(assets/(key+'.glb')))
    bed=next(item for item in job['items'] if item[0]=='b')
    scale=2.04/max(bed[3:]);W,H=job['width'],job['height']
    ceramic=finish('Glazed porcelain',(.91,.90,.85),roughness=.22)
    steel=finish('Brushed stainless appliance',(.42,.47,.48),metal=.8,roughness=.25)
    dark=finish('Hob enamel and basin recess',(.035,.042,.046),metal=.3,roughness=.22)
    for kind,x,y,w,h in fixtures.get(key,[]):
        cx=(x+w/2)*scale;cy=-(y+h/2)*scale;w*=scale;h*=scale
        if kind=='hob':
            box('Inset cooktop',cx,cy,.865,w,h,.035,dark,.008)
            for a in (-1,1):
                for b in (-1,1):
                    bpy.ops.mesh.primitive_torus_add(major_segments=20,minor_segments=6,
                        location=(cx+a*w*.23,cy+b*h*.23,.912),major_radius=min(w,h)*.13,minor_radius=.008)
                    bpy.context.object.name='Raised gas burner';bpy.context.object.data.materials.append(steel)
        elif kind=='sink':
            box('Inset stainless sink rim',cx,cy,.869,w,h,.035,steel,.025)
            box('Recessed sink bowl',cx,cy,.89,w*.76,h*.74,.012,dark,.045)
            # The open basin has a narrow reflective inner bottom and rim.
            box('Sink bowl bottom',cx,cy,.898,w*.52,h*.51,.008,steel,.035)
            box('Mixer tap',cx+w*.38,cy,.90,.025,.025,.23,steel,.009)
            box('Tap spout',cx+w*.25,cy,1.11,w*.29,.025,.025,steel,.009)
        elif kind=='toilet':
            oval('Porcelain WC pedestal',cx,cy,.20,w*.69,h*.74,.40,ceramic)
            oval('Porcelain WC bowl',cx,cy,.39,w*.96,h*.93,.22,ceramic)
            oval('WC seat recess',cx,cy,.496,w*.59,h*.61,.012,dark)
            oval('Porcelain seat',cx,cy,.502,w*.45,h*.49,.012,ceramic)
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
    center=Vector((W*scale/2,-H*scale/2,0))
    texture=bpy.data.images.load(str(assets/(key+'-furnished.webp')))
    pad=.075*max(W,H)
    bpy.ops.object.camera_add(location=center+Vector((0,-5,24)))
    cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO';cam.data.ortho_scale=max(W+2*pad,H+2*pad)*scale
    scene=bpy.context.scene;scene.camera=cam
    scene.render.resolution_x=texture.size[0];scene.render.resolution_y=texture.size[1];scene.render.resolution_percentage=100
    bpy.context.view_layer.update()
    mat=bpy.data.materials.new('Furnished render appearance')
    mat.use_nodes=True;nodes=mat.node_tree.nodes;nodes.clear()
    image=nodes.new('ShaderNodeTexImage');image.image=texture;image.extension='EXTEND'
    uvnode=nodes.new('ShaderNodeUVMap');uvnode.uv_map='FurnishedProjection'
    emission=nodes.new('ShaderNodeEmission');emission.inputs['Strength'].default_value=1
    output=nodes.new('ShaderNodeOutputMaterial')
    links=mat.node_tree.links;links.new(uvnode.outputs[0],image.inputs[0]);links.new(image.outputs[0],emission.inputs['Color']);links.new(emission.outputs[0],output.inputs['Surface'])
    for obj in objects:
        mesh=obj.data
        # Apply existing cloth rounding and solidified sides before remapping.
        bpy.context.view_layer.objects.active=obj
        for modifier in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        uv=mesh.uv_layers.get('FurnishedProjection') or mesh.uv_layers.new(name='FurnishedProjection')
        mesh.materials.append(mat);photo_index=len(mesh.materials)-1
        for loop in mesh.loops:
            world=obj.matrix_world@mesh.vertices[loop.vertex_index].co
            p=world_to_camera_view(scene,cam,world)
            uv.data[loop.index].uv=(p.x,p.y)
        normal_matrix=obj.matrix_world.to_3x3().inverted().transposed()
        for face in mesh.polygons:
            world_center=obj.matrix_world@face.center
            direction=(cam.location-world_center).normalized()
            normal=(normal_matrix@face.normal).normalized()
            if normal.dot(direction)>.12:
                face.material_index=photo_index
        mesh.update()
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    scene['source_render']=key+'-furnished.webp'
    scene['model_description']='Plan-based reconstruction with furnished-image appearance; hidden surfaces inferred from plan.'
    bpy.ops.export_scene.gltf(filepath=str(assets/(key+'-image-model.glb')),use_selection=True,export_apply=True,export_format='GLB')
    if key=='p8-02-u03-0112':
        bpy.ops.file.pack_all();bpy.context.preferences.filepaths.save_version=0
        bpy.ops.wm.save_as_mainfile(filepath=str(root/'deliverables/Spring 03 image-matched model.blend'),compress=True)
    print('Completed image model',key,flush=True)
